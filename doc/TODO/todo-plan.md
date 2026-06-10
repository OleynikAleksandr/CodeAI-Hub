# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "orchestrator-stop-gate-simplification-2026-06-10",
  "branch": "main",
  "baseHead": "8be648655",
  "lastRecordedCommit": "8be648655",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md",
  "currentTaskId": "orchestrator-stop-gate.phase1.audit.task1",
  "expectedCommitMessage": "docs: audit orchestrator stop gates",
  "debt": {
    "expectedCommitMessage": "docs: audit orchestrator stop gates",
    "preCommitHead": "8be648655",
    "stage": "commit_pending",
    "taskId": "orchestrator-stop-gate.phase1.audit.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md`
- **Related active planning documents:**
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md`
  - `doc/TODO/Archive/todo-plan-superseded-development-tree-cluster-contract-subagent-orchestration-2026-06-10.md`
- **Code surfaces that influence this plan:**
  - `packages/core/src/workflow/boundary/`
  - `packages/core/src/managed-workflow-orchestration/`
  - `packages/core/src/remote-bridge/handlers/`
  - `src/client/project-manager/`
  - `scripts/plan-orchestrator/`
- Only this list is the recovery context source for this execution cycle.

## Execution Rules

- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Keep `DevelopmentTree_BranchWorkflow_Architecture.md` and `DevelopmentTree_ProductPartSubagentOrchestration.md` active; update them when the new stop-gate policy changes Development Tree architecture, but do not archive or delete them in this scope.
- Each implementation task must touch no more than 3 files/packages.
- Every implementation task is followed by a separate `Git Commit: ...` item.
- Use `npm run plan:commit -- "<expected commit message>"` for normal commit workflow.
- Do not bypass Husky hooks or quality gates.
- New behavior must simplify user-facing workflow stops. A blocker may remain only if continuing would risk final product correctness, Git safety, data loss, merge quality, or irreversible user intent.
- Release build is not automatic. Ask the user before release notes, version bump, `build-all.sh`, or `build-release.sh`.

## Phase 1 - Stop-Gate Audit (owner: Codex, updated: 2026-06-10)

### Stream: Orchestrator Blocker Inventory

1. [DONE] `orchestrator-stop-gate.phase1.audit.task1` Record the new stop-gate policy, archive the superseded cluster-contract retest plan snapshot, and open the active blocker audit plan with links to all influencing planning/system documents (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md, doc/TODO/Archive/todo-plan-superseded-development-tree-cluster-contract-subagent-orchestration-2026-06-10.md, doc/TODO/todo-plan.md`; expected commit: `docs: audit orchestrator stop gates`).
2. [PENDING] Git Commit: `docs: audit orchestrator stop gates` (hash: TBD)
3. [TODO] `orchestrator-stop-gate.phase1.audit.task2` Audit hard blocker call sites across managed workflow controllers, workflow boundary Git, Development Tree sub-agent controllers, Project Manager lock state, and plan-orchestrator commit boundaries; classify each blocker as keep, auto-fix, warning, or repair-prompt (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`; expected commit: `docs: classify orchestrator blocker policy`).
4. [TODO] Git Commit: `docs: classify orchestrator blocker policy` (hash: TBD)

## Phase 2 - Dirty Git Boundary Simplification (owner: Codex, updated: 2026-06-10)

### Stream: Workflow-Owned Auto Commit

5. [TODO] `orchestrator-stop-gate.phase2.dirty-git.task1` Replace user-facing dirty Git stops for workflow-owned managed step changes with deterministic Core auto-commit or internal repair where ownership is known (scope: `packages/core/src/workflow/boundary/workflow-step-commit-facade.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts, packages/core/src/workflow/boundary/workflow-boundary-facade.ts`; expected commit: `fix: auto-close workflow dirty git boundaries`).
6. [TODO] Git Commit: `fix: auto-close workflow dirty git boundaries` (hash: TBD)
7. [TODO] `orchestrator-stop-gate.phase2.dirty-git.task2` Add regression coverage for Quality Gates restart with workflow-owned script changes so Core commits and continues instead of asking the user how to handle dirty files (scope: `packages/core/src/managed-workflow-orchestration/quality-gates, packages/core/src/workflow/boundary, doc/TODO/todo-plan.md`; expected commit: `test: verify workflow dirty git auto commit`).
8. [TODO] Git Commit: `test: verify workflow dirty git auto commit` (hash: TBD)

## Phase 3 - Validation Pressure Reduction (owner: Codex, updated: 2026-06-10)

### Stream: Hard Gate To Warning Conversion

9. [TODO] `orchestrator-stop-gate.phase3.validators.task1` Downgrade non-critical managed artifact validation failures to warnings or repair prompts where Core does not need the rejected field to compute the next workflow action (scope: `packages/core/src/managed-workflow-orchestration/quality-gates, packages/core/src/managed-workflow-orchestration/application-skeleton, packages/core/src/managed-workflow-orchestration/diagram-modules`; expected commit: `fix: downgrade noncritical managed validators`).
10. [TODO] Git Commit: `fix: downgrade noncritical managed validators` (hash: TBD)
11. [TODO] `orchestrator-stop-gate.phase3.development-tree.task1` Apply the same hard-gate policy to Product Part and Cluster/Module contract flows: Core-required machine fields stay hard, agent-readable prose and recoverable contract detail issues become warnings or revision prompts (scope: `packages/core/src/remote-bridge/handlers/product-part-*, packages/core/src/remote-bridge/handlers/cluster-contract-*, doc/TODO/todo-plan.md`; expected commit: `fix: soften development tree contract blockers`).
12. [TODO] Git Commit: `fix: soften development tree contract blockers` (hash: TBD)

## Phase 4 - Project Manager Lock Semantics (owner: Codex, updated: 2026-06-10)

### Stream: Truthful User Input State

13. [TODO] `orchestrator-stop-gate.phase4.ui-lock.task1` Ensure Project Manager shows "agent is working" only during an active provider/native turn and releases the input for Core validation, review, warning, repair-ready, and blocked bookkeeping states (scope: `src/client/project-manager/components/layout, src/client/project-manager/services, packages/core/src/remote-bridge/handlers`; expected commit: `fix: release input on core gates`).
14. [TODO] Git Commit: `fix: release input on core gates` (hash: TBD)
15. [TODO] `orchestrator-stop-gate.phase4.ui-lock-test.task1` Add targeted Project Manager/Core stream tests for cluster worktree sessions, managed review acceptance, and Quality Gates boundary messages so stale working locks cannot regress (scope: `src/client/project-manager, packages/core/src/remote-bridge/handlers, doc/TODO/todo-plan.md`; expected commit: `test: verify core gate input release`).
16. [TODO] Git Commit: `test: verify core gate input release` (hash: TBD)

## Phase 5 - Documentation Sync (owner: Codex, updated: 2026-06-10)

### Stream: Architecture Update

17. [TODO] `orchestrator-stop-gate.phase5.docs.task1` Synchronize the accepted stop-gate policy into the active Development Tree architecture documents and Core/Project Manager SSOT docs (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md, doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`; expected commit: `docs: describe simplified orchestrator stop gates`).
18. [TODO] Git Commit: `docs: describe simplified orchestrator stop gates` (hash: TBD)
19. [TODO] `orchestrator-stop-gate.phase5.pm-docs.task1` Document Project Manager lock/projection behavior for Core gates and attached worktree runtime roots (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: describe truthful core gate ui state`).
20. [TODO] Git Commit: `docs: describe truthful core gate ui state` (hash: TBD)

## Phase 6 - Tooling Verification (owner: Codex, updated: 2026-06-10)

### Stream: Targeted Verification

21. [TODO] `orchestrator-stop-gate.phase6.verify.task1` Run targeted Core and Project Manager tests/builds for dirty Git auto-commit, softened validators, Development Tree sub-agent flow, projected worktree sessions, and UI lock release (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify orchestrator stop gate simplification`).
22. [TODO] Git Commit: `test: verify orchestrator stop gate simplification` (hash: TBD)

