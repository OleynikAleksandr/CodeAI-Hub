# Kimi Reasoning On/Off Toggle — Planning (RU)

**Status:** Completed in releases `1.2.543`-`1.2.545`; closeout moves this planning source to `Plans/Archive/`.
**Owner:** orchestrator
**Created:** 2026-06-17
**Branch:** main
**Base head:** 268b96a86

## 1. Постановка задачи

В Settings-карточке провайдера Kimi сейчас есть только один reasoning-рычаг:
`thinkingDisplaySyncEnabled` («Reasoning in dialog») — он управляет **только
видимостью** think-сообщений в интерфейсе сессии и не доходит до Kimi CLI.

Нужно добавить второй, независимый рычаг — **on/off самого Reasoning**
(binary), который реально управляет поведением Kimi K2.7 Code.

Пользовательские вводные (intake-сессия 2026-06-17):
- Поведение при смене галочки: **принудительный restart активной сессии**
  (текущий turn прерывается, Wire-процесс пересоздаётся с новым флагом).
- Дефолтное значение: **ON** для CodeAI managed workflow. Это намеренный
  CodeAI default, а не сохранение user-global `default_thinking = false` из
  `~/.kimi/config.toml`; пользователь может выключить reasoning в Settings.

## 2. Research findings (официальные материалы)

Источники: Kimi CLI v1.47.0 (локально установлен), Wire protocol v1.10,
официальная документация https://moonshotai.github.io/kimi-cli/.

### 2.1. Уровней Reasoning (effort) нет
Только бинарный on/off. Подтверждено во всех слоях:
- CLI: только `--thinking` / `--no-thinking`.
- `~/.kimi/config.toml`: `default_thinking = true/false` (boolean).
- Model capabilities: `thinking` (toggle) или `always_thinking` (forced).
- Wire `prompt` method: параметра thinking/reasoning вообще нет.

### 2.2. Wire `prompt` НЕ принимает thinking
```typescript
interface PromptParams { user_input: string | ContentPart[] }
```
(`packages/Kimi_Module/src/session/kimi-session-lifecycle.ts:82`). Значит,
on/off нельзя переключить внутри активного turn — только через
(пере)запуск Wire-процесса с CLI-флагом.

### 2.3. Управление thinking — только при старте процесса
- CLI флаг `--thinking` / `--no-thinking` (override `default_thinking`).
- `--config '{"default_thinking": ...}'` (override без правки файла).
- Приоритет: env vars > CLI flags > config file.

### 2.4. ThinkPart в Wire OUTPUT
`ContentPart{type:"think"}` имеет поля `think` (текст) и `encrypted`
(encrypted thinking/signature). Это про OUTPUT, не про control.

## 3. Текущее состояние реализации CodeAI Hub

### 3.1. Capability registry корректен
`packages/Kimi_Module/src/types/kimi-model-capabilities.ts:14-15`:
`supportsReasoningControl: false` — верно, effort-уровней нет. Оставляем.

### 3.2. CLI args не содержат thinking-флага
`packages/Kimi_Module/src/provider/kimi-managed-agent-profile.ts:294-307`
(`buildKimiCliEnvironment`): args = `--config-file --agent-file
--mcp-config-file --skills-dir --yolo --work-dir`. Kimi использует
`default_thinking` из пользовательского `~/.kimi/config.toml`.

### 3.3. Settings не доходят до adapter
`packages/core/src/provider-registry/provider-descriptor-factory.ts:214-226`
(`createKimiAdapterInstance`): в `KimiWorkspaceOptions` передаются только
`workspacePath` и `defaultModel`. `providers.kimi.*` из settings НЕ
попадают в adapter options. Нужен bridge.

### 3.4. Force-restart механизма НЕТ
В кодовой базе отсутствует механизм teardown-and-rebuild провайдер-adapter'а
при смене settings mid-session:
- `SettingsRequestHandler` не имеет доступа к `ProviderRegistry` /
  `SessionManager` (`remote-bridge-bootstrap.ts:112-118`).
- `requiresPostStopResume` (Gemini) — про continuity через `--resume`, не про
  смену CLI args.
- `KimiWorkspaceOverrideState` явно замораживает options после Wire startup
  (`kimi-workspace-override-state.ts:67-69`).
- `KimiWireProcessBridge.args` — `readonly`, нельзя поменять после spawn.

GLM Native `thinkingEnabled` — НЕ reference: он stateless HTTP, применяет
per-turn через `turnOptions`. Kimi — subprocess, per-turn невозможно.

## 4. Архитектурное решение (Ponytail-минимум)

Принцип: переиспользовать существующие primitives, не строить новый generic
force-restart mechanism. Минимальный diff, который решает задачу.

### 4.1. CLI args injection (1 файл)
`buildKimiCliEnvironment` принимает `thinkingEnabled?: boolean`. Если `true`
→ пушит `--thinking`; если `false` → `--no-thinking`; если `undefined` →
не добавляет CLI override. CodeAI settings defaults pass explicit `true`, so
managed workflow sessions default to reasoning ON.

