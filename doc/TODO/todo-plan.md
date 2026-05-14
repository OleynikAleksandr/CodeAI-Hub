# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-orchestration-redesign-planning-2026-05-14",
  "branch": "main",
  "baseHead": "23f7c2298",
  "lastRecordedCommit": "6833b7f90",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning_RU.md",
  "currentTaskId": "managed-orchestration.phase4.diagram-modules-doc.task1",
  "expectedCommitMessage": "docs: specify diagram modules orchestration scenario",
  "debt": {
    "expectedCommitMessage": "docs: specify diagram modules orchestration scenario",
    "preCommitHead": "6833b7f90",
    "stage": "commit_pending",
    "taskId": "managed-orchestration.phase4.diagram-modules-doc.task1"
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
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase2_Contract_Review_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase3_4_Materialization_And_User_Return_Open_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Diagram_Modules_Managed_Orchestration_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Managed_Orchestration_Planning_RU.md`
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
2. [DONE] Git Commit: `docs: plan managed workflow orchestration redesign` (hash: 011614cd4)

## Phase 2 — Baseline Planning Artifacts (owner: Codex, updated: 2026-05-14)

### Stream: Cluster Planning Documents

3. [DONE] `managed-orchestration.phase2.cluster-docs.task1` Add the managed workflow orchestration cluster planning documents in English and Russian for durable discussion context after compaction (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning_RU.md`; expected commit: `docs: draft managed workflow orchestration cluster planning`).
4. [DONE] Git Commit: `docs: draft managed workflow orchestration cluster planning` (hash: aef44c7a2)

### Stream: Application Skeleton Phase 1

5. [DONE] `managed-orchestration.phase2.application-skeleton-phase1.task1` Add the accepted draft planning spec for Application Skeleton Phase 1 Contract Bootstrap, including Core validation, handoff, repair, blocker, and simplified watchdog behavior (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase1_Contract_Bootstrap_Planning_RU.md`; expected commit: `docs: specify application skeleton phase 1 orchestration`).
6. [DONE] Git Commit: `docs: specify application skeleton phase 1 orchestration` (hash: f07bce8d8)

## Phase 3 — Application Skeleton Phase 2 Planning (owner: Codex + User, updated: 2026-05-14)

### Stream: Review Phase Discussion

7. [DONE] `managed-orchestration.phase3.application-skeleton-phase2-discussion.task1` Continue dialog-only discussion of Application Skeleton Phase 2 User-Led Review semantics until user accepts the scenario model (scope: chat/process observation only; expected commit: not required). Result: user accepted the conditional review-task model where each user review cycle owns one review task and its paired outcome commit line.
8. [DONE] `managed-orchestration.phase3.application-skeleton-phase2-doc.task1` Write the Application Skeleton Phase 2 Contract Review planning spec after the scenario is accepted (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase2_Contract_Review_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: specify application skeleton phase 2 orchestration`).
9. [DONE] Git Commit: `docs: specify application skeleton phase 2 orchestration` (hash: 07bc2f570)

## Phase 4 — Further Managed Step Phase Planning (owner: Codex + User, updated: 2026-05-14)

### Stream: Phase 2 Clarification

10. [DONE] `managed-orchestration.phase4.application-skeleton-phase2-handoff-clarification.task1` Clarify at the beginning of the Application Skeleton Phase 2 planning spec that Core sends a user-visible instruction message and the user input field is available when review starts (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase2_Contract_Review_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: clarify application skeleton phase 2 user handoff`).
11. [DONE] Git Commit: `docs: clarify application skeleton phase 2 user handoff` (hash: 3509f85f6)

### Stream: Phase 1 Handoff Clarification

12. [DONE] `managed-orchestration.phase4.application-skeleton-phase1-handoff-clarification.task1` Clarify that the successful end of Application Skeleton Phase 1 writes the Phase 2 handoff message into the Project Manager dialog / persistent session and leaves the user input field available (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase1_Contract_Bootstrap_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: clarify application skeleton phase 1 user handoff`).
13. [DONE] Git Commit: `docs: clarify application skeleton phase 1 user handoff` (hash: d3909ddf6)

### Stream: Application Skeleton Phase 3

