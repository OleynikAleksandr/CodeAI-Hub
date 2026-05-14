# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-orchestration-redesign-planning-2026-05-14",
  "branch": "main",
  "baseHead": "23f7c2298",
  "lastRecordedCommit": "23f7c2298",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning_RU.md",
  "currentTaskId": "managed-orchestration.phase1.intake.task1",
  "expectedCommitMessage": "docs: plan managed workflow orchestration redesign",
  "debt": {
    "expectedCommitMessage": "docs: plan managed workflow orchestration redesign",
    "preCommitHead": "23f7c2298",
    "stage": "commit_pending",
    "taskId": "managed-orchestration.phase1.intake.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`
  - `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase1_Contract_Bootstrap_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Execution Rules

- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация и отдельный `Git Commit: ...`.
- Commit выполняется через `npm run plan:commit -- "<expected commit message>"`.
- Этот scope является planning/design scope: код оркестратора не менять, пока пользователь не примет фазовые сценарии.
- Release build в этом scope не выполняется без отдельного явного подтверждения пользователя.

## Phase 1 — Planning Intake (owner: Codex, updated: 2026-05-14)

### Stream: Scope Registration

1. [DONE] `managed-orchestration.phase1.intake.task1` Reopen Managed Step Orchestration planning folder, register the new orchestration redesign scope in the docs index, and create this active todo-plan (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/README.md`; expected commit: `docs: plan managed workflow orchestration redesign`).
2. [PENDING] Git Commit: `docs: plan managed workflow orchestration redesign` (hash: TBD)

## Phase 2 — Baseline Planning Artifacts (owner: Codex, updated: 2026-05-14)

### Stream: Cluster Planning Documents

3. [TODO] `managed-orchestration.phase2.cluster-docs.task1` Add the managed workflow orchestration cluster planning documents in English and Russian for durable discussion context after compaction (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning_RU.md`; expected commit: `docs: draft managed workflow orchestration cluster planning`).
4. [TODO] Git Commit: `docs: draft managed workflow orchestration cluster planning` (hash: TBD)

### Stream: Application Skeleton Phase 1

5. [TODO] `managed-orchestration.phase2.application-skeleton-phase1.task1` Add the accepted draft planning spec for Application Skeleton Phase 1 Contract Bootstrap, including Core validation, handoff, repair, blocker, and simplified watchdog behavior (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase1_Contract_Bootstrap_Planning_RU.md`; expected commit: `docs: specify application skeleton phase 1 orchestration`).
6. [TODO] Git Commit: `docs: specify application skeleton phase 1 orchestration` (hash: TBD)

## Phase 3 — Application Skeleton Phase 2 Planning (owner: Codex + User, updated: 2026-05-14)

### Stream: Review Phase Discussion

7. [TODO] `managed-orchestration.phase3.application-skeleton-phase2-discussion.task1` Continue dialog-only discussion of Application Skeleton Phase 2 User-Led Review semantics until user accepts the scenario model (scope: chat/process observation only; expected commit: not required).
8. [TODO] `managed-orchestration.phase3.application-skeleton-phase2-doc.task1` Write the Application Skeleton Phase 2 Contract Review planning spec after the scenario is accepted (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase2_Contract_Review_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: specify application skeleton phase 2 orchestration`).
9. [TODO] Git Commit: `docs: specify application skeleton phase 2 orchestration` (hash: TBD)

## Phase 4 — Further Managed Step Phase Planning (owner: Codex + User, updated: 2026-05-14)

### Stream: Remaining Phase Specs

10. [TODO] `managed-orchestration.phase4.remaining-phases.task1` Add follow-up phase specs for Application Skeleton Phase 3/4 and the parallel Diagram Modules / Quality Gates scenarios once each branch is discussed and accepted (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/**, doc/TODO/todo-plan.md`; expected commit: `docs: extend managed orchestration phase scenarios`).
11. [TODO] Git Commit: `docs: extend managed orchestration phase scenarios` (hash: TBD)

## Phase 5 — Tooling Verification (owner: Codex, updated: 2026-05-14)

### Stream: Planning Package Verification

12. [TODO] `managed-orchestration.phase5.verify.task1` Validate the planning package, links, and active plan consistency before implementation planning starts (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: verify managed orchestration planning package`).
13. [TODO] Git Commit: `docs: verify managed orchestration planning package` (hash: TBD)

## Phase 6 — User Planning Acceptance (owner: User, updated: 2026-05-14)

### Stream: Scenario Acceptance

14. [TODO] `managed-orchestration.phase6.user-acceptance.task1` User reviews and accepts the managed orchestration planning package before implementation microtasks are created (scope: user workflow; expected commit: `docs: accept managed orchestration planning package`).
15. [TODO] Git Commit: `docs: accept managed orchestration planning package` (hash: TBD)

## Phase 7 — Scope Closeout (owner: Codex, updated: 2026-05-14)

### Stream: Close Plan After User Acceptance

16. [TODO] `managed-orchestration.phase7.closeout.task1` Archive this planning scope or convert it into an implementation todo-plan after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed orchestration planning scope`).
17. [TODO] Git Commit: `docs: close managed orchestration planning scope` (hash: TBD)
18. [TODO] `managed-orchestration.phase7.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: chat/process observation only; expected commit: not required).
