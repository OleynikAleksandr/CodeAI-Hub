# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Architecture.md` — approved architecture for Claude Status Panel model/thinking switch.
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — global invariants: effective model identity, model invocation profile boundary, provider last-mile adaptation.
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md` — Claude provider SSOT, thinking effort parity, SDK isolation, native capture.
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md` — Status Panel chip/picker contract and non-Codex no-op baseline.
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md` — `Session.modelBinding`, applied-config `source="session_binding"`, Settings independence.
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_StatusPanel_ModelSwitch_Architecture.md` — accepted Core/UI precedent and Spark `summary = "none"` lesson.
  - `doc/TODO/Archive/todo-plan-codex-status-panel-model-switch.md` — implemented Codex sequence, failed retests, final hotfix path.
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает ≤3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация, (2) `Git Commit: ...`.
- Если по факту разработки конкретная подзадача затрагивает >3 файлов, задача должна быть разбита до коммита.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Таргетные проверки перед закрытием релевантных stream'ов: `npm run build --workspace=@codeai-hub/claude-module`, `npm run build --workspace=@codeai-hub/core`, `npm run build:project-manager`, `npm run typecheck:webview`.
- Real-time документация: любое изменение архитектуры/логики требует синхронного обновления SSOT docs и этого todo-plan до коммита.
- Scope closeout разрешен только после release build, установки/визуального тестирования пользователем и явного user acceptance.

## Phase 0 — Approval and Implementation Plan (owner: Docs, updated: 2026-05-01)

### Stream A — Approved planning handoff

1. [DONE] User approved `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Architecture.md` and authorized implementation. Scope: planning doc + todo-plan; commit message: `docs: approve claude status panel model switch plan`.
2. [DONE] Git Commit: `docs: approve claude status panel model switch plan` (hash: 4b74e2f64)
3. [DONE] Replace planning-control todo with this full implementation plan derived from the approved planning-doc. Scope: `doc/TODO/todo-plan.md`; commit message: `docs: open claude status panel model switch implementation plan`.
4. [DONE] Git Commit: `docs: open claude status panel model switch implementation plan` (hash: 542eb92f7)

## Phase 1 — Claude Capability Registry and Effort Parity (owner: Claude provider/Core, updated: 2026-05-01)

### Stream B — Provider-owned Claude capability registry

1. [DONE] Add provider-owned Claude runtime capability registry and exports. Verification: `npm run build --workspace=@codeai-hub/claude-module`. Scope: `packages/Claude_Module/src/types/claude-model-capabilities.ts`, `packages/Claude_Module/src/types/index.ts`, `packages/Claude_Module/src/index.ts`; commit message: `feat(claude): add model capability registry`.
2. [DONE] Git Commit: `feat(claude): add model capability registry` (hash: a269cbfb5)
3. [TODO] Add runtime registry tests for alias coverage, thinking off support, effort options, and unknown alias rejection. Scope: `packages/Claude_Module/src/types/claude-model-capabilities.test.ts`; commit message: `test(claude): cover model capability registry`.
4. [TODO] Git Commit: `test(claude): cover model capability registry` (hash: TBD)

### Stream C — UI mirror and effort parity

1. [TODO] Mirror Claude capability fields in UI registry and add alignment coverage against runtime registry. Scope: `src/types/claude-model-registry.ts`, `src/client/project-manager/services/claude-model-registry-alignment.test.ts`; commit message: `feat(ui): mirror claude model capability metadata`.
2. [TODO] Git Commit: `feat(ui): mirror claude model capability metadata` (hash: TBD)
3. [TODO] Thread `xhigh` through Claude provider applied/runtime effort types or explicitly remove it from Claude capability options if native evidence blocks it. Baseline target: support `xhigh` end-to-end. Scope: `packages/Claude_Module/src/provider/claude-applied-turn-config.ts`, `packages/Claude_Module/src/session/types.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`; commit message: `fix(claude): keep thinking effort parity in provider runtime`.
4. [TODO] Git Commit: `fix(claude): keep thinking effort parity in provider runtime` (hash: TBD)

## Phase 2 — Core Switch Command (owner: Core, updated: 2026-05-01)

### Stream D — Contract and shared switch seam

1. [TODO] Add `session:claude:model-switch` payload contract and incoming validator; generalize model-switch seam types for Claude thinking fields without breaking Codex. Scope: `packages/core/src/remote-bridge/session-stream-contracts.ts`, `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-model-switch-types.ts`; commit message: `feat(core): add claude model switch command contract`.
2. [TODO] Git Commit: `feat(core): add claude model switch command contract` (hash: TBD)

### Stream E — Core handler and router

1. [TODO] Implement Claude model switch handler and wire it through SessionRequestHandler/router with workspace scope guard. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler-claude-model-switch.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.ts`; commit message: `feat(core): wire claude model switch handler`.
2. [TODO] Git Commit: `feat(core): wire claude model switch handler` (hash: TBD)
3. [TODO] Add Core tests: valid target mutates `Session.modelBinding`, broadcasts `session:model:update`, does not call adapter send; invalid/non-Claude targets are guarded. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler-claude-model-switch.test.ts`; commit message: `test(core): cover claude model switch handler`.
4. [TODO] Git Commit: `test(core): cover claude model switch handler` (hash: TBD)

### Stream F — Client transport

1. [TODO] Add Project Manager client outbound type and API method for Claude switch. Scope: `src/client/project-manager/core-stream-message-types.ts`, `src/client/project-manager/api.ts`; commit message: `feat(pm): add claude model switch client api`.
2. [TODO] Git Commit: `feat(pm): add claude model switch client api` (hash: TBD)

