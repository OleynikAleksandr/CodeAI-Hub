# Settings SSOT And Next-Turn Model Switch Architecture

**Status:** Draft
**Created:** 2026-03-28
**Owner:** Oleksandr

---

## 1. Context

После bugfix-волны до `1.1.829` стало видно, что проблема live model switching глубже, чем UI label refresh.

Подтверждённые факты:

- Project Manager уже умеет перечитывать `settings` и обновлять нижний label модели/`reasoning` без рестарта.
- При этом реальный runtime provider может продолжать работать на старой модели.
- На Codex это подтверждено provider-native JSONL: после смены модели в Settings новый turn продолжал идти на предыдущем `modelId`.
- Причина архитектурная: `model` / `reasoning` сейчас читаются и вычисляются в нескольких местах независимо друг от друга.

Текущий split-brain выглядит так:

- PM читает `settings` snapshot и сам строит label.
- Core частично шлёт runtime `session:model:update` events.
- Provider modules частично читают settings сами.
- Codex SDK manager дополнительно кеширует собственные `workspaceDefaults` и не гарантирует refresh перед каждым новым turn.

Пользовательский requirement для этого scope жёсткий:

- `Settings` являются единственной точкой правды для `model` и `reasoning`.
- Если пользователь поменял эти значения, для следующего нового turn это не "желание", а обязательная конфигурация.
- Все остальные слои должны получать эту конфигурацию из одного канала, а не вычислять её локально каждый по-своему.

Отдельно остаётся незавершённый хвост предыдущего cleanup scope: последние seams декомпозиции `session-request-handler.ts` не потеряли актуальность, но должны жить отдельной фазой после закрытия model-switch scope.

---

## 2. Main Goal

Главная цель нового плана двойная и выполняется в таком порядке:

1. Перестроить pipeline `settings -> Core -> provider runtime -> PM label` так, чтобы:
   - `settings` были единственной source of truth для следующего turn;
   - Core вычислял и распространял applied config централизованно;
   - provider runtime реально применял новую модель/`reasoning` на очередном новом turn;
   - PM показывал не собственную догадку, а подтверждённую applied runtime config.
2. После этого честно добить оставшийся хвост `session-request-handler.ts` decomposition отдельной carry-over phase.

Практически это означает:

- уже идущий turn не переобувается посреди стрима;
- каждый новый outbound user turn обязан стартовать с актуальной конфигурацией из `settings`;
- provider-local самостоятельное чтение `settings.json` как источника текущей turn-конфигурации должно уйти;
- Codex/Gemini/Claude должны прийти к одному контракту применения model/reasoning на новом turn.

---

## 3. Confirmed Current Problems

### 3.1. UI и runtime используют разные источники

Сейчас PM может показать уже новую модель из `settings`, а provider runtime продолжает работать на старой модели.

Следствие:

- пользователь видит один `modelId` в интерфейсе;
- provider-native trace и фактическое поведение показывают другой `modelId`.

### 3.2. Core не является единственным владельцем applied config

Core уже умеет читать provider settings и частично транслировать runtime updates, но не владеет end-to-end контрактом применения `model/reasoning` к каждому новому turn.

Следствие:

- часть решений принимается в Core;
- часть в UI;
- часть внутри provider module.

### 3.3. Codex закрепляет model/reasoning слишком рано

Codex path особенно показателен:

- `CodexSDKManager` вычисляет `workspaceDefaults`;
- `Thread` создаётся с `model` и `modelReasoningEffort`;
- последующие turn-ы идут через тот же runtime path.

Следствие:

- новый label сам по себе не меняет реальный Codex runtime;
- смена модели в `settings` не гарантирует смену модели для следующего turn.

### 3.4. План Phase 79 остался с нечестным tail status

Оставшиеся пункты по `session-request-handler.ts` valid, но текущий `IN_PROGRESS` не подтверждается кодом.

Следствие:

- operational plan врёт о реально активной работе;
- carry-over tail нужно выделить в отдельную фазу и выполнять после закрытия model-switch work.

---

## 4. Architecture Decisions

### 4.1. Settings are the single source of truth for the next turn

