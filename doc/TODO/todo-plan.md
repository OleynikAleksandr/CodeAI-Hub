# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_ContextProbe_ContinuityFix_1.2.16.md`
- **Read this context before implementation:**
  - `doc/BugRegistry.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `packages/Claude_Module/src/sdk/claude-context-usage-probe.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-turn-arbitration.ts`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Gates автоматически через Husky.
- Таргетные проверки до релиза: Claude module tests, Core rollover tests, `npm run build --workspace=@codeai-hub/claude-module`, `npm run build --workspace=@codeai-hub/core`.

## Phase 1 — Claude Context Probe + Continuity Unlock 1.2.16 (owner: Codex, updated: 2026-04-18)

### Stream 1: Scope registration
1. [DONE] Зарегистрировать `BUG-2026-04-18-01` в `doc/BugRegistry.md`, создать planning-doc и активный `todo-plan.md`. — scope: `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Plans/Claude_ContextProbe_ContinuityFix_1.2.16.md`, `doc/TODO/todo-plan.md`; commit: `docs: register 1.2.16 Claude context probe continuity bug`
2. [DONE] Git Commit: `docs: register 1.2.16 Claude context probe continuity bug` (hash: `99145e688`)

### Stream 2: Release notes pre-bump
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под будущий релиз `1.2.16`. — scope: `README.md`, `CHANGELOG.md`; commit: `docs: prepare 1.2.16 release notes for Claude context probe fix`
2. [DONE] Git Commit: `docs: prepare 1.2.16 release notes for Claude context probe fix` (hash: `4d44528fa`)

### Stream 3: Claude probe runner fix
1. [DONE] Исправить Unix runner selection для Claude `/context` probe и добавить unit guard. — scope: `packages/Claude_Module/src/sdk/claude-context-usage-probe.ts`, `packages/Claude_Module/src/sdk/claude-context-usage-probe.test.ts`; commit: `fix(claude): run context usage probe with native binary on unix`
2. [DONE] Git Commit: `fix(claude): run context usage probe with native binary on unix` (hash: `9f06e5e35`)

### Stream 4: Claude post-turn unavailable signal
1. [DONE] Протащить explicit `postTurnTokenUsageUnavailable` из Claude usage-sync в `turn_completed` event. — scope: `packages/Claude_Module/src/messaging/claude-token-usage-sync.ts`, `packages/Claude_Module/src/messaging/claude-usage-sync.ts`, `packages/Claude_Module/src/messaging/claude-message-finish-handler.ts`; commit: `fix(claude): mark post-turn token usage as unavailable on probe failure`
2. [DONE] Git Commit: `fix(claude): mark post-turn token usage as unavailable on probe failure` (hash: `ba50e58c5`)

### Stream 5: Core continuity fallback
1. [DONE] Научить Core снимать `context_check_pending` по explicit provider signal и покрыть regression test'ом. — scope: `packages/core/src/remote-bridge/handlers/session-request-handler-turn-arbitration.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.rollover.test.ts`; commit: `fix(core): unlock continuity when provider marks post-turn usage unavailable`
2. [DONE] Git Commit: `fix(core): unlock continuity when provider marks post-turn usage unavailable` (hash: `e90615eb2`)

### Stream 6: SSOT sync
1. [DONE] Обновить SSOT/contract docs под новый Claude continuity fallback contract. — scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`; commit: `docs: document Claude post-turn usage unavailable continuity contract`
2. [DONE] Git Commit: `docs: document Claude post-turn usage unavailable continuity contract` (hash: `e89f63eb6`)

### Stream 7: Planning archive
1. [DONE] После завершения реализации перенести planning-doc в `Plans/Archive/` и обновить `Docs_Index.md`. — scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_ContextProbe_ContinuityFix_1.2.16.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit: `docs: archive 1.2.16 Claude continuity planning doc`
2. [DONE] Git Commit: `docs: archive 1.2.16 Claude continuity planning doc` (hash: `53602f016`)

### Stream 8: Release build 1.2.16
1. [DONE] Прогнать таргетные тесты/сборки, затем `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`. — scope: release/build artifacts; commit: `chore: bump version to 1.2.16 for Claude continuity fix release`
2. [DONE] Git Commit: `chore: bump version to 1.2.16 for Claude continuity fix release` (hash: `769844013`)
3. [TODO] Архивировать `todo-plan.md`, вернуть placeholder `Execution Scope Status: EMPTY`. — scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-1.2.16-claude-context-probe-fix.md`; commit: `docs: close 1.2.16 todo-plan after build`
4. [TODO] Git Commit: `docs: close 1.2.16 todo-plan after build` (hash: TBD)
