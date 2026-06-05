# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-formal-verification-phase-2026-06-05",
  "branch": "main",
  "baseHead": "2e7f35a14",
  "lastRecordedCommit": "493285524",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md",
  "currentTaskId": "phase2.stream1.task1",
  "expectedCommitMessage": "feat: add quality gates formal verification phase model",
  "debt": {
    "expectedCommitMessage": "feat: add quality gates formal verification phase model",
    "preCommitHead": "493285524",
    "stage": "commit_pending",
    "taskId": "phase2.stream1.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- Required reading before each implementation fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Keep this scope limited to the Quality Gates Baseline managed lifecycle and formal verification before persistent return.
- Do not edit `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md` in this cycle.
- Each implementation task must touch no more than 3 files. If more files are needed, split the task before editing.
- Commit every completed implementation task through `npm run plan:commit -- "<expected commit message>"`.
- Do not run release packaging unless the user explicitly confirms a release build.

## Phase 1 - Quality Gates Formal Verification Planning (owner: Codex, updated: 2026-06-05)

### Stream: Plan Intake

1. [DONE] `phase1.stream1.task1` Record the accepted architecture direction for adding a formal Quality Gates verification phase before persistent return (scope: `doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan quality gates formal verification phase`).
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan quality gates formal verification phase` (hash: 493285524)

## Phase 2 - Stage Plan Lifecycle (owner: Codex, updated: 2026-06-05)

### Stream: Phase Model And Plan Generation

3. [DONE] `phase2.stream1.task1` Add the Quality Gates formal verification task id, Phase 4 plan append path, and Phase 5 persistent return numbering (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts`; expected commit: `feat: add quality gates formal verification phase model`).
4. [PENDING] `phase2.stream1.commit1` Git Commit: `feat: add quality gates formal verification phase model` (hash: TBD)

### Stream: Phase Prompting

5. [TODO] `phase2.stream2.task1` Add the Core continuation prompt for Phase 4 verification and update integration/repair wording so integration no longer claims terminal completion (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts, packages/core/src/templates/quality-gates-bundled-templates.test.ts, packages/agents/quality-gates-agent/assets/quality-gates-prompt.md`; expected commit: `feat: prompt quality gates formal verification`).
6. [TODO] `phase2.stream2.commit1` Git Commit: `feat: prompt quality gates formal verification` (hash: TBD)

## Phase 3 - Core Verification Contract (owner: Codex, updated: 2026-06-05)

### Stream: Hook Command Resolution

7. [TODO] `phase3.stream1.task1` Add Core-owned static resolution for hook `npm run <script>` commands and tests that reject missing package scripts (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-formal-verification-runner.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-formal-verification-runner.test.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts`; expected commit: `feat: validate quality gate hook commands`).
8. [TODO] `phase3.stream1.commit1` Git Commit: `feat: validate quality gate hook commands` (hash: TBD)

### Stream: Verification Evidence

9. [TODO] `phase3.stream2.task1` Extend Quality Gates JSON validation for `verificationState` and command evidence, including stale or missing evidence diagnostics (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator-runner-evidence.test.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-consistency-validator.ts`; expected commit: `feat: require quality gates verification evidence`).
10. [TODO] `phase3.stream2.commit1` Git Commit: `feat: require quality gates verification evidence` (hash: TBD)

## Phase 4 - Orchestration And Handoff (owner: Codex, updated: 2026-06-05)

### Stream: Managed Turn Flow

11. [TODO] `phase4.stream1.task1` Route successful Phase 3 integration into Phase 4 verification continuation, then route verified Phase 4 output into Phase 5 persistent return (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/quality-gates-review-decision-flow.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.ts`; expected commit: `feat: gate quality gates completion on formal verification`).
12. [TODO] `phase4.stream1.commit1` Git Commit: `feat: gate quality gates completion on formal verification` (hash: TBD)

### Stream: Read Model And Bootstrap Guard

13. [TODO] `phase4.stream2.task1` Keep Project Manager/read-model and Development Tree unlock blocked until Quality Gates verification is valid, not only integrated (scope: `packages/core/src/remote-bridge/handlers/quality-gates-progress.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`; expected commit: `fix: require verified quality gates before development tree unlock`).
14. [TODO] `phase4.stream2.commit1` Git Commit: `fix: require verified quality gates before development tree unlock` (hash: TBD)

## Phase 5 - Documentation Sync (owner: Codex, updated: 2026-06-05)

### Stream: SSOT Updates

15. [TODO] `phase5.stream1.task1` Update canonical workflow/managed orchestration docs for the new Quality Gates Phase 4/Phase 5 lifecycle and verification authority (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: document quality gates formal verification lifecycle`).
16. [TODO] `phase5.stream1.commit1` Git Commit: `docs: document quality gates formal verification lifecycle` (hash: TBD)

## Phase 6 - Tooling Verification (owner: Codex, updated: 2026-06-05)

### Stream: Targeted Verification

17. [TODO] `phase6.stream1.task1` Run targeted tests for Quality Gates orchestration plus `npm run plan:validate`, `npm run build --workspace=@codeai-hub/core`, and any failing diagnostic commands required by the touched files (scope: verification commands and `doc/TODO/todo-plan.md`; expected commit: none).

## Phase 7 - User Workflow Acceptance Testing (owner: User, updated: 2026-06-05)

### Stream: User Acceptance

18. [TODO] `phase7.stream1.task1` Hand the implemented Quality Gates formal verification lifecycle back for user workflow acceptance and wait for explicit acceptance or failure report (scope: user workflow acceptance; expected commit: none).

## Phase 8 - Scope Closeout (owner: Codex, updated: 2026-06-05)

### Stream: Closeout

19. [TODO] `phase8.stream1.task1` Close this scope only after explicit user acceptance; archive the active plan and dispose the planning source without touching the Development Tree branch workflow architecture document (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md`; expected commit: `docs: close quality gates formal verification scope`).
20. [TODO] `phase8.stream1.commit1` Git Commit: `docs: close quality gates formal verification scope` (hash: TBD)
