# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_StatusPanel_ModelSwitch_Architecture.md`
- **Read this context before implementation:**

  ### A. Planning + session continuity
  - `doc/SolidWorks-WorkFlow/Plans/Codex_StatusPanel_ModelSwitch_Architecture.md` — approved planning-doc этого цикла.
  - `doc/Sessions/Session034.md` — этот session report (scope opening, дискуссия с пользователем, Codex CLI findings).
  - `doc/Sessions/Session033.md` — последний closed cycle (sidebar tint final hardening 1.2.110), для понимания state на момент старта этого scope.
  - `doc/tmp/planning/DocumentationTree_ProfileBoundary_ModelProviderSwitch_Planning.md` — research-artifact про profile-boundary архитектуру; **переосмыслен** в свете Codex CLI findings, **не является execution input'ом** для этого цикла, но содержит исторический контекст обсуждения.

  ### B. Базовый SSOT (читать всегда первым по правилу CLAUDE.md)
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — global invariants, особенно §3 Invariant 14 (effective model identity SSOT), Invariant 23 (thinking/reasoning emission-time visibility), Invariant 27 (thinking/reasoning effort whitelists в lockstep), Invariant 35 (model invocation profile boundary), Invariant 36 (sidebar provider tint contract).
  - `doc/SolidWorks-WorkFlow/Docs_Index.md` — каталог-навигация (нужен только если потребуется выйти за пределы этого Context Pack).

  ### C. Codex provider SSOT
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md` — Codex provider module SSOT.
  - `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md` — actual Codex App Server startup flags + `turn/start` payload + reasoning resolution.
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md` — response modes (`Strict` / `Hybrid` / `Debug/Raw`) + raw provider diagnostics для Codex.
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md` — canonical effective model identity, next-turn settings SSOT, model invocation profile compatibility boundary. Критично: §SMB-001 / SMB-002 (session-scoped + persistent model binding).

  ### D. Session UI SSOT
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md` — inventory of the five Session UI panels.
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md` — info-card / status row contract (target поверхность для wiring'а двух кнопок).
  - `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html` — provider color tokens + neutral text + light font-weight (используется во всех новых UI элементах).

  ### E. Codex App Server module — implementation anchors
  - `src/types/codex-model-registry.ts` — модельная registry (Stream B расширяет per-model capability flags).
  - `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts` — owns `thread/start` / `turn/start` / `turn/interrupt` JSON-RPC dispatch (Stream C gating + Stream E injection).
  - `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-params.ts` — текущая логика построения `reasoning.summary` field (Stream C — добавить capability gate перед добавлением поля).
  - `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts` — turn event routing (для понимания, как payload дотекает до wire).
  - `packages/Codex_AppServer_Module/src/app-server/process/codex-provider-home-config.ts` — provider-home `model_reasoning_summary` config materialization (Spark special case lives here).
  - `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts` — adapter boundary (sendMessage / closeSession / refreshUsageLimits).
  - `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts` — existing native capture infrastructure (Stream G integration test reuses этот path).

  ### F. Core remote bridge — switch path anchors
  - `packages/core/src/remote-bridge/session-stream-contracts.ts` — реестр session commands (Stream D добавляет `session:codex:model-switch`).
  - `packages/core/src/remote-bridge/remote-bridge-message-router.ts` — websocket command router (Stream D regista's new command).
  - `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts` — содержит существующий `applySwitchModelBinding` (Stream D расширяет or replaces за codex-specific handler).
  - `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts` — Core-owned next-turn applied effective model identity (broadcast contract для `session:model:update`; Stream D обязан honor this).
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` — outbound user-message dispatch (Stream E embed `<model_switch>` developer message в этой path).
  - `packages/core/src/remote-bridge/handlers/session-request-handler-provider-send.ts` — adapter-send logging / dispatch (для понимания, где payload передаётся провайдеру).
  - `packages/core/src/session-model-binding/session-model-binding-facade.ts` — owns frozen identity / continuity-inherited binding (Stream D mutates через эту facade, не напрямую `Session.modelBinding`).
  - `packages/core/src/session-manager/index.ts` — `setModelBinding` / `registerSession` operations.

  ### G. Client-side anchors
  - `src/client/project-manager/api.ts` — client-side API layer (Stream F adds new method).
  - `src/client/ui/src/session/status-panel.tsx` — render двух кнопок (Stream F wiring).
  - `src/client/ui/src/session/status-panel-model-picker.tsx` — **новый файл**, создаётся в Stream F1 (предыдущие `model-switcher/session-model-picker-card.tsx` + `session-model-switcher-facade.ts` физически отсутствуют после rollback). До его создания читать только при Stream F1 implementation.
  - `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts` — dialog session controller (Stream F switch dispatch from UI to Core).
  - `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx` — runtime session view (Stream F symmetric wiring).
  - `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx` — dialog session view (Stream F symmetric wiring).
  - `src/client/project-manager/services/workflow-provider-resolver.ts` — existing provider-preselect logic (для понимания, как live session определяет current provider; relevant для UI guard "Codex sessions only").

  ### H. Settings + native capture (Stream G test path)
  - `packages/core/src/remote-bridge/handlers/settings-request-handler.ts` — owns `settings:native-request-capture` command (для understanding existing diagnostic capture flow).

- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase. В каждой Phase — Stream'ы, в каждом Stream'е — подзадачи.
- Каждая подзадача затрагивает ≤3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация, (2) `Git Commit: ...`.
- Если задача затрагивает >3 файлов — split на более мелкие.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`, `npm run build:project-manager`.
- **Real-time документация:** любое изменение архитектуры/логики → синхронное обновление SSOT и `todo-plan.md` ДО коммита.
- Phase 2 завершается на чистом дереве через `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.
- **Phase 3 — user verification — обязательная.** Без явного «ОК / закрываем» от пользователя scope не архивируется.
- `todo-plan.md` обновляется в риалтайме после каждого коммита (статус + hash).

## Phase 1 — Codex status panel model switch (owner: UI / Codex provider, updated: 2026-04-30)

### Stream A — Scope opening

1. [DONE] Создать `doc/SolidWorks-WorkFlow/Plans/Codex_StatusPanel_ModelSwitch_Architecture.md` + этот todo-plan. Scope: 2 файла; commit message: `docs: open codex status panel model switch scope`.
2. [DONE] Git Commit: `docs: open codex status panel model switch scope` (hash: c9931048b)

### Stream B — Codex capability registry expansion

1. [TODO] Расширить `src/types/codex-model-registry.ts` per-model флагами: `supportsReasoningSummary`, `supportsVerbosity`, `reasoningEffortOptions`, `contextWindow`, `autoCompactTokenLimit`. Spark получает `supportsReasoningSummary: false`. Экспортировать helper `getCodexModelCapabilities(modelId)` (или подобный) для consumer'ов. Добавить / расширить unit-тест registry: assert per-model flags; assert helper returns expected capabilities for known slugs (incl. Spark). Scope: 2 файла (registry + test); commit message: `feat(codex): add per-model capability registry`.
2. [TODO] Git Commit: `feat(codex): add per-model capability registry` (hash: TBD)

### Stream C — Replace slug-based hardcode in payload helper

1. [TODO] В `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-params.ts` заменить `CODEX_MODELS_WITHOUT_REASONING_SUMMARY` Set lookup на `getCodexModelCapabilities(modelId).supportsReasoningSummary === false`. Сохранить existing public signature `buildCodexReasoningSummaryParams(modelId, summary)`. Расширить existing unit-test'ы (или создать если не было) — assert: вызов с Spark slug возвращает empty object; вызов с non-Spark — `{ summary }`; вызов с unknown slug — defaults retain (см. open question 11.2 если потребуется). Scope: ≤2 файла (helper + test). Никаких новых call sites — `codex-app-server-facade.ts:225` уже вызывает helper; behavior unchanged for non-Spark. Commit message: `refactor(codex): replace slug-based hardcode with capability registry`.
2. [TODO] Git Commit: `refactor(codex): replace slug-based hardcode with capability registry` (hash: TBD)

