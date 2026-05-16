# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "solidworks-workflow-docs-relevance-audit-2026-05-16",
  "branch": "codex/managed-orchestration-rewrite",
  "baseHead": "fe3743d0a",
  "lastRecordedCommit": "fe3743d0a",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Documentation_Relevance_Audit_2026-05-16.md",
  "currentTaskId": "docs-relevance-audit.phase0.plan.task1",
  "expectedCommitMessage": "docs: open solidworks workflow docs relevance audit",
  "debt": {
    "expectedCommitMessage": "docs: open solidworks workflow docs relevance audit",
    "preCommitHead": "fe3743d0a",
    "stage": "commit_pending",
    "taskId": "docs-relevance-audit.phase0.plan.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Documentation_Relevance_Audit_2026-05-16.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Execution Rules

- Required reading before each docs fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Scope: audit `doc/SolidWorks-WorkFlow/**` against current code and the completed managed workflow fixes through release `1.2.274`.
- Each implementation task touches no more than 3 files unless the task is an inventory-only `doc/TODO/todo-plan.md` evidence update.
- Every tracked docs change is committed through `npm run plan:commit -- "<expected commit message>"`.
- Do not archive active future planning docs that describe unimplemented/deferred future work; only completed artifacts from the managed workflow implementation wave are moved or marked archived.
- Release build is out of scope. This is documentation and plan/archive hygiene only.

## Phase 0 — Audit Intake (owner: Codex, updated: 2026-05-16)

### Stream: Scope Registration

1. [DONE] `docs-relevance-audit.phase0.plan.task1` Create the planning source and active todo-plan for the full SolidWorks-WorkFlow documentation relevance audit after the accepted managed workflow release (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Documentation_Relevance_Audit_2026-05-16.md`; expected commit: `docs: open solidworks workflow docs relevance audit`).
2. [PENDING] Git Commit: `docs: open solidworks workflow docs relevance audit` (hash: TBD)

## Phase 1 — Inventory And Relevance Findings (owner: Codex, updated: 2026-05-16)

### Stream: Repository-To-Docs Audit

3. [TODO] `docs-relevance-audit.phase1.inventory.task1` Run repository-wide docs inventory and stale-reference scans, then record findings and disposition decisions before edits (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record solidworks workflow docs audit findings`).
4. [TODO] Git Commit: `docs: record solidworks workflow docs audit findings` (hash: TBD)

## Phase 2 — Active SSOT Relevance Repairs (owner: Codex, updated: 2026-05-16)

### Stream: System And Workflow SSOT

5. [TODO] `docs-relevance-audit.phase2.system.task1` Synchronize core system/workflow SSOT docs with the implemented managed workflow state, Core-owned artifact truth, and release `1.2.274` behavior (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`; expected commit: `docs: sync workflow system ssot with managed runtime`).
6. [TODO] Git Commit: `docs: sync workflow system ssot with managed runtime` (hash: TBD)

### Stream: Cluster Ownership SSOT

7. [TODO] `docs-relevance-audit.phase2.clusters.task1` Synchronize cluster docs so Core/Managed Workflow own parser, validation, prompts, read-model, and commit lifecycle while Project Manager remains a replaceable client projection (scope: `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`; expected commit: `docs: sync cluster ownership contracts`).
8. [TODO] Git Commit: `docs: sync cluster ownership contracts` (hash: TBD)

## Phase 3 — Contracts And Planning Disposition (owner: Codex, updated: 2026-05-16)

### Stream: Active Contracts

9. [TODO] `docs-relevance-audit.phase3.contracts.task1` Promote implemented scenario/contract details into active contracts and mark suspended historical contracts correctly (scope: `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md, doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md, doc/SolidWorks-WorkFlow/Contracts/Workflow_Revision_Graph.md`; expected commit: `docs: sync active workflow contracts with managed runtime`).
10. [TODO] Git Commit: `docs: sync active workflow contracts with managed runtime` (hash: TBD)

### Stream: Plans And Index

11. [TODO] `docs-relevance-audit.phase3.plans.task1` Move or mark completed planning artifacts and refresh navigation docs so active Plans contain only genuinely open future scopes (scope: `doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: archive completed workflow planning artifacts`).
12. [TODO] Git Commit: `docs: archive completed workflow planning artifacts` (hash: TBD)

## Phase 4 — Verification And Closeout (owner: Codex, updated: 2026-05-16)

### Stream: Documentation Verification

13. [TODO] `docs-relevance-audit.phase4.verify.task1` Run docs navigation/stale-reference verification and plan validation, then record remaining deferred/future-doc boundaries (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify solidworks workflow docs audit`).
14. [TODO] Git Commit: `docs: verify solidworks workflow docs audit` (hash: TBD)

### Stream: Scope Closeout

15. [TODO] `docs-relevance-audit.phase4.closeout.task1` After verification, archive this documentation-audit plan and planning source if no follow-up implementation scope remains open (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close solidworks workflow docs relevance audit`).
16. [TODO] Git Commit: `docs: close solidworks workflow docs relevance audit` (hash: TBD)
17. [TODO] `docs-relevance-audit.phase4.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