14. [DONE] `managed-orchestration.phase4.application-skeleton-phase3-doc.task1` Write the initial Application Skeleton Phase 3 Materialization planning spec, including accepted/rejected attempt commits, Core validation, Phase 4 creation, and the user-visible completion message; renamed into the Phase 3/4 boundary document by task 16 (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase3_4_Materialization_And_User_Return_Open_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: specify application skeleton phase 3 orchestration`).
15. [DONE] Git Commit: `docs: specify application skeleton phase 3 orchestration` (hash: 7bc4fe313)

### Stream: Application Skeleton Phase 3/4 Boundary

16. [DONE] `managed-orchestration.phase4.application-skeleton-phase3-4-boundary.task1` Rename the Application Skeleton Phase 3 planning document into a Phase 3/4 boundary document and limit Phase 4 to opening the persistent user-return mode with a localized Core message (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase3_Materialization_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase3_4_Materialization_And_User_Return_Open_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: fold application skeleton phase 4 opening into phase 3`).
17. [DONE] Git Commit: `docs: fold application skeleton phase 4 opening into phase 3` (hash: d4724feea)

### Stream: Reusable Phase Types

18. [DONE] `managed-orchestration.phase4.reusable-phase-types.task1` Define reusable Type A / Type B phase contracts in the managed workflow orchestration planning document and link Application Skeleton Phase 1 to Type A (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase1_Contract_Bootstrap_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: define managed orchestration phase types`).
19. [DONE] Git Commit: `docs: define managed orchestration phase types` (hash: 01986d601)
20. [DONE] `managed-orchestration.phase4.reusable-phase-types.task2` Link Application Skeleton Phase 2 and Phase 3/4 planning documents to the reusable Type B / Type A phase contracts (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase2_Contract_Review_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase3_4_Materialization_And_User_Return_Open_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: link application skeleton phases to phase types`).
21. [DONE] Git Commit: `docs: link application skeleton phases to phase types` (hash: 6833b7f90)

### Stream: Remaining Phase Specs

22. [DONE] `managed-orchestration.phase4.diagram-modules-doc.task1` Write the Diagram Modules managed orchestration scenario with Phase 1 Type A, Phase 2 Type B User-Led Review, and Phase 3 persistent return opening (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Diagram_Modules_Managed_Orchestration_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: specify diagram modules orchestration scenario`).
23. [PENDING] Git Commit: `docs: specify diagram modules orchestration scenario` (hash: TBD)
24. [TODO] `managed-orchestration.phase4.quality-gates-doc.task1` Write the Quality Gates managed orchestration scenario with Phase 1 Type A, Phase 2 Type B, Phase 3 accepted-only integration Type A, and Phase 4 persistent return opening (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Managed_Orchestration_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: specify quality gates orchestration scenario`).
25. [TODO] Git Commit: `docs: specify quality gates orchestration scenario` (hash: TBD)

## Phase 5 — Tooling Verification (owner: Codex, updated: 2026-05-14)

### Stream: Planning Package Verification

26. [TODO] `managed-orchestration.phase5.verify.task1` Validate the planning package, links, and active plan consistency before implementation planning starts (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: verify managed orchestration planning package`).
27. [TODO] Git Commit: `docs: verify managed orchestration planning package` (hash: TBD)

## Phase 6 — User Planning Acceptance (owner: User, updated: 2026-05-14)

### Stream: Scenario Acceptance

28. [TODO] `managed-orchestration.phase6.user-acceptance.task1` User reviews and accepts the managed orchestration planning package before implementation microtasks are created (scope: user workflow; expected commit: `docs: accept managed orchestration planning package`).
29. [TODO] Git Commit: `docs: accept managed orchestration planning package` (hash: TBD)

## Phase 7 — Scope Closeout (owner: Codex, updated: 2026-05-14)

### Stream: Close Plan After User Acceptance

30. [TODO] `managed-orchestration.phase7.closeout.task1` Archive this planning scope or convert it into an implementation todo-plan after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed orchestration planning scope`).
31. [TODO] Git Commit: `docs: close managed orchestration planning scope` (hash: TBD)
32. [TODO] `managed-orchestration.phase7.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: chat/process observation only; expected commit: not required).
