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
  - `packages/Codex_AppServer_Module/src/types/codex-model-capabilities.ts` — **новый runtime capability registry**, создаётся в Stream B1; Core/Codex consumers import this via Codex module exports, not from root UI `src/types/*`.
  - `src/types/codex-model-registry.ts` — UI/settings model registry mirror (Stream B2 расширяет display-side per-model capability fields and alignment tests).
  - `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts` — owns `thread/start` / `turn/start` / `turn/interrupt` JSON-RPC dispatch (Stream C gating + Stream E injection).
  - `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-params.ts` — текущая логика построения `reasoning.summary` field (Stream C — добавить capability gate перед добавлением поля).
  - `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts` — turn event routing (для понимания, как payload дотекает до wire).
  - `packages/Codex_AppServer_Module/src/app-server/process/codex-provider-home-config.ts` — provider-home `model_reasoning_summary` config materialization (Spark special case lives here).
  - `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts` — adapter boundary (sendMessage / closeSession / refreshUsageLimits).
  - `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts` — existing native capture infrastructure (Stream G integration test reuses этот path).
  - `packages/Codex_AppServer_Module/src/types/index.ts` — exported Codex turn-option keys; Stream E добавляет `CODEX_MODEL_SWITCH_INJECTION_KEY`.

  ### F. Core remote bridge — switch path anchors
  - `packages/core/src/remote-bridge/session-stream-contracts.ts` — реестр session commands (Stream D добавляет `session:codex:model-switch`).
  - `packages/core/src/remote-bridge/types.ts` — applied provider turn-config envelope; Stream D4 расширяет `source` union на `"session_binding"` и `readAppliedProviderTurnConfig()` normalization.
  - `packages/core/src/remote-bridge/remote-bridge-message-router.ts` — websocket command router (Stream D registers new command).
  - `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts` — incoming websocket payload validation registry; Stream D1 добавляет validator для `session:codex:model-switch`.
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts` — owner façade for session handlers; Stream D2b добавляет public `handleCodexModelSwitch(...)` и wiring нового handler-а.
  - `packages/core/src/remote-bridge/handlers/session-request-handler-model-switch-types.ts` — **новый provider-neutral seam**, создаётся в Stream D1b; shared target/result/strategy types for future Claude/Gemini work, Codex-only active implementation.
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
3. [DONE] Добавить approved provider-neutral seam amendment в planning-doc и todo-plan: reusable target/result/strategy types, Codex-only active implementation, Claude/Gemini disabled/no-op until provider-native strategies are verified. Scope: 2 файла; commit message: `docs: add provider-neutral switch seam to codex plan`.
4. [DONE] Git Commit: `docs: add provider-neutral switch seam to codex plan` (hash: 2ca14d551)

### Stream B — Codex capability registry expansion

1. [DONE] Создать runtime registry в Codex module: `packages/Codex_AppServer_Module/src/types/codex-model-capabilities.ts` + export из `packages/Codex_AppServer_Module/src/types/index.ts` + package root export. Helper `getCodexModelCapabilities(modelId)` returns `supportsReasoningSummary`, `supportsVerbosity`, `reasoningEffortOptions`, `contextWindow`, `autoCompactTokenLimit`. Spark получает `supportsReasoningSummary: false`; non-Spark reasoning options include `["low", "medium", "high", "xhigh"]`. Scope: 3 файла; commit message: `feat(codex): add runtime model capability registry`.
2. [DONE] Git Commit: `feat(codex): add runtime model capability registry` (hash: 827293e87)
3. [DONE] Добавить unit-test runtime registry в Codex module: assert Spark `supportsReasoningSummary === false`, non-Spark `=== true`, reasoning options include `xhigh`, unknown model keeps summary enabled. Scope: 1 файл; commit message: `test(codex): cover runtime model capability registry`.
4. [DONE] Git Commit: `test(codex): cover runtime model capability registry` (hash: 904d2bf2f)
5. [DONE] Расширить UI/settings mirror `src/types/codex-model-registry.ts` теми же capability fields. Добавить / расширить root/UI unit-test: assert UI mirror and runtime registry share the same current Codex model slug set; assert Spark/non-Spark capability parity for known slugs. Scope: ≤2 файла; commit message: `feat(ui): mirror codex model capability metadata`.
6. [DONE] Git Commit: `feat(ui): mirror codex model capability metadata` (hash: 96c3ca0df)

### Stream C — Replace slug-based hardcode in payload helper

1. [DONE] В `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-params.ts` заменить `CODEX_MODELS_WITHOUT_REASONING_SUMMARY` Set lookup на Codex module runtime helper `getCodexModelCapabilities(modelId).supportsReasoningSummary === false`. Сохранить existing public signature `buildCodexReasoningSummaryParams(modelId, summary)`. Расширить existing unit-test'ы (или создать если не было) — assert: вызов с Spark slug возвращает empty object; вызов с non-Spark — `{ summary }`; вызов с unknown slug — defaults retain (см. open question 11.2 если потребуется). Scope: ≤2 файла (helper + test). Никаких новых call sites — `codex-app-server-facade.ts:225` уже вызывает helper; behavior unchanged for non-Spark. Commit message: `refactor(codex): replace slug-based hardcode with capability registry`.
2. [DONE] Git Commit: `refactor(codex): replace slug-based hardcode with capability registry` (hash: 9a7dde344)

### Stream D — Switch transport + Core handler (компилируемые микро-задачи)

#### D1 — Server-side contract + validation

1. [DONE] `packages/core/src/remote-bridge/session-stream-contracts.ts` (payload type + outbound update type), `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts` (register `session:codex:model-switch` validator alongside existing `dialog:switch:*` / `session:*` entries на line 217-231). Router dispatch не добавлять в этом commit, чтобы промежуточный typecheck не ссылался на еще не wired handler method. Scope: 2 файла; commit message: `feat(core): add codex model switch command contract`.
2. [DONE] Git Commit: `feat(core): add codex model switch command contract` (hash: b77b64af3)

#### D1b — Provider-neutral switch seam (types only, Codex-only active)

1. [DONE] New file `packages/core/src/remote-bridge/handlers/session-request-handler-model-switch-types.ts` (or equivalent) + type re-export from `session-request-handler-types.ts` so architecture gates keep the seam reachable: define shared `SessionModelSwitchTarget`, `SessionModelSwitchResult`, `ProviderModelSwitchStrategy` / helper types for provider-neutral Core plumbing. Shape includes `providerId`, `targetModelId`, optional `targetReasoningEffort`, optional future `targetThinkingLevel` / `thinkingEnabled`, normalized `SessionModelBinding`, optional injection payload, and model-update broadcast data. No Claude/Gemini behavior yet; Codex is the only strategy implemented later in D2. Scope: 2 файла; commit message: `feat(core): add provider-neutral model switch seam types`.
2. [DONE] Git Commit: `feat(core): add provider-neutral model switch seam types` (hash: 21663328c)

#### D2 — Session pending switch state

1. [DONE] Add `pendingModelSwitchInjection?: boolean` field в `src/types/session.ts` (line 130 area) и `packages/core/src/session-manager/index.ts:26-32` Session interface (оба слоя in sync в одном коммите) + новый method `SessionManager.clearPendingModelSwitchInjection(sessionId)`. Scope: 2 файла; commit message: `feat(core): add session pending model switch state`.
2. [DONE] Git Commit: `feat(core): add session pending model switch state` (hash: 1c5ceba39)

#### D2b — SessionRequestHandler wiring + router dispatch

1. [DONE] New file `packages/core/src/remote-bridge/handlers/session-request-handler-codex-model-switch.ts` (отдельный handler, **не** reuse `handleSwitchRequest` который resends user message). Handler implements/uses the D1b provider-neutral seam with Codex as the only active strategy: validate target via Codex module exported `getCodexModelCapabilities` (не root UI `src/types/*`) → call `sessionManager.setModelBinding(sessionId, newBinding)` с **полным** binding `(modelId, reasoningEffort)` → set `Session.pendingModelSwitchInjection = true` → broadcast `session:model:update` через existing applied-turn-config contract. **STOP — никакого `adapter.sendMessage`.** `packages/core/src/remote-bridge/handlers/session-request-handler.ts`: instantiate handler in constructor, keep a private field, expose public `handleCodexModelSwitch(...)`. `packages/core/src/remote-bridge/remote-bridge-message-router.ts`: route `session:codex:model-switch` to that public method and add `ensureMessageAllowedForScope` guard for the new command, matching `session:message/delete/stop`. Router must not own handler dependencies directly. Scope: 3 файла; commit message: `feat(core): wire codex model switch handler through session router`.
2. [DONE] Git Commit: `feat(core): wire codex model switch handler through session router` (hash: cbb42565a)
3. [DONE] Unit-тест handler/router path: validates target, mutates binding via setModelBinding (full pair), flips pendingModelSwitchInjection, broadcasts session:model:update в том же tick, **adapter.sendMessage не вызван**. Scope: 1 файл; commit message: `test(core): cover codex model switch handler state mutation`.
4. [DONE] Git Commit: `test(core): cover codex model switch handler state mutation` (hash: 6d7259c25)

#### D3 — Client-side transport

1. [DONE] `src/client/project-manager/core-stream-message-types.ts` (outbound type def matching server contract — payload carries `sessionId`, `targetModelId`, `targetReasoningEffort`), `src/client/project-manager/api.ts` (`requestCodexModelSwitch(sessionId, targetModelId, targetReasoningEffort)` method). Scope: 2 файла; commit message: `feat(pm): add codex model switch client api`.
2. [DONE] Git Commit: `feat(pm): add codex model switch client api` (hash: 3c48bf45a)

#### D4 — Applied turn config расширение (предотвращение регрессии 1.2.114)

1. [DONE] В `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`, `packages/core/src/remote-bridge/types.ts`, `packages/core/src/provider-registry/provider-module-loader.types.ts`: add `targetReasoningEffort?: string` к resolver-пути, сделать live `Session.modelBinding` первичным источником applied config, расширить source literal на `"session_binding"` и обновить `readAppliedProviderTurnConfig()` normalization. Native request capture type входит в тот же контракт applied config, поэтому это отдельная микро-задача на 3 файла. Scope: 3 файла; commit message: `fix(core): pin reasoning effort to session binding in applied turn config`.
2. [DONE] Git Commit: `fix(core): pin reasoning effort to session binding in applied turn config` (hash: a49711590)
3. [DONE] Расширить существующий unit-test session-bound model identity: assert source=`"session_binding"` и что live binding не теряется в пользу Settings. Scope: 1 файл; commit message: `test(core): assert session binding applied config source`.
4. [DONE] Git Commit: `test(core): assert session binding applied config source` (hash: ebd7ea8aa)

### Stream E — `<model_switch>` developer message injection (bridge через turnOptions)

**Архитектурное ограничение:** `CodexAppServerFacade.executeTurn(content, turnOptions?)` — facade не имеет прямого доступа к `SessionManager`. Existing pattern: Core кладёт state в `turnOptions`, facade читает (тот же mechanism, что для applied config через `CODEX_APPLIED_TURN_CONFIG_KEY`).

1. [DONE] В Codex App Server module (`packages/Codex_AppServer_Module/src/types/index.ts` или new small file): экспортировать константу-ключ `CODEX_MODEL_SWITCH_INJECTION_KEY` + type для injection payload. В `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts:206-228` (`executeTurn`): читать `turnOptions[CODEX_MODEL_SWITCH_INJECTION_KEY]` (по образцу existing reading `CODEX_APPLIED_TURN_CONFIG_KEY`); если present — embed developer-style item в начало `turn/start.input` array (точная форма — open question 11.3). Snapshot-test первого turn after switch (assert входной item содержит `<model_switch>` маркер). Scope: ≤3 файла; commit message: `feat(codex): consume model switch injection from turn options`.
2. [DONE] Git Commit: `feat(codex): consume model switch injection from turn options` (hash: c48203a24)
3. [DONE] `packages/Codex_AppServer_Module/src/index.ts`: re-export `CODEX_MODEL_SWITCH_INJECTION_KEY`, `CodexModelSwitchInjectionPayload`, and `resolveCodexWorkflowInvocationProfile` для Core bridge. Scope: 1 файл; commit message: `chore(codex): export model switch injection bridge api`.
4. [DONE] Git Commit: `chore(codex): export model switch injection bridge api` (hash: pending current commit)
5. [IN_PROGRESS] В Core dispatch path (`packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` + new helper `session-request-handler-model-switch-injection.ts` + existing test `session-request-handler-codex-model-switch.test.ts`): перед `adapter.sendMessage` — если `Session.pendingModelSwitchInjection === true`, build injection object (с `baseInstructions` для new model), кладём в `turnOptions[CODEX_MODEL_SWITCH_INJECTION_KEY]`. **После успешного `dispatch`** — call `sessionManager.clearPendingModelSwitchInjection(sessionId)`. Reset делает Core, не facade — потому что facade не знает финального outcome dispatch'а (HTTP error / abort). Unit-тест: bridge entry попадает в turnOptions при флаге=true; flag clear только после resolved promise. Scope: 3 файла; commit message: `feat(core): bridge pending model switch injection through turn options`.
6. [TODO] Git Commit: `feat(core): bridge pending model switch injection through turn options` (hash: TBD)

### Stream F — Status panel UI (3 микро-задачи)

#### F1 — Status panel + picker component

1. [TODO] `src/client/ui/src/session/status-panel.tsx` (line 87-104 area — добавить `onClick` к двум визуальным кнопкам, состояние `openPicker: "model" | "reasoning" | null`, рендеринг picker popup'а), new file `src/client/ui/src/session/status-panel-model-picker.tsx` (picker UI компонент — в этом цикле показывает только Codex models; non-Codex sessions — chips остаются visually, click no-op), new file `src/client/ui/src/session/status-panel-model-picker.test.tsx` (component test: click → picker open → option click → callback fires). Scope: 3 файла; commit message: `feat(ui): add status panel model picker component`.
2. [TODO] Git Commit: `feat(ui): add status panel model picker component` (hash: TBD)

#### F2 — Callback bridge + symmetric PM views

1. [TODO] `src/client/ui/src/session/session-view.tsx` (пробросить onSelectModel / onSelectReasoning из props в StatusPanel), `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx` (wiring callbacks через PM controller), `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx` (symmetric wiring). Scope: 3 файла; commit message: `feat(pm-status-panel): wire model picker callbacks through session views`.
2. [TODO] Git Commit: `feat(pm-status-panel): wire model picker callbacks through session views` (hash: TBD)

#### F3 — Controller dispatch + non-Codex guard

1. [TODO] `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts` **и runtime callback path** (`project-manager-runtime-session-view.tsx` / existing runtime sender owner): invoke `api.requestCodexModelSwitch(...)` from callbacks. Guard: для non-Codex sessions callback no-op (chip click ничего не делает; визуально chip остаётся). Default reasoning при выборе model: previous-if-supported, else first из `reasoningEffortOptions`. Component-тест: Codex dialog session selection → correct dispatch с target; Codex runtime session selection → correct dispatch с target; non-Codex no-op. Scope: ≤3 файла; commit message: `feat(pm): dispatch codex model switch with non-codex guard`.
2. [TODO] Git Commit: `feat(pm): dispatch codex model switch with non-codex guard` (hash: TBD)

### Stream G — End-to-end native request capture + Settings independence

1. [TODO] Добавить native-capture integration test:
   - **Test 1:** switch `gpt-5.2` → `gpt-5.3-codex-spark` с reasoning low → send turn → captured raw payload не содержит `summary` field, содержит `<model_switch>` в input array.
   - **Test 2 (Settings independence):** после `session:codex:model-switch` без последующего turn'а → следующий `dialog:send` с applied turn config → assert `modelId === target.modelId` и `reasoningEffort === target.reasoningEffort`, **БЕЗ** чтения Settings defaults (защищает от регрессии 1.2.114).
   - **Test 3 (UI immediate update):** после dispatch switch'а UI получает `session:model:update` с новым effective identity в том же tick.
   Scope: ≤2 файла; commit message: `test(codex): cover model switch end-to-end with settings independence`.
2. [TODO] Git Commit: `test(codex): cover model switch end-to-end with settings independence` (hash: TBD)

### Stream H — SSOT docs sync

1. [TODO] Обновить `Modules/Codex.md` (capability registry + switch behaviour + clarification что existing `handleSwitchRequest` остаётся для cross-session manual flow, а новый `session:codex:model-switch` — для in-session config switch), `Modules/Codex_ProviderInvocationFlags.md` (per-model flags table + capability gating через registry), `Modules/Session_UI/SessionStatusPanel.md` (switch UI semantic + non-Codex guard + provider-neutral seam note: Claude/Gemini disabled/no-op until their provider-native strategies are verified). Scope: 3 файла; commit message: `docs(ssot): document codex model switch architecture`.
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
