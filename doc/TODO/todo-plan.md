# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-project-contract-orchestrator-planning-2026-05-21",
  "branch": "main",
  "baseHead": "fa17f6a43",
  "lastRecordedCommit": "3d3711ff3",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProjectApplicationContractOrchestrator_Planning_RU.md",
  "currentTaskId": "phase1.stream7.task1",
  "expectedCommitMessage": "docs: require product part leadership ordering",
  "debt": {
    "expectedCommitMessage": "docs: require product part leadership ordering",
    "preCommitHead": "3d3711ff3",
    "stage": "commit_pending",
    "taskId": "phase1.stream7.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProjectApplicationContractOrchestrator_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase, Stream и микро-задач.
- Каждая подзадача должна затрагивать не более 3 tracked файлов.
- Каждая tracked подзадача оформляется парой пунктов: реализация/изменения и `Git Commit: ...`.
- Гейты запускаются штатно через Husky и `npm run plan:commit -- "<expected commit message>"`.
- Targeted builds выполняются перед закрытием затронутого Stream/Phase.
- Для документационного planning scope вместо Release Build используется Tooling Verification.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 1 — Planning Intake (owner: Codex, updated: 2026-05-21)

### Stream: Project Contract Orchestrator Planning
1. [DONE] `phase1.stream1.task1` Create the planning document for the Project/Application Contract Orchestrator, Contract Graph artifact, top-down contract cascade, editable graph UX, and Core-owned downstream invalidation model (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProjectApplicationContractOrchestrator_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan project application contract orchestration`).
2. [DONE] Git Commit: `docs: plan project application contract orchestration` (hash: 23c76a21a)

### Stream: Tooling Verification
3. [DONE] `phase1.stream2.task1` Validate the active planning scope and links after the planning document is created (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProjectApplicationContractOrchestrator_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: no commit expected). Result: Plan validation OK; markdown links OK (454 files checked).

### Stream: User Workflow Acceptance Testing
4. [DONE] `phase1.stream3.task1` User reviews and accepts or requests revisions to the Project/Application Contract Orchestrator planning document (scope: user workflow acceptance; no commit expected). Result: user requested revision: remove separate Project/Application Orchestrator agent; Diagram Modules should select lead Product Part, and the lead Product Part should own application-wide Contract Graph orchestration.

### Stream: Lead Product Part Revision
8. [DONE] `phase1.stream5.task1` Revise the planning document so Diagram Modules owns lead Product Part selection and the lead Product Part agent owns application-wide Contract Graph orchestration without a separate Project/Application Orchestrator agent (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProjectApplicationContractOrchestrator_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: revise lead product part contract orchestration`).
9. [DONE] Git Commit: `docs: revise lead product part contract orchestration` (hash: 3d3711ff3)

### Stream: User Workflow Acceptance Testing 2
10. [DONE] `phase1.stream6.task1` User reviews and accepts or requests revisions to the Lead Product Part Contract Orchestrator planning document (scope: user workflow acceptance; no commit expected). Result: user requested revision: Diagram Modules must order Product Parts by leadership so this order directly defines Development Tree root order.

### Stream: Product Part Leadership Ordering Revision
11. [DONE] `phase1.stream7.task1` Add Diagram Modules requirement to order Product Parts by leadership/contract orchestration priority and preserve that order in Development Tree projection/materialization (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProjectApplicationContractOrchestrator_Planning_RU.md`; expected commit: `docs: require product part leadership ordering`).
12. [PENDING] Git Commit: `docs: require product part leadership ordering` (hash: TBD)

### Stream: User Workflow Acceptance Testing 3
13. [TODO] `phase1.stream8.task1` User reviews and accepts or requests revisions to the Product Part leadership ordering planning update (scope: user workflow acceptance; no commit expected).

### Stream: Scope Closeout
5. [TODO] `phase1.stream4.task1` Close the planning scope after explicit user acceptance and decide whether the planning document remains active/deferred or moves into Archive/SSOT follow-up (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProjectApplicationContractOrchestrator_Planning_RU.md`; expected commit: `docs: close lead product part contract orchestrator planning`).
6. [TODO] Git Commit: `docs: close lead product part contract orchestrator planning` (hash: TBD)
7. [TODO] `phase1.stream4.task2` Reserved post-closeout handoff anchor (scope: terminal NONE transition; no commit expected).
