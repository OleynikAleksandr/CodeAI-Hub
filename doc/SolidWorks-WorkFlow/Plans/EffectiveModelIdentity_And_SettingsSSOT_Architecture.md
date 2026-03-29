# Effective Model Identity And Settings SSOT Architecture

**Status:** Accepted for implementation  
**Date:** 2026-03-29  
**Baseline:** `1.1.834`

---

## 1. Проблема

После релиза `1.1.834` подтверждено асимметричное поведение:

- переключение **base model** для следующего turn работает корректно;
- переключение `reasoning` / `thinking` не имеет такой же архитектурной силы и не проходит по системе как изменение идентичности модели.

Следствие:

- `gpt-5.3-codex + reasoning:xhigh` и `gpt-5.3-codex + reasoning:high` сейчас могут считаться одной и той же моделью с дополнительным параметром, хотя по смыслу это **две разные effective runtime identities**;
- UI и transport могут видеть один `modelId`, а `reasoning/thinking` достраивать отдельно или вообще терять;
- provider runtime, PM и webview получают разные уровни правды о том, что именно будет применено на следующем turn.

Это архитектурная ошибка уровня identity contract, а не локальный баг одного провайдера.

---

## 2. Подтверждённое текущее состояние

На baseline `1.1.834` подтверждены четыре факта:

1. Shared settings snapshot уже существует и лежит в:
   - `~/.codeai-hub/settings/settings.json`

2. Core уже умеет читать из него:
   - base model;
   - `reasoningByModel` для Codex;
   - `thinkingLevelByModel` для Gemini.

3. Внутри текущего transport/runtime contract:
   - `modelId` передаётся отдельно;
   - `reasoningEffort` / `thinkingLevel` передаются как соседние поля;
   - `session:model:update` несёт только `modelId`.

4. Значит текущая система не имеет единого канонического ответа на вопрос:
   - "какая именно effective model identity выбрана для следующего turn?"

---

## 3. Принятое решение для нового scope

### 3.1. `modelId` означает effective model identity

Новый продуктовый смысл:

- `modelId` в runtime/bridge/UI контракте означает **полную effective identity модели**;
- reasoning/thinking являются **частью model identity**, а не отдельным вторичным decoration-полем.

Примеры:

- `gpt-5.3-codex reasoning:xhigh`
- `gpt-5.3-codex reasoning:high`
- `gemini-3-pro-preview thinking:high`
- `sonnet thinking:on`

Эти значения являются разными `modelId`.

### 3.2. `settings.json` — единственный source of truth

Единственным источником правды для next-turn model identity становится:

- `~/.codeai-hub/settings/settings.json`

Из этого следуют инварианты:

- никакой provider runtime не имеет права считаться владельцем текущего выбора модели;
- никакой PM/webview не имеет права "угадывать" runtime identity отдельно от snapshot;
- любое изменение model / reasoning / thinking должно в первую очередь отражаться в `settings.json`;
- следующий outbound turn обязан читать или использовать состояние, канонически выведенное из этого файла.

### 3.3. Изменение model / reasoning / thinking — один и тот же класс операции

Система больше не различает:

- "поменяли base model";
- "оставили ту же base model, но поменяли reasoning";
- "оставили ту же base model, но поменяли thinking".

Во всех трёх случаях происходит одно и то же:

- изменяется effective `modelId`;
- следующий turn должен увидеть новую identity;
- UI/PM должны показать новую identity как реальную runtime цель.

### 3.4. Provider-specific код допускается только как last-mile adapter

Provider-neutral слой обязан владеть:

- вычислением effective `modelId`;
- transport payload;
- session status / model update events;
- UI/PM display contract.

Provider-specific слой допускается только для:

- преобразования provider-neutral effective identity в конкретный SDK/CLI payload;
- применения этой identity внутри адаптера/SDK.

Идентичность модели не должна определяться внутри Codex/Gemini/Claude отдельно.

---

## 4. Термины и инварианты

### 4.1. Термины

- `Base model id` — исходный provider model без reasoning/thinking suffix.
- `Effective model id` — канонический `modelId`, уже включающий reasoning/thinking.
- `Settings SSOT` — `~/.codeai-hub/settings/settings.json` как единственный источник правды для next-turn identity.
- `Last-mile provider apply` — provider-specific перевод effective identity в конкретные runtime flags/options.

### 4.2. Инварианты

