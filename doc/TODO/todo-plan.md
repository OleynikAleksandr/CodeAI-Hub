# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-restore-isolation-2026-06-10",
  "branch": "main",
  "baseHead": "df0341147",
  "lastRecordedCommit": "591ed5b3c",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md",
  "currentTaskId": "qg-restore-isolation.phase4.verify.task1",
  "expectedCommitMessage": "test: verify quality gates restore isolation",
  "debt": {
    "expectedCommitMessage": "test: verify quality gates restore isolation",
    "preCommitHead": "591ed5b3c",
    "stage": "commit_pending",
    "taskId": "qg-restore-isolation.phase4.verify.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md`
  - `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md`
  - `packages/agents/quality-gates-agent/assets/quality-gates-contract.md`
- **Code surfaces that influence this plan:**
  - `packages/core/src/managed-workflow-orchestration/quality-gates/`
  - `packages/core/src/templates/`
  - `packages/agents/quality-gates-agent/assets/`
- Only this list is the recovery context source for this execution cycle.

## Execution Rules

- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation task must touch no more than 3 files/packages.
- Every implementation task is followed by a separate `Git Commit: ...` item.
- Use `npm run plan:commit -- "<expected commit message>"` for normal commit workflow.
- Do not bypass Husky hooks or quality gates.
- Do not special-case `qg:restore`; the architectural rule is sequential workspace verification for every command that can mutate dependency/install state.
- Keep Quality Gates name-agnostic validation intact: `commands.<gate-id>.proposedCommand` remains the machine source of truth.
- Release build is not automatic. Ask the user before release notes, version bump, `build-all.sh`, or `build-release.sh`.

## Phase 1 - Planning Intake (owner: Codex, updated: 2026-06-10)

### Stream: Restore Isolation Scope

1. [DONE] `qg-restore-isolation.phase1.intake.task1` Open the active Quality Gates restore-isolation scope, add the planning source, and register it in Docs Index (scope: `doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan quality gates restore isolation`).
2. [DONE] Git Commit: `docs: plan quality gates restore isolation` (hash: 90f771ec6)

## Phase 2 - Sequential Verification Contract (owner: Codex, updated: 2026-06-10)

### Stream: Core Evidence Contract

3. [DONE] `qg-restore-isolation.phase2.evidence.task1` Require sequential execution metadata for verified Quality Gates Phase 4 evidence and add regression tests for missing/accepted sequential evidence (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-consistency-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-formal-verification-runner.test.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator-runner-evidence.test.ts`; expected commit: `fix: require sequential quality gates verification evidence`). Result: targeted Quality Gates tests (`npx tsx --test ...formal-verification-runner.test.ts ...validator-runner-evidence.test.ts`) passed 13/13; `npm run build --workspace=@codeai-hub/core` passed.
4. [DONE] Git Commit: `fix: require sequential quality gates verification evidence` (hash: 4f330636a)
5. [DONE] `qg-restore-isolation.phase2.diagnostics.task1` Update Quality Gates verification repair diagnostics to explain the sequential execution evidence contract and preferred JSON shape (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-diagnostics-explainer.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.phase-envelope.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: explain sequential quality gates evidence`). Result: targeted prompt diagnostics test (`npx tsx --test ...quality-gates-prompt-builder.phase-envelope.test.ts`) passed 2/2; Ultracite check passed for changed diagnostics files.
6. [DONE] Git Commit: `fix: explain sequential quality gates evidence` (hash: 3d13b207c)

### Stream: Provider Prompt Contract

7. [DONE] `qg-restore-isolation.phase2.prompts.task1` Embed the sequential formal verification contract into Core Phase 4 continuation/repair prompts and cover it with prompt tests (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.phase-envelope.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-repair-prompt-dispatch.ts`; expected commit: `fix: serialize quality gates verification prompts`). Result: Phase 4 repair and initial continuation prompts now share the sequential verification contract; targeted prompt test passed 3/3; Ultracite check passed for changed prompt files.
8. [DONE] Git Commit: `fix: serialize quality gates verification prompts` (hash: edfb5a605)
9. [DONE] `qg-restore-isolation.phase2.assets.task1` Sync the bundled Quality Gates agent asset/template contract so generated Phase 4 prompts forbid parallel verification command execution (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/bundled-templates.ts, packages/core/src/templates/quality-gates-bundled-templates.test.ts`; expected commit: `fix: sync quality gates sequential verification asset`). Result: `node scripts/generate-bundled-templates.js` regenerated `bundled-templates.ts`; bundled Quality Gates template test passed 3/3; Ultracite check passed for changed asset/template files.
10. [DONE] Git Commit: `fix: sync quality gates sequential verification asset` (hash: ab3c43750)

## Phase 3 - Documentation Sync (owner: Codex, updated: 2026-06-10)

### Stream: SSOT Update

11. [DONE] `qg-restore-isolation.phase3.docs.task1` Synchronize the implemented sequential Quality Gates verification contract into managed workflow SSOT docs (scope: `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: describe sequential quality gates verification`). Result: ManagedWorkflowOrchestration and WorkflowSteps Overview now describe Phase 4 as a sequential workspace transaction with exclusive mutation commands and ordered evidence.
12. [DONE] Git Commit: `docs: describe sequential quality gates verification` (hash: 591ed5b3c)

## Phase 4 - Tooling Verification (owner: Codex, updated: 2026-06-10)

### Stream: Targeted Verification

13. [DONE] `qg-restore-isolation.phase4.verify.task1` Run targeted Quality Gates tests and package build/typecheck needed for the changed Core/template surfaces; record results in the plan (scope: `packages/core, packages/agents/quality-gates-agent, doc/TODO/todo-plan.md`; expected commit: `test: verify quality gates restore isolation`). Result: targeted Quality Gates tests (`npx tsx --test ...formal-verification-runner.test.ts ...validator-runner-evidence.test.ts ...prompt-builder.phase-envelope.test.ts ...quality-gates-bundled-templates.test.ts`) passed 19/19; `npm run build --workspace=@codeai-hub/core` passed.
14. [PENDING] Git Commit: `test: verify quality gates restore isolation` (hash: TBD)

## Phase 5 - User Workflow Acceptance Testing (owner: User, updated: 2026-06-10)

### Stream: Retest

15. [TODO] `qg-restore-isolation.phase5.user-retest.task1` User retests Quality Gates Baseline Phase 4 with a restore/delete/install-style gate command and confirms the agent no longer creates parallel workspace verification races (scope: `manual retest`; no commit expected).

## Phase 6 - Scope Closeout (owner: Codex, updated: 2026-06-10)

### Stream: Archive And Dispose

16. [TODO] `qg-restore-isolation.phase6.closeout.task1` After explicit user acceptance, archive the active todo plan and dispose the planning source according to the Plans lifecycle (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/QualityGates_RestoreIsolation_Architecture.md, doc/SolidWorks-WorkFlow/Plans/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close quality gates restore isolation plan`).
17. [TODO] Git Commit: `docs: close quality gates restore isolation plan` (hash: TBD)
18. [TODO] `qg-restore-isolation.phase6.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
