# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkspaceIdentity_Stabilization.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowState_Reconciliation.md`
  - `doc/Sessions/Session071.md`
  - `doc/Sessions/Session072.md`
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Release stream закрывается только на чистом дереве и строго по `Release Build Checklist`.

---

## Phase 300 — Post-Release Smoke And Regression Intake (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Release smoke verification
1. [DONE] Проверить локально установленный `codeai-hub-1.1.717.vsix`, зафиксировать реальные regression-сценарии на двух workspace и утвердить repair SSOT для PM/Core (`ProjectManager_WorkflowState_Reconciliation.md`) вместо открытия нового feature track (scope: `doc/Sessions/Session072.md`, `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowState_Reconciliation.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(architecture): capture pm workflow regression repair`).
2. [DONE] Git Commit: `docs(architecture): capture pm workflow regression repair` (hash: `81ab9099`)

## Phase 301 — PM Workflow State Reconciliation Repair (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Filter internal metadata artifacts
3. [DONE] Исключить `description-step.json` и временные atomic-write файлы `description-step.json.tmp-*` из watcher/state projection, чтобы internal metadata никогда не попадала в user-facing artifacts шага `Description` (scope: `packages/core/src/workflow/watcher/workflow-watcher.ts`, `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/workflow/workflow-internal-metadata-artifacts.test.ts`; expected commit: `fix(core): filter internal workflow metadata artifacts`).
4. [DONE] Git Commit: `fix(core): filter internal workflow metadata artifacts` (hash: `0b63cb54`)

### Stream 2: Reconcile stage status on read path
5. [DONE] Нормализовать `workflow-state` read path: derived `completed`/`invalid`/`outdated` status теперь выводится из continuity и канонических файлов через отдельный reconciler, а не только из watcher-memory event trail (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/workflow/state/workflow-state-reconciliation.ts`, `packages/core/src/workflow/state/workflow-state-reconciliation.test.ts`; expected commit: `fix(core): reconcile workflow stage state on read`).
6. [DONE] Git Commit: `fix(core): reconcile workflow stage state on read` (hash: `ebfb48ac`)

### Stream 3: Advance cross-stage lastActive
7. [DONE] Обновлять `lastActive` для `virtual_simulation` и следующих user-facing artifacts, чтобы reopen workspace и stage restore не застревали на `questionnaire.md` после продвижения workflow вперёд (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/workflow/runtime/workflow-last-active-cross-stage.test.ts`; expected commit: `fix(core): advance workflow last-active across stages`).
8. [DONE] Git Commit: `fix(core): advance workflow last-active across stages` (hash: `5c565af6`)

### Stream 4: Reactive stage-to-panel sync in PM
9. [DONE] Сделать stage sync реактивным к обновлению `workflowState`, чтобы позднее появление continuity/session выбранного шага автоматически переоткрывало правильный dialog pane и не оставляло stale `Description` session (scope: `src/client/project-manager/components/layout/use-stage-panel-sync.ts`, `src/client/project-manager/components/layout/use-stage-panel-sync.test.ts`; expected commit: `fix(pm): resync panels to active workflow stage`).
10. [DONE] Git Commit: `fix(pm): resync panels to active workflow stage` (hash: `6eae900e`)

### Stream 5: Reconcile persisted dialog intent
11. [IN_PROGRESS] Превратить `localStorage` dialog restore в stage-aware hint: stale intent должен отбрасываться при reopen, если reconciled `workflow-state` и `lastActive` уже указывают на более поздний шаг (scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`; expected commit: `fix(pm): discard stale dialog restore intent`).
12. [TODO] Git Commit: `fix(pm): discard stale dialog restore intent` (hash: TBD)

### Stream 6: Align Virtual Simulation validator with live artifacts
13. [TODO] Убрать ложный `invalid` для текущего runtime output `virtual-simulation.md`: validator и UI должны принимать `##` и `### Сценарий N` в repair window, не ломая user-facing guidance (scope: `packages/core/src/workflow/validation/virtual-simulation-validator.ts`, `src/client/project-manager/components/virtual-simulation/virtual-simulation-panel.tsx`, `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`; expected commit: `fix(workflow): align virtual simulation heading validation`).
14. [TODO] Git Commit: `fix(workflow): align virtual simulation heading validation` (hash: TBD)

### Stream 7: Regression verification on real workspace data
15. [TODO] Прогнать таргетные проверки затронутых пакетов/клиентов и повторный smoke на двух workspace из `Session072`: tree hydration, completed badges, correct dialog restore, отсутствие stale Description dialog поверх Virtual Simulation (scope: `packages/core`, `src/client/project-manager`, `doc/Sessions/Session072.md`; expected commit: `test(release): verify pm workflow regression repair`).
16. [TODO] Git Commit: `test(release): verify pm workflow regression repair` (hash: TBD)

## Phase 302 — Release Rebuild After Regression Repair (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Next patch release by checklist
17. [BLOCKED] После зелёного regression smoke синхронизировать release-facing docs, пройти `Release Build Checklist` и собрать следующий patch release с чистого дерева (scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/`; expected commit: `build(release): ship pm workflow regression repair`).
18. [BLOCKED] Git Commit: `build(release): ship pm workflow regression repair` (hash: TBD)