### Stream D — Switch transport + Core handler (3 микро-задачи)

#### D1 — Server-side transport registration

1. [TODO] `packages/core/src/remote-bridge/session-stream-contracts.ts` (payload type + outbound update type), `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts` (register `session:codex:model-switch` validator alongside existing `dialog:switch:*` / `session:*` entries на line 217-231), `packages/core/src/remote-bridge/remote-bridge-message-router.ts` (routing dispatch). Scope: 3 файла; commit message: `feat(core): register codex model switch transport`.
2. [TODO] Git Commit: `feat(core): register codex model switch transport` (hash: TBD)

#### D2 — Core handler + Session field + clearPending method

1. [TODO] New file `packages/core/src/remote-bridge/handlers/session-request-handler-codex-model-switch.ts` (отдельный handler, **не** reuse `handleSwitchRequest` который resends user message). Handler: validate target via `getCodexModelCapabilities` → call `sessionManager.setModelBinding(sessionId, newBinding)` с **полным** binding `(modelId, reasoning)` → set `Session.pendingModelSwitchInjection = true` → broadcast `session:model:update` через existing applied-turn-config contract. **STOP — никакого `adapter.sendMessage`.** Add `pendingModelSwitchInjection?: boolean` field в `src/types/session.ts` (line 130 area) и `packages/core/src/session-manager/index.ts:26-32` Session interface (оба слоя in sync в одном коммите) + новый method `SessionManager.clearPendingModelSwitchInjection(sessionId)`. Scope: 3 файла; commit message: `feat(core): add codex model switch handler with session pending injection field`.
2. [TODO] Git Commit: `feat(core): add codex model switch handler with session pending injection field` (hash: TBD)
3. [TODO] Unit-тест handler: validates target, mutates binding via setModelBinding (full pair), flips pendingModelSwitchInjection, broadcasts session:model:update в том же tick, **adapter.sendMessage не вызван**. Scope: 1 файл; commit message: `test(core): cover codex model switch handler state mutation`.
4. [TODO] Git Commit: `test(core): cover codex model switch handler state mutation` (hash: TBD)

#### D3 — Client-side transport

1. [TODO] `src/client/project-manager/core-stream-message-types.ts` (outbound type def matching server contract — payload carries `sessionId`, `targetModelId`, `targetReasoning`), `src/client/project-manager/api.ts` (`requestCodexModelSwitch(sessionId, targetModelId, targetReasoning)` method). Scope: 2 файла; commit message: `feat(pm): add codex model switch client api`.
2. [TODO] Git Commit: `feat(pm): add codex model switch client api` (hash: TBD)

#### D4 — Applied turn config расширение (предотвращение регрессии 1.2.114)

1. [TODO] В `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`:
   - Add `targetReasoningEffort?: CodexReasoningLevel` (или общий `ReasoningEffort` type) к параметрам `resolveForProvider` / `resolveEffectiveModelId` / outbound dispatch.
   - Когда live `Session.modelBinding.reasoning` существует — оно **первичный источник** для applied config.
   - Resolver строит `modelBinding` из пары `(targetModelId, targetReasoning)` атомарно, **не из Settings**.
   - Расширить `source` literal на `"session_binding"` (line 115 area) для post-switch outbound turns.
   Закрывает регрессионную поверхность: после switch'а live binding **никогда** не теряется в пользу Settings.
   Scope: 1 файл + расширение существующего unit-теста (всего ≤2 файла); commit message: `fix(core): pin reasoning effort to session binding in applied turn config`.
2. [TODO] Git Commit: `fix(core): pin reasoning effort to session binding in applied turn config` (hash: TBD)

### Stream E — `<model_switch>` developer message injection (bridge через turnOptions)

**Архитектурное ограничение:** `CodexAppServerFacade.executeTurn(content, turnOptions?)` — facade не имеет прямого доступа к `SessionManager`. Existing pattern: Core кладёт state в `turnOptions`, facade читает (тот же mechanism, что для applied config через `CODEX_APPLIED_TURN_CONFIG_KEY`).

