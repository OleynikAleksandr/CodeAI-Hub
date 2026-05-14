# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-orchestration-cleanup-preparation-planning-2026-05-14",
  "branch": "codex/managed-orchestration-rewrite",
  "baseHead": "584c30fb1",
  "lastRecordedCommit": "584c30fb1",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md",
  "currentTaskId": "managed-orchestration-cleanup-prep.phase1.intake.task1",
  "expectedCommitMessage": "docs: plan managed orchestration cleanup preparation",
  "debt": {
    "expectedCommitMessage": "docs: plan managed orchestration cleanup preparation",
    "preCommitHead": "584c30fb1",
    "stage": "commit_pending",
    "taskId": "managed-orchestration-cleanup-prep.phase1.intake.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Diagram_Modules_Managed_Orchestration_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase1_Contract_Bootstrap_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase2_Contract_Review_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase3_4_Materialization_And_User_Return_Open_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Managed_Orchestration_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`
  - `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`
- Только этот список является источником документов для восстановления контекста текущего planning cycle.

## Execution Rules

- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`, кроме явно no-commit user workflow tasks.
- Commit выполняется через `npm run plan:commit -- "<expected commit message>"`.
- Этот scope является planning/documentation intake: код оркестратора не менять.
- Следующий implementation `todo-plan.md` создается только после пользовательского acceptance этого cleanup planning document.

## Phase 1 — Cleanup Preparation Planning Intake (owner: Codex, updated: 2026-05-14)

### Stream: Cleanup Planning Source

1. [DONE] `managed-orchestration-cleanup-prep.phase1.intake.task1` Create the cleanup preparation planning source for removing legacy managed orchestration ownership before the new cluster implementation starts, and register it in the docs index (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan managed orchestration cleanup preparation`).
2. [PENDING] Git Commit: `docs: plan managed orchestration cleanup preparation` (hash: TBD)

## Phase 2 — User Planning Acceptance (owner: User, updated: 2026-05-14)

### Stream: Cleanup Planning Review

3. [TODO] `managed-orchestration-cleanup-prep.phase2.user-acceptance.task1` User reviews the cleanup preparation planning source and either accepts it as the source for the next implementation todo-plan or requests revisions (scope: user workflow; no commit expected).

## Phase 3 — Scope Closeout (owner: Codex, updated: 2026-05-14)

### Stream: Close Planning Intake

4. [TODO] `managed-orchestration-cleanup-prep.phase3.closeout.task1` Archive or close this planning intake after explicit user acceptance and prepare for the next implementation todo-plan (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md`; expected commit: `docs: close managed orchestration cleanup planning intake`).
5. [TODO] Git Commit: `docs: close managed orchestration cleanup planning intake` (hash: TBD)
6. [TODO] `managed-orchestration-cleanup-prep.phase3.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: chat/process observation only; no commit expected).