## Phase 3 — Claude Provider Applied Config (owner: Claude provider, updated: 2026-05-01)

### Stream G — Provider next-turn option mapping

1. [TODO] Ensure binding-derived applied config maps to Claude SDK `model`, `thinking`, and `effort`, including thinking off and `xhigh`. Scope: `packages/Claude_Module/src/provider/claude-applied-turn-config.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`; commit message: `feat(claude): apply switched model thinking config`.
2. [TODO] Git Commit: `feat(claude): apply switched model thinking config` (hash: TBD)
3. [TODO] Add provider tests for applied model/thinking/effort options, including thinking off and `xhigh`. Scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.test.ts`, `packages/Claude_Module/src/provider/claude-applied-turn-config.test.ts`; commit message: `test(claude): cover switched turn config mapping`.
4. [TODO] Git Commit: `test(claude): cover switched turn config mapping` (hash: TBD)

## Phase 4 — Status Panel UI (owner: Project Manager / Session UI, updated: 2026-05-01)

### Stream H — Provider-aware picker UI

1. [TODO] Generalize Status Panel picker/options for Claude model and thinking choices while preserving Codex behavior. Scope: `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/status-panel-model-picker.tsx`, `src/client/ui/src/session/status-panel-model-picker.test.tsx`; commit message: `feat(ui): add claude status panel picker options`.
2. [TODO] Git Commit: `feat(ui): add claude status panel picker options` (hash: TBD)

### Stream I — PM callback wiring

1. [TODO] Wire Claude model/thinking callbacks through shared session view and PM runtime/dialog views. Scope: `src/client/ui/src/session/session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`; commit message: `feat(pm): wire claude picker callbacks through session views`.
2. [TODO] Git Commit: `feat(pm): wire claude picker callbacks through session views` (hash: TBD)
3. [TODO] Dispatch Claude switch from PM controller with provider guard and current-effort preservation. Scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`, related focused controller test if needed; commit message: `feat(pm): dispatch claude model switch with provider guard`.
4. [TODO] Git Commit: `feat(pm): dispatch claude model switch with provider guard` (hash: TBD)

## Phase 5 — Evidence, Verification, and SSOT (owner: Provider/Core/Docs, updated: 2026-05-01)

### Stream J — Native evidence

1. [TODO] Add/extend native capture or provider-home evidence path proving post-switch next-turn Claude request carries selected `model`, `thinking`, `effort`, and keeps `settingSources: []`. Scope: ≤3 files selected during implementation; commit message: `test(claude): capture post-switch native request config`.
2. [TODO] Git Commit: `test(claude): capture post-switch native request config` (hash: TBD)

### Stream K — Targeted verification

1. [TODO] Run targeted tests and builds for changed packages/clients: Claude module tests, Core switch tests, PM/UI tests, `npm run build --workspace=@codeai-hub/claude-module`, `npm run build --workspace=@codeai-hub/core`, `npm run build:project-manager`, `npm run typecheck:webview`. Scope: verification only; commit message: N/A.
2. [TODO] Git Commit: N/A (hash: N/A)

### Stream L — SSOT documentation sync

1. [TODO] Update SSOT docs for accepted Claude switch behavior, capability registry, Status Panel semantics, `xhigh` result, and native evidence requirements. Scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; commit message: `docs(ssot): document claude status panel model switch`.
2. [TODO] Git Commit: `docs(ssot): document claude status panel model switch` (hash: TBD)

## Phase 6 — Release Build (owner: Build, updated: 2026-05-01)

### Stream M — Pre-build version docs

1. [TODO] Determine next version from `package.json` + 1 and update release-facing docs before build. Scope: `README.md`, `CHANGELOG.md`; commit message: `docs: prepare release <version>`.
2. [TODO] Git Commit: `docs: prepare release <version>` (hash: TBD)

### Stream N — Build release artifacts

1. [TODO] Confirm clean tree, run `./scripts/build-all.sh`, verify generated tarballs/manifests/bundles, and commit generated release metadata. Scope: generated release files; commit message: `chore: build release <version>`.
2. [TODO] Git Commit: `chore: build release <version>` (hash: TBD)
3. [TODO] Run `./scripts/build-release.sh --use-current-version` on clean tree and verify VSIX packaging output. Scope: VSIX packaging artifacts/session notes; commit message: `chore: finalize release <version>`.
4. [TODO] Git Commit: `chore: finalize release <version>` (hash: TBD)

## Phase 7 — User Visual Acceptance Testing (owner: User, updated: 2026-05-01)

### Stream O — User retest

1. [TODO] Hand off VSIX to user for install and visual/native retest. Required checks: Claude Status Panel switch `sonnet` -> `opus` or `haiku`, thinking on/off, effort change, same logical session/dialog continuity, no Settings overwrite, Codex unchanged, Gemini no misleading dispatch. Scope remains ACTIVE until explicit acceptance.
2. [TODO] Record user acceptance or failed retest details. Scope: `doc/TODO/todo-plan.md`, `doc/Sessions/Session038.md`; commit message depends on outcome.

## Phase 8 — Scope Closeout (owner: Docs, updated: 2026-05-01)

### Stream P — Closeout after user acceptance only

1. [BLOCKED: waiting for user acceptance] Archive completed `doc/TODO/todo-plan.md`, archive or promote planning-doc conclusions, update `Docs_Index.md`, update session report as COMPLETED. Scope: docs only; commit message: `docs: close claude status panel model switch scope`.
2. [BLOCKED: waiting for user acceptance] Git Commit: `docs: close claude status panel model switch scope` (hash: TBD)
