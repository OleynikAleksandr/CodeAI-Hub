# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-left-sidebar-phase1-planning-2026-05-20",
  "branch": "main",
  "baseHead": "22ad9bcec",
  "lastRecordedCommit": "22ad9bcec",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Implementation/DevelopmentTree_LeftSidebar_Phase1_Planning_RU.md",
  "currentTaskId": "phase1.stream1.task1",
  "expectedCommitMessage": "docs: open development tree sidebar planning",
  "debt": {
    "expectedCommitMessage": "docs: open development tree sidebar planning",
    "preCommitHead": "22ad9bcec",
    "stage": "commit_pending",
    "taskId": "phase1.stream1.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Implementation/DevelopmentTree_LeftSidebar_Phase1_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Implementation_Lifecycle_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего planning cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase, Stream и микро-задач.
- Каждая подзадача должна затрагивать не более 3 tracked файлов.
- Каждая tracked подзадача оформляется парой пунктов: реализация/изменения и `Git Commit: ...`.
- Гейты запускаются штатно через Husky и `npm run plan:commit -- "<expected commit message>"`.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 1 — Development Tree Left Sidebar Planning (owner: Codex, updated: 2026-05-20)

### Stream: Planning Intake
1. [DONE] `phase1.stream1.task1` Create the active planning scaffold for Development Tree left sidebar phase 1 and register it in the docs index (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Implementation/DevelopmentTree_LeftSidebar_Phase1_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: open development tree sidebar planning`).
2. [PENDING] Git Commit: `docs: open development tree sidebar planning` (hash: TBD)

### Stream: Planning Draft
3. [TODO] `phase1.stream2.task1` Draft the detailed phase 1 plan for left sidebar Development Tree UI changes, including node hierarchy, visual rules, state projection, Core data needs, and implementation slicing (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Implementation/DevelopmentTree_LeftSidebar_Phase1_Planning_RU.md`; expected commit: `docs: draft development tree sidebar phase one plan`).
4. [TODO] Git Commit: `docs: draft development tree sidebar phase one plan` (hash: TBD)

### Stream: User Workflow Acceptance Testing
5. [TODO] `phase1.stream3.task1` User reviews the Development Tree left sidebar phase 1 planning document before scope closeout (scope: user workflow acceptance; no commit expected).

### Stream: Scope Closeout
6. [TODO] `phase1.stream4.task1` Close this planning scope after explicit user acceptance, archive or promote the planning document according to disposition, update references, and return `todo-plan.md` to terminal NONE state (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, doc/SolidWorks-WorkFlow/Plans/Implementation/DevelopmentTree_LeftSidebar_Phase1_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_LeftSidebar_Phase1_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree sidebar planning`).
7. [TODO] Git Commit: `docs: close development tree sidebar planning` (hash: TBD)
8. [TODO] `phase1.stream4.task2` Reserved post-closeout handoff anchor (scope: terminal NONE transition; no commit expected).