- Один и тот же base model с разным reasoning/thinking обязан считаться разным `modelId`.
- `session:model:update` обязан передавать effective identity, а не только base model.
- PM и webview обязаны использовать один и тот же runtime identity contract.
- Ready-session label не может оставаться на старом reasoning/thinking только потому, что base model не изменился.
- Следующий turn никогда не должен выбирать модель из другого источника, кроме `settings.json` и provider-neutral resolver, построенного поверх него.

---

## 5. Архитектурный контур решения

### 5.1. Shared resolver effective identity

Core получает provider-neutral resolver, который из `settings.json` выводит для каждого provider:

- `baseModelId`;
- `effectiveModelId`;
- `reasoningEffort` или `thinkingLevel`;
- display/runtime payload, согласованный между bridge и UI.

Этот resolver становится единственной точкой вычисления next-turn identity.

### 5.2. Applied turn config и bridge events

Transport contract должен перестать передавать "голый model id" как будто reasoning/thinking не влияет на identity.

Новый контракт:

- applied turn config несёт effective `modelId`;
- optional `baseModelId` допустим только как вспомогательное поле;
- `session:model:update` обязан передавать effective `modelId`, а не реконструировать его на UI стороне.

### 5.3. UI / PM sync

UI и PM не должны восстанавливать reasoning/thinking постфактум по локальным догадкам.

Они должны:

- принимать runtime effective `modelId` как канон;
- использовать `settings.json` только как SSOT для расчёта будущего next-turn identity до момента runtime update;
- не иметь split-brain между "settings label" и "runtime label".

### 5.4. Session-level future controls

Если позже в Session UI появится возможность менять model / reasoning / thinking прямо из сессии, то этот путь обязан работать так:

1. UI перезаписывает `~/.codeai-hub/settings/settings.json`.
2. Core использует обновлённый settings snapshot как новый SSOT.
3. Следующий turn применяет новую effective identity.

Никакого отдельного session-only hidden state для выбора модели быть не должно.

---

## 6. Границы MVP

В этот scope входят:

- новый identity contract;
- provider-neutral resolver effective model identity;
- transport/UI/PM sync для effective `modelId`;
- Codex fix как обязательный первый runtime adopter;
- parity по contract semantics для Claude/Gemini.

В этот scope не входят:

- mid-turn hot-swap уже запущенного provider turn;
- отдельный новый session-side model switch UI;
- redesign settings UX beyond what is necessary for identity correctness.

MVP-правило:

- любое изменение model / reasoning / thinking должно вступать в силу на **следующем turn**;
- уже идущий turn не должен ретроактивно менять свою effective identity.

---

## 7. Файловые и модульные seams

Ожидаемые ключевые зоны изменений:

- Core config / identity resolution:
  - `packages/core/src/config/provider-turn-config-resolver.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`
  - `packages/core/src/remote-bridge/types.ts`
  - `packages/core/src/remote-bridge/session-stream-contracts.ts`

- Core bridge / runtime sync:
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`
  - `packages/core/src/provider-registry/provider-descriptor-factory.ts`

- Codex runtime adoption:
  - `packages/Codex_Module/src/messaging/codex-applied-turn-config.ts`
  - `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`

- UI / PM:
  - `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`
  - `src/client/ui/src/app-host/use-settings-models-sync.ts`
  - `src/client/ui/src/core-bridge/server-message-handler.ts`
  - `src/client/ui/src/session/model-info-builder.ts`

---

## 8. Acceptance criteria

Scope считается закрытым, когда выполнены все пункты:

1. `gpt-5.3-codex reasoning:xhigh` и `gpt-5.3-codex reasoning:high` проходят по системе как разные `modelId`.
2. Изменение только reasoning/thinking без смены base model меняет effective `modelId` и применяется на следующем turn.
3. `session:model:update` больше не теряет reasoning/thinking.
4. PM и обычный webview одинаково отображают effective runtime identity.
5. Ни один provider/runtime/UI path не использует второй независимый source of truth кроме `~/.codeai-hub/settings/settings.json`.
6. Session-level future switch path может быть построен как "перезаписать `settings.json` -> следующий turn применяет новую effective identity" без дополнительного hidden state.

---

## 9. Execution framing

На уровне `doc/TODO/todo-plan.md` этот scope режется на пять связанных блоков:

1. `Phase 86` — Contract reset for effective model identity.
2. `Phase 87` — Provider-neutral effective identity resolver in Core.
3. `Phase 88` — Codex runtime adoption and bridge payload correction.
4. `Phase 89` — UI/PM sync and regression coverage.
5. `Phase 90` — final release build after closure.

Первый implementation gate:

- синхронизировать SSOT и transport contract так, чтобы `modelId` больше не означал "только base model";
- только после этого править provider runtime и UI sync.
