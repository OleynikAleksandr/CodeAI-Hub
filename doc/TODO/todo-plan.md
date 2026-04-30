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
  - `src/client/ui/src/session/model-switcher/session-model-picker-card.tsx` — picker card render (Stream F filter Codex-only options).
  - `src/client/ui/src/session/model-switcher/session-model-switcher-facade.ts` — option state builder (Stream F derives `reasoningEffortOptions` per model).
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

### Stream B — Codex capability flags + model registry

1. [TODO] Расширить `src/types/codex-model-registry.ts` per-model полями: `supportsReasoningSummary`, `supportsVerbosity`, `reasoningEffortOptions`, `contextWindow`, `autoCompactTokenLimit`. Spark получает `supportsReasoningSummary: false` и `reasoningEffortOptions` по результатам провайдер-experiment (если empty — UI hide reasoning chip для Spark). Добавить unit-тест registry. Scope: 2 файла; commit message: `feat(codex): add per-model capability flags`.
2. [TODO] Git Commit: `feat(codex): add per-model capability flags` (hash: TBD)

### Stream C — Codex payload builder gating

1. [TODO] В Codex App Server payload builder gate `reasoning.summary` / `summary` / `verbosity` на `currentInvocationProfile.capabilities`. Никакого in-place transform — pure rebuild. Добавить unit-тест: Spark turn payload не содержит `reasoning.summary`; non-Spark содержит. Scope: ≤3 файла (builder + test + maybe small helper); commit message: `fix(codex): gate payload fields on per-model capability flags`.
2. [TODO] Git Commit: `fix(codex): gate payload fields on per-model capability flags` (hash: TBD)

### Stream D — Switch transport + Core handler

1. [TODO] `session-stream-contracts.ts` + `remote-bridge-message-router.ts` + `session-request-handler-session-actions.ts` (или новый sibling handler): добавить `session:codex:model-switch` transport. Core handler: validate target → mutate `Session.modelBinding` → set `pendingModelSwitchInjection = true` → broadcast `session:model:update`. НЕ trigger'ит provider call. Scope: 3 файла; commit message: `feat(core): add codex model switch transport handler`.
2. [TODO] Git Commit: `feat(core): add codex model switch transport handler` (hash: TBD)
3. [TODO] Unit-тест: handler validates target, mutates binding, sets flag, broadcasts. Scope: 1 файл; commit message: `test(core): cover codex model switch handler state mutation`.
4. [TODO] Git Commit: `test(core): cover codex model switch handler state mutation` (hash: TBD)

### Stream E — `<model_switch>` developer message injection

1. [TODO] В Codex App Server dispatch path: при `pendingModelSwitchInjection === true` embed `<model_switch>` developer message в начало `turn/start.input` (по образцу Codex CLI), затем сбросить flag. Snapshot-test первого turn after switch. Scope: ≤3 файла; commit message: `feat(codex): inject model switch developer message on first turn after switch`.
2. [TODO] Git Commit: `feat(codex): inject model switch developer message on first turn after switch` (hash: TBD)

### Stream F — Status panel UI wiring (Codex-only)

1. [TODO] `status-panel.tsx` + `session-model-picker-card.tsx` + (`use-project-manager-dialog-session-controller.ts` или runtime view equivalent): wire model + reasoning chips. Codex sessions → picker open + dispatch `session:codex:model-switch`. Non-Codex → chips disabled / no-op + tooltip. Default reasoning при выборе model: previous-if-supported, else first из options. Scope: 3 файла; commit message: `feat(pm-status-panel): wire codex model and reasoning switch buttons`.
2. [TODO] Git Commit: `feat(pm-status-panel): wire codex model and reasoning switch buttons` (hash: TBD)
3. [TODO] Component-тест: click chip → picker open; selection → correct dispatch; non-Codex no-op. Scope: 1 файл; commit message: `test(pm-status-panel): cover codex switch wiring`.
4. [TODO] Git Commit: `test(pm-status-panel): cover codex switch wiring` (hash: TBD)

### Stream G — End-to-end native request capture

1. [TODO] Добавить native-capture integration test: switch `gpt-5.2` → `gpt-5.3-codex-spark` с reasoning low → send turn → assert raw native request не содержит `reasoning.summary`, содержит `<model_switch>` в input array. Scope: ≤2 файла; commit message: `test(codex): cover model switch end-to-end via native request capture`.
2. [TODO] Git Commit: `test(codex): cover model switch end-to-end via native request capture` (hash: TBD)

### Stream H — SSOT docs sync

1. [TODO] Обновить `Modules/Codex.md` (capability flags + switch behaviour), `Modules/Codex_ProviderInvocationFlags.md` (per-model flags table), `Modules/Session_UI/SessionStatusPanel.md` (switch UI semantic). Scope: 3 файла; commit message: `docs(ssot): document codex model switch architecture`.
2. [TODO] Git Commit: `docs(ssot): document codex model switch architecture` (hash: TBD)
3. [TODO] Если по результатам review требуется new SystemArchitecture invariant — добавить. Scope: 1 файл; commit message: `docs(ssot): add system invariant for codex capability-gated payload`.
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