1. [TODO] В Codex App Server module (`packages/Codex_AppServer_Module/src/types/index.ts` или new small file): экспортировать константу-ключ `CODEX_MODEL_SWITCH_INJECTION_KEY` + type для injection payload. В `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts:206-228` (`executeTurn`): читать `turnOptions[CODEX_MODEL_SWITCH_INJECTION_KEY]` (по образцу existing reading `CODEX_APPLIED_TURN_CONFIG_KEY`); если present — embed developer-style item в начало `turn/start.input` array (точная форма — open question 11.3). Snapshot-test первого turn after switch (assert входной item содержит `<model_switch>` маркер). Scope: ≤3 файла; commit message: `feat(codex): consume model switch injection from turn options`.
2. [TODO] Git Commit: `feat(codex): consume model switch injection from turn options` (hash: TBD)
3. [TODO] В Core dispatch path (`packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` или `session-request-handler-provider-send.ts`): перед `adapter.sendMessage` — если `Session.pendingModelSwitchInjection === true`, build injection object (с `baseInstructions` для new model), кладём в `turnOptions[CODEX_MODEL_SWITCH_INJECTION_KEY]`. **После успешного `dispatch`** — call `sessionManager.clearPendingModelSwitchInjection(sessionId)`. Reset делает Core, не facade — потому что facade не знает финального outcome dispatch'а (HTTP error / abort). Unit-тест: bridge entry попадает в turnOptions при флаге=true; flag clear только после resolved promise. Scope: ≤3 файла (dispatch + test + maybe types); commit message: `feat(core): bridge pending model switch injection through turn options`.
4. [TODO] Git Commit: `feat(core): bridge pending model switch injection through turn options` (hash: TBD)

### Stream F — Status panel UI (3 микро-задачи)

#### F1 — Status panel + picker component

