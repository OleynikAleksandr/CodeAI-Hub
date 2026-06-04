# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-terminal-residue-2026-06-04",
  "branch": "main",
  "baseHead": "c531f5680",
  "lastRecordedCommit": "c531f5680",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md",
  "currentTaskId": "phase1.stream1.task1",
  "expectedCommitMessage": "docs: plan application skeleton terminal residue fix",
  "debt": {
    "expectedCommitMessage": "docs: plan application skeleton terminal residue fix",
    "preCommitHead": "c531f5680",
    "stage": "commit_pending",
    "taskId": "phase1.stream1.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`

## Execution Rules

- Keep this bugfix scoped to Application Skeleton managed terminal residue after release `1.2.450`.
- Do not change the already accepted Git-owned workflow session policy.
- Commit every completed task through `npm run plan:commit -- "<expected commit message>"`.
- Do not build a new release until the user explicitly confirms the release build.

## Phase 1 — Application Skeleton Terminal Residue Fix (owner: Codex, updated: 2026-06-04)

### Stream: Plan Intake

1. [DONE] `phase1.stream1.task1` Record the release `1.2.450` Application Skeleton retest failure where final `managed-workflow-complete` unified session and translation overlay were written after the terminal residue/ledger commits (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan application skeleton terminal residue fix`).
2. [PENDING] `phase1.stream1.commit1` Git Commit: `docs: plan application skeleton terminal residue fix` (hash: TBD)

### Stream: Managed Completion Residue

3. [TODO] `phase1.stream2.task1` Make Application Skeleton final managed completion persist and commit session/translation residue before unlocking Quality Gates (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-completion-handoff.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.ts, packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts`; expected commit: `fix: commit application skeleton completion session residue`).
4. [TODO] `phase1.stream2.commit1` Git Commit: `fix: commit application skeleton completion session residue` (hash: TBD)

### Stream: Documentation Sync

5. [TODO] `phase1.stream3.task1` Sync active SSOT docs so managed Application Skeleton completion follows the same persisted-message terminal residue rule as other managed stage completions (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: document application skeleton terminal residue commit`).
6. [TODO] `phase1.stream3.commit1` Git Commit: `docs: document application skeleton terminal residue commit` (hash: TBD)

### Stream: Tooling Verification

7. [TODO] `phase1.stream4.task1` Run targeted Application Skeleton managed handoff tests, Core build, and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected).

### Stream: Release Build Confirmation Gate

8. [TODO] `phase1.stream5.task1` Ask the user whether to build release `1.2.451` for retesting Application Skeleton to Quality Gates unlock with clean Git (scope: user release-build confirmation; expected commit: no commit expected).

### Stream: Release Build

9. [TODO] `phase1.stream6.task1` Run release build for `1.2.451` only after explicit user confirmation (scope: release artifacts and version files; expected commit: `chore: build release 1.2.451`).
10. [TODO] `phase1.stream6.commit1` Git Commit: `chore: build release 1.2.451` (hash: TBD)

### Stream: User Workflow Acceptance Testing

11. [TODO] `phase1.stream7.task1` Hand over release `1.2.451` for user retest; wait for explicit acceptance or next failure report (scope: user workflow acceptance; expected commit: no commit expected).

### Stream: Scope Closeout

12. [TODO] `phase1.stream8.task1` Close this bugfix scope only after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**`; expected commit: `docs: close application skeleton terminal residue scope`).
13. [TODO] `phase1.stream8.commit1` Git Commit: `docs: close application skeleton terminal residue scope` (hash: TBD)
14. [TODO] `phase1.stream8.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: post-closeout handoff only; expected commit: none).