## Phase 7 - Release Build Confirmation (owner: Codex, updated: 2026-06-10)

### Stream: Release Permission

23. [TODO] `orchestrator-stop-gate.phase7.release-confirm.task1` Ask the user for explicit confirmation before preparing release notes, bumping versions, running `build-all.sh`, or packaging VSIX (scope: user workflow; expected commit: none).

### Stream: Release After Confirmation

24. [TODO] `orchestrator-stop-gate.phase7.release-notes.task1` Prepare release notes for the stop-gate simplification release after explicit confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare stop gate simplification release notes`).
25. [TODO] Git Commit: `docs: prepare stop gate simplification release notes` (hash: TBD)
26. [TODO] `orchestrator-stop-gate.phase7.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare stop gate simplification release artifacts`).
27. [TODO] Git Commit: `build: prepare stop gate simplification release artifacts` (hash: TBD)
28. [TODO] `orchestrator-stop-gate.phase7.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package stop gate simplification vsix release`).
29. [TODO] Git Commit: `build: package stop gate simplification vsix release` (hash: TBD)

## Phase 8 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-10)

### Stream: FinderWidget Retest

30. [TODO] `orchestrator-stop-gate.phase8.user-retest.task1` User installs the release and retests the workflow from Quality Gates Baseline through Product Part, cluster-contract sub-agent creation, Clear/Undo rebootstrap, dirty Git auto-commit, and Project Manager dialog/input behavior (scope: user workflow; expected commit: none).

## Phase 9 - Scope Closeout (owner: Codex, updated: 2026-06-10)

### Stream: Plan And Planning Doc Disposition

31. [TODO] `orchestrator-stop-gate.phase9.closeout.task1` After explicit user acceptance, archive the completed todo plan and decide final disposition for the stop-gate planning document without archiving the two active Development Tree planning documents (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md`; expected commit: `docs: close orchestrator stop gate simplification plan`).
32. [TODO] Git Commit: `docs: close orchestrator stop gate simplification plan` (hash: TBD)