1. [TODO] `src/client/ui/src/session/status-panel.tsx` (line 87-104 area — добавить `onClick` к двум визуальным кнопкам, состояние `openPicker: "model" | "reasoning" | null`, рендеринг picker popup'а), new file `src/client/ui/src/session/status-panel-model-picker.tsx` (picker UI компонент — в этом цикле показывает только Codex models; non-Codex sessions — chips остаются visually, click no-op), new file `src/client/ui/src/session/status-panel-model-picker.test.tsx` (component test: click → picker open → option click → callback fires). Scope: 3 файла; commit message: `feat(ui): add status panel model picker component`.
2. [TODO] Git Commit: `feat(ui): add status panel model picker component` (hash: TBD)

#### F2 — Callback bridge + symmetric PM views

1. [TODO] `src/client/ui/src/session/session-view.tsx` (пробросить onSelectModel / onSelectReasoning из props в StatusPanel), `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx` (wiring callbacks через PM controller), `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx` (symmetric wiring). Scope: 3 файла; commit message: `feat(pm-status-panel): wire model picker callbacks through session views`.
2. [TODO] Git Commit: `feat(pm-status-panel): wire model picker callbacks through session views` (hash: TBD)

#### F3 — Controller dispatch + non-Codex guard

1. [TODO] `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts` (или runtime equivalent): invoke `api.requestCodexModelSwitch(...)` from callback. Guard: для non-Codex sessions callback no-op (chip click ничего не делает; визуально chip остаётся). Default reasoning при выборе model: previous-if-supported, else first из `reasoningEffortOptions`. Component-тест: Codex session selection → correct dispatch с target; non-Codex no-op. Scope: ≤2 файла; commit message: `feat(pm): dispatch codex model switch with non-codex guard`.
2. [TODO] Git Commit: `feat(pm): dispatch codex model switch with non-codex guard` (hash: TBD)

### Stream G — End-to-end native request capture + Settings independence

1. [TODO] Добавить native-capture integration test:
   - **Test 1:** switch `gpt-5.2` → `gpt-5.3-codex-spark` с reasoning low → send turn → captured raw payload не содержит `summary` field, содержит `<model_switch>` в input array.
   - **Test 2 (Settings independence):** после `session:codex:model-switch` без последующего turn'а → следующий `dialog:send` с applied turn config → assert `modelId === target.modelId` и `reasoning === target.reasoning`, **БЕЗ** чтения Settings defaults (защищает от регрессии 1.2.114).
   - **Test 3 (UI immediate update):** после dispatch switch'а UI получает `session:model:update` с новым effective identity в том же tick.
   Scope: ≤2 файла; commit message: `test(codex): cover model switch end-to-end with settings independence`.
2. [TODO] Git Commit: `test(codex): cover model switch end-to-end with settings independence` (hash: TBD)

### Stream H — SSOT docs sync

1. [TODO] Обновить `Modules/Codex.md` (capability registry + switch behaviour + clarification что existing `handleSwitchRequest` остаётся для cross-session manual flow, а новый `session:codex:model-switch` — для in-session config switch), `Modules/Codex_ProviderInvocationFlags.md` (per-model flags table + capability gating через registry), `Modules/Session_UI/SessionStatusPanel.md` (switch UI semantic + non-Codex guard). Scope: 3 файла; commit message: `docs(ssot): document codex model switch architecture`.
2. [TODO] Git Commit: `docs(ssot): document codex model switch architecture` (hash: TBD)
3. [TODO] Если по результатам review требуется new SystemArchitecture invariant для capability-gated payload contract — добавить. Scope: 1 файл; commit message: `docs(ssot): add system invariant for codex capability-gated payload`.
4. [TODO] Git Commit: `docs(ssot): add system invariant for codex capability-gated payload` (hash: TBD, may be skipped)

## Phase 2 — Release 1.2.111 (owner: Build, updated: 2026-04-30)

### Stream I — Pre-build version sync

1. [TODO] Обновить `README.md` («Current Release — v1.2.111») и `CHANGELOG.md` (новая секция `## [1.2.111]`) с описанием Codex switch. Scope: 2 файла; commit message: `docs: prepare release 1.2.111`.
2. [TODO] Git Commit: `docs: prepare release 1.2.111` (hash: TBD)

### Stream J — Build new release

1. [TODO] `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version` → копирование 7 tarballs в `doc/tmp/releases/`. Артефакт: `codeai-hub-1.2.111.vsix`. Scope: scripts; commit message: `chore: build release 1.2.111`.
2. [TODO] Git Commit: `chore: build release 1.2.111` (hash: TBD)

## Phase 3 — User acceptance (owner: User retest, updated: 2026-04-30)

### Stream K — Hand off for user verification

1. [BLOCKED on user] Передать VSIX `codeai-hub-1.2.111.vsix` пользователю. Scope **не закрывается**, пока пользователь явно не подтвердит:
   - Switch на Codex session работает (`gpt-5.2` → `gpt-5.3-codex-spark` с reasoning low → следующий user message processes без error / без `400 unsupported_parameter`).
   - Chips correctly disabled / no-op для Claude и Gemini sessions.
   - UI behaviour satisfying (picker UX, reasoning options derivation, default selection logic).
   - SSOT documentation accurate (user reviews и подтверждает).
2. [BLOCKED on user] Stream K статус IN_PROGRESS до явного «ОК / закрываем».

### Stream L — Closeout (только после user OK)

1. [TODO] После явного user approval: архивировать `doc/TODO/todo-plan.md` в `doc/TODO/Archive/todo-plan-phase3-codex-status-panel-model-switch.md`; перенести planning-doc в `doc/SolidWorks-WorkFlow/Plans/Archive/`; обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`; reset активного `doc/TODO/todo-plan.md` в no-active-scope shell. Scope: 4 файла + дельта; commit message: `docs: archive codex status panel model switch scope`.
2. [TODO] Git Commit: `docs: archive codex status panel model switch scope` (hash: TBD)
3. [TODO] Создать `doc/Sessions/SessionXXX.md` (Type A — Completion Report). Scope: 1 файл (uncommitted per CLAUDE.md convention).
4. [TODO] Push на GitHub.
