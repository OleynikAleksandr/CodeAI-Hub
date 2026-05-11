# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-step-orchestration-plans-revision",
  "branch": "main",
  "baseHead": "5f596b7d9",
  "lastRecordedCommit": "5f596b7d9",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/README.md",
  "currentTaskId": "managed-step-orchestration.phase0.reset.task1",
  "expectedCommitMessage": "docs: reset managed workflow step orchestration plan",
  "debt": {
    "expectedCommitMessage": "docs: reset managed workflow step orchestration plan",
    "preCommitHead": "5f596b7d9",
    "stage": "commit_pending",
    "taskId": "managed-step-orchestration.phase0.reset.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/README.md`
- **Stopped previous scope snapshot:** `doc/TODO/Archive/todo-plan-stopped-application-skeleton-phase-b-orchestration-implementation-2026-05-11.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Workspace_Lifecycle_From_Diagram_Modules.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md`
  - `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`
- Only this Context Pack is the recovery source for the current planning cycle.

## Execution Rules

- This is a planning/documentation reset scope, not a release-build scope.
- Do not run release build scripts in this scope.
- Do not revive the stopped Application Skeleton v1.2.227 hot-fix plan.
- Keep each microtask to a small tracked-document surface; if the `Plans/` revision grows, split it before committing.
- Every provider-visible Core correction turn in future managed-step designs must be represented as a tracked managed microtask with a paired `Git Commit:` item.
- `Phase 4` for managed documentation steps is a post-completion user-return revision loop, not a handoff anchor.

## Phase 0 - Stop Previous Scope And Open New Planning Scope (owner: Codex, updated: 2026-05-11)

### Stream: Planning Reset

1. [DONE] `managed-step-orchestration.phase0.reset.task1` Stop the expanded Application Skeleton implementation plan without marking the unfinished retest as DONE, preserve a blocked/superseded archive snapshot, and open this new planning scope for managed step orchestration scenario documents. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/todo-plan-stopped-application-skeleton-phase-b-orchestration-implementation-2026-05-11.md`; expected commit: `docs: reset managed workflow step orchestration plan`).
2. [PENDING] Git Commit: `docs: reset managed workflow step orchestration plan` (hash: TBD)

## Phase 1 - Plans Folder Revision And Step Scenarios (owner: Codex, updated: 2026-05-11)

### Stream: Managed Step Orchestration Planning Docs

3. [TODO] `managed-step-orchestration.phase1.scenarios.task1` Create `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/` and draft the two active scenario documents for `Diagram Modules` and `Application Skeleton`, including the managed correction-turn microtask invariant and post-completion user-return revision loop. (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/**`; expected commit: `docs: draft managed step orchestration scenarios`).
4. [TODO] Git Commit: `docs: draft managed step orchestration scenarios` (hash: TBD)
5. [TODO] `managed-step-orchestration.phase1.rehome.task1` Move still-useful managed workflow planning sources from the top-level `Plans/` folder into `Managed_Step_Orchestration/` so active step-orchestration planning has one folder. (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workspace_Lifecycle_From_Diagram_Modules.md, doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/**`; expected commit: `docs: group managed workflow lifecycle planning docs`).
6. [TODO] Git Commit: `docs: group managed workflow lifecycle planning docs` (hash: TBD)
7. [TODO] `managed-step-orchestration.phase1.rehome.task2` Move the still-useful Application Skeleton architecture baseline into `Managed_Step_Orchestration/` and delete the superseded Phase B orchestration document that drove the wrong static phase model. (scope: `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Phase_B_Orchestration.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/**`; expected commit: `docs: replace superseded application skeleton orchestration plan`).
8. [TODO] Git Commit: `docs: replace superseded application skeleton orchestration plan` (hash: TBD)
9. [TODO] `managed-step-orchestration.phase1.index.task1` Update planning navigation so `Docs_Index.md` and `Plans/README.md` point to the new managed step orchestration folder and no longer list deleted top-level planning docs as active. (scope: `doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/README.md`; expected commit: `docs: index managed step orchestration planning folder`).
10. [TODO] Git Commit: `docs: index managed step orchestration planning folder` (hash: TBD)

## Phase 2 - Documentation Verification (owner: Codex, updated: 2026-05-11)

### Stream: Plan And Link Checks

11. [TODO] `managed-step-orchestration.phase2.verify.task1` Run `npm run plan:validate` and targeted documentation/link diagnostics needed for the moved/deleted planning paths; record evidence and any residual risk in this plan. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record managed step orchestration planning verification`).
12. [TODO] Git Commit: `docs: record managed step orchestration planning verification` (hash: TBD)

## Phase 3 - User Workflow Acceptance Testing (owner: user, updated: 2026-05-11)

### Stream: Scenario Review

13. [TODO] `managed-step-orchestration.phase3.acceptance.task1` User reviews the `Diagram Modules` and `Application Skeleton` scenario documents and confirms whether they match the intended managed-step lifecycle before implementation planning begins. (scope: chat/process observation only; no commit required).

## Phase 4 - Scope Closeout (owner: Codex, updated: 2026-05-11)

### Stream: Closeout After Acceptance

14. [TODO] `managed-step-orchestration.phase4.closeout.task1` After explicit user acceptance, archive this plan, decide final disposition for the `Managed_Step_Orchestration` planning documents, update `Docs_Index.md` if needed, and leave active state terminal `NONE`. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/**`; expected commit: `docs: close managed step orchestration planning scope`).
15. [TODO] Git Commit: `docs: close managed step orchestration planning scope` (hash: TBD)
16. [TODO] `managed-step-orchestration.phase4.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