### 4.2. Settings schema (providers.kimi.thinkingEnabled, default true)
Параллельно `thinkingDisplaySyncEnabled`. Слои (mirror Claude effort
whitelist parity pattern):
- Core: `settings-default-snapshot.ts`, `workspace-runtime-capsule.ts`,
  `provider-settings-snapshot.ts`, `provider-turn-config-resolver.ts`.
- UI: `settings-state-raw.ts`, `kimi-settings-state.ts`,
  `kimi-default-model-card.tsx`, `kimi-settings-tab.tsx`,
  `settings-provider-tab-content.tsx`, `use-settings-state.ts`.

### 4.3. Settings → adapter bridge
- `KimiWorkspaceOptions` получает поле `thinkingEnabled?: boolean`.
- `KimiProviderAdapter` хранит mutable `currentThinkingEnabled` (init из
  options), используется в `configureWireRuntime`.
- `createKimiAdapterInstance` читает `thinkingEnabled` из settings snapshot
  (через `loadKimiSettingsSnapshot`) при construction.

### 4.4. Force-restart mechanism
- `KimiProviderAdapter.reconfigureThinking(enabled: boolean)`:
  - async/idempotent: no-op если `enabled === currentThinkingEnabled`.
  - иначе: await `wireProcessBridge.stop()`, обновление
    `currentThinkingEnabled`, rerun `configureWireRuntime`.
  - Adapter remains initialized after reconfigure, so the next
    `createSession`/`resumeSession` works through the normal stop-rebind path
    with the new `--thinking`/`--no-thinking`.
- Core wiring: `SettingsRequestHandler` получает ссылку на
  `ProviderRegistry` + `SessionManager` (через `remote-bridge-bootstrap`).
  При save/reset или launch-card settings write с Kimi `thinkingEnabled`
  delta → найти active `kimiCode` session → await
  `adapter.reconfigureThinking(newEnabled)`; binding invalidation happens only
  when the adapter reports a real restart. Следующий send rebind-нет с новым
  флагом.
- Текущий turn прерывается (это и есть «принудительный restart активной
  сессии» — user-выбранное поведение).

### 4.5. Взаимодействие с visibility toggle
`thinkingDisplaySyncEnabled` (visibility) и `thinkingEnabled` (on/off)
независимы. Если reasoning off → think-сообщения физически не придут от
провайдера, visibility toggle становится no-op (UI может это показать, но
не блокируем — Ponytail).

## 5. Phases breakdown (для todo-plan)

- **Phase 0 — Documentation Intake:** актуализация `Modules/Kimi.md`
  (зафиксировать бинарный рычаг, убрать misleading «no reasoning dimension»);
  adoption этого planning-документа.
- **Phase 1 — Settings schema + UI:** `providers.kimi.thinkingEnabled` во всех
  слоях + галочка в Settings-карточке Kimi. Не подключена к adapter.
- **Phase 2 — CLI args injection + adapter options:** `buildKimiCliEnvironment`
  + `KimiWorkspaceOptions.thinkingEnabled` + bridge в
  `createKimiAdapterInstance`. thinkingEnabled применяется при старте Wire.
- **Phase 3 — Force-restart mechanism:** `reconfigureThinking` на adapter +
  Core wiring (`SettingsRequestHandler` → registry/session-manager) +
  invalidate binding на delta.
- **Phase 4 — SystemArchitecture + docs sync:** обновить Invariant в
  `System/SystemArchitecture.md`, `Modules/Kimi.md` финальная синхронизация.
- **Phase 5 — Tooling Verification + Release Build:** target builds, gates,
  release notes, `build-all.sh` + `build-release.sh` (после явного
  confirmation gate).
- **Phase 6+ — Audit fix / release retests:** закрыты в `todo-plan.md`
  дополнительными фазами до релиза `1.2.545`.
- **Scope Closeout:** user acceptance получен; archive todo-plan + planning-doc
  disposition выполняются этим closeout.

## 6. Risks

1. **Force-restart прерывает активный turn** — это user-выбранное поведение,
   но UI должен ясно сигнализировать (fallback на стандартный session-error
   / rebind flow).
2. **Settings parity** — пропустить слой → silent regression (аналогично
   Claude xhigh bug 1.1.998). Все слои из §4.2 обязательны.
3. **`SettingsRequestHandler` wiring** — расширение constructor signature,
   проверить что не ломает существующих тестов.
4. **Kimi session continuity при restart** — provider session id теряется
   при Wire process kill. Решение: invalidate binding → следующий send
   стартует свежую Wire-сессию (без resume). Для managed workflow это
   приемлемо (Kimi не участвует в Stop/Continue continuity contract как
   Gemini).

## 7. Ponytail обоснование

- YAGNI: нет generic force-restart mechanism — только Kimi-специфичный
  `reconfigureThinking`.
- Reuse: `invalidateProviderBinding` + `configureWireRuntime` (существующие
  primitives).
- Минимальный diff: CLI args injection = ~5 строк; settings parity =
  mirror существующего `thinkingDisplaySyncEnabled`.
- Никаких новых абстракций/фабрик/интерфейсов.