Для `model` и `reasoning` единственная canonical truth = persisted Settings snapshot.

Правило:

- пользователь меняет `settings`;
- следующий новый turn обязан использовать эти значения;
- никакой слой не вправе держать собственную независимую truth-модель текущей turn-конфигурации.

### 4.2. Core owns effective turn config resolution

Core перед каждым новым outbound turn обязан:

1. перечитать актуальный settings snapshot;
2. вычислить provider-specific applied config;
3. передать эту applied config в provider facade/adapter;
4. распространить подтверждённое runtime значение в UI.

Важно:

- уже идущий turn не меняется mid-stream;
- source of truth для следующего turn остаётся единой.

### 4.3. Providers stop deciding current turn model from local settings reads

Provider modules не должны самостоятельно читать `settings.json`, чтобы решить, на какой модели выполнять текущий turn.

Допустимо:

- получать explicit config из Core;
- кешировать последний применённый config как derived state;
- использовать provider-local internals только для технического применения уже полученного config.

Недопустимо:

- чтобы PM, Core и provider independently resolved `model/reasoning` из разных источников и в разное время.

### 4.4. PM displays applied config, not its own guess

Project Manager должен показывать:

- либо последний applied config, подтверждённый Core/runtime;
- либо pending local preview только как временное UX-состояние, если это явно маркировано.

Но source of truth для session label не должна собираться PM локально независимо от runtime.

### 4.5. Codex may require per-turn thread refresh

Так как Codex SDK привязывает `model` и `modelReasoningEffort` к thread runtime options, для применения новой модели на очередном turn может понадобиться:

- refresh/recreate thread runtime object перед новым send;
- при этом continuity текущей session и provider thread id должны сохраняться, если SDK path это допускает.

Это отдельный provider-specific implementation detail, но он не отменяет общего контракта: applied config приходит из Core.

### 4.6. Carry-over decomposition phase remains valid

Оставшийся tail `session-request-handler.ts` decomposition не отменяется.

Решение:

- перенести его в отдельную фазу нового `todo-plan.md` после model-switch phase;
- снять ложный `IN_PROGRESS`;
- продолжать decomposition после закрытия проблем со сменой модели, не смешивая оба scope в один stream.

---

## 5. Work Packages

### 5.1. Core Settings SSOT Contract

Цель пакета:

- сделать Core единственным owner-ом applied turn config;
- свести `settings -> applied config` к одному resolver path;
- убрать расхождение между settings snapshot, runtime send path и UI updates.

### 5.2. Codex Runtime Application Path

Цель пакета:

- гарантировать, что очередной новый Codex turn реально стартует на актуальной модели/`reasoning` из Settings;
- прекратить ситуацию, когда label уже новый, а provider-native runtime остаётся старым.

### 5.3. PM Applied Config Synchronization

Цель пакета:

- перевести session label на Core-confirmed applied config;
- сохранить live UX без повторного split-brain между UI и runtime.

### 5.4. Multi-Provider Parity Sweep

Цель пакета:

- привести Gemini и Claude к тому же контракту, что и Codex:
  - Settings как SSOT для следующего turn;
  - Core-owned effective config;
  - provider без собственного truth-layer поверх `settings.json`.

### 5.5. Carry-Over SessionRequestHandler Tail

Цель пакета:

- после закрытия model-switch scope добить оставшиеся seams giant-file decomposition:
  - continuity-root resolution;
  - post-turn turn arbitration;
  - final thin façade pass.

Этот пакет остаётся behavior-preserving refactor only.

---

## 6. Success Criteria

План считается выполненным, когда одновременно выполняются все условия:

- следующий новый turn у Codex реально идёт на новой модели/`reasoning` после изменения Settings;
- provider-native trace подтверждает applied model change, а не только UI label change;
- PM session panel показывает ту же applied config, что реально ушла в runtime;
- Core становится единственным владельцем расчёта applied turn config;
- provider modules больше не принимают решение о текущем turn model/reasoning через самостоятельное чтение `settings.json`;
- оставшийся хвост `session-request-handler.ts` decomposition закрыт отдельной фазой после model-switch scope и без ложных `IN_PROGRESS` статусов в operational plan.
