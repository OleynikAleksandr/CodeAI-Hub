# Plan Snapshot: core-owned-managed-documentation-commits-2026-05-08

**Created:** 2026-05-08T12:33:57.985Z
**Result note:** Targeted verification passed for core-owned managed documentation commits
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** phase4.stream1.task1
**Expected Commit:** test: verify core-owned documentation commits
**Last Recorded Commit:** 6b74dc52b

_Recovery Pack section not found._

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "core-owned-managed-documentation-commits-2026-05-08",
  "branch": "main",
  "baseHead": "32cde8b8b",
  "lastRecordedCommit": "6b74dc52b",
  "planningSource": "doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md",
  "currentTaskId": "phase4.stream1.task1",
  "expectedCommitMessage": "test: verify core-owned documentation commits",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Only this Context Pack is the recovery source for the current execution cycle.

## Execution Rules

- Use `npm run plan:status`, `npm run plan:validate`, `npm run plan:repair`, and `npm run plan:commit -- "<expected commit message>"`.
- Required reading before each fix: `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`.
- This scope implements Core-owned Git transactions for managed documentation stages before code-generation begins.
- Agents must own artifact content only; Core must own validation, allowlisted staging, commit, plan advancement, feedback, and downstream unlock.
- Every implementation task must touch no more than 3 files/packages; split if the code requires a wider change.
- After all fixes and verification pass, stop and ask the user whether to build a new release. Do not prepare release notes, bump versions, run `./scripts/build-all.sh`, or run `./scripts/build-release.sh --use-current-version` without separate explicit user confirmation.

## Phase 1 — Core Commit Transaction (owner: Codex, updated: 2026-05-08)

### Stream: Managed Documentation Commit Primitive

1. [DONE] `phase1.stream1.task1` Add a Core service that reads dirty Git state, resolves active managed documentation stage ownership, stages only allowlisted owned paths, invokes the managed plan commit transaction, and rechecks clean Git after commit (scope: `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts`, `packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts`, related exports if needed; expected commit: `feat: add managed documentation commit transaction`).
2. [DONE] Git Commit: `feat: add managed documentation commit transaction` (hash: 0d20d7228)
3. [DONE] `phase1.stream1.task2` Wire the commit transaction into workflow-state acceptance after Diagram Modules, Application Skeleton, and Quality Gates validators are green, before downstream unlock and before final acceptance feedback dedupe (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts`, `packages/core/src/remote-bridge/handlers/quality-gates-progress.ts`; expected commit: `fix: let core commit managed documentation stages`).
4. [DONE] Git Commit: `fix: let core commit managed documentation stages` (hash: 1b1cda7ed)

### Stream: Stage Ownership And Failure Feedback

1. [DONE] `phase1.stream2.task1` Add explicit stage allowlist/error reporting for out-of-owner dirty files so Core refuses commits with actionable feedback instead of asking provider agents to run shell commands (scope: commit transaction helper plus feedback tests; expected commit: `fix: block unmanaged dirty files before core commit`).
2. [DONE] Git Commit: `fix: block unmanaged dirty files before core commit` (hash: 904c8e3e2)
3. [DONE] `phase1.stream2.task2` Remove or soften managed documentation prompt instructions that require agents to run `npm run plan:commit`, replacing them with content-readiness instructions while Core owns the durable commit (scope: bundled workflow step templates/invocation templates; expected commit: `docs: remove agent-owned managed commits from prompts`).
4. [DONE] Git Commit: `docs: remove agent-owned managed commits from prompts` (hash: 923256e62)

## Phase 2 — Regression Coverage (owner: Codex, updated: 2026-05-08)

### Stream: Core-Owned Commit Tests

1. [DONE] `phase2.stream1.task1` Add tests proving Core auto-commits valid Diagram Modules owned artifacts and unlocks Application Skeleton without provider shell tools (scope: Core workflow-state/commit transaction tests; expected commit: `test: auto commit valid diagram modules artifacts`).
2. [DONE] Git Commit: `test: auto commit valid diagram modules artifacts` (hash: 366367de1)
3. [DONE] `phase2.stream1.task2` Add tests proving Core auto-commits valid Application Skeleton and Quality Gates owned artifacts, and refuses commits when dirty files include another stage or unrelated workspace path (scope: Core workflow-state/commit transaction tests; expected commit: `test: cover managed documentation commit ownership`).
4. [DONE] Git Commit: `test: cover managed documentation commit ownership` (hash: 706e2fe26)

## Phase 3 — Documentation Sync (owner: Codex, updated: 2026-05-08)

### Stream: SSOT Updates

1. [DONE] `phase3.stream1.task1` Update managed workflow SSOT docs to describe the implemented Core-owned commit transaction, post-commit revalidation, and provider-shell independence (scope: `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`, `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs: document core-owned managed commit runtime`).
2. [DONE] Git Commit: `docs: document core-owned managed commit runtime` (hash: 6b74dc52b)

## Phase 4 — Tooling Verification (owner: Codex, updated: 2026-05-08)

### Stream: Targeted Verification

1. [IN_PROGRESS] `phase4.stream1.task1` Run targeted Core build/tests for managed documentation commit transaction, workflow-state acceptance, feedback, and prompt sync; record results in this plan (scope: verification only plus `doc/TODO/todo-plan.md`; expected commit: `test: verify core-owned documentation commits`).
   - Verification record (2026-05-08):
     - `npm run build --workspace packages/core` - passed.
     - `node --test packages/core/dist/remote-bridge/handlers/managed-documentation-commit-transaction.test.js packages/core/dist/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.js packages/core/dist/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.js` - passed, 10/10 tests.
     - `node --test packages/core/dist/templates/diagram-modules-bundled-templates.test.js packages/core/dist/templates/application-skeleton-bundled-templates.test.js packages/core/dist/templates/quality-gates-bundled-templates.test.js` - passed, 8/8 tests.
2. [TODO] Git Commit: `test: verify core-owned documentation commits` (hash: TBD)

## Phase 5 — Release Build Confirmation (owner: User, updated: 2026-05-08)

### Stream: Await User Confirmation

1. [TODO] `phase5.stream1.task1` Stop after implementation and verification, report results to the user, and ask whether to build a new release. Do not prepare release notes or run release scripts until the user explicitly confirms (scope: user decision gate; expected commit: `chore: record release build confirmation`).
2. [TODO] Git Commit: `chore: record release build confirmation` (hash: TBD)

## Phase 6 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-08)

### Stream: User Retest

1. [TODO] `phase6.stream1.task1` User installs the confirmed release and retests provider sessions without shell tools across Diagram Modules, Application Skeleton, and Quality Gates; Core must auto-commit accepted documentation artifacts and keep downstream locked on any blocker (scope: user workflow retest; expected commit: `test: record core-owned commit acceptance`).
2. [TODO] Git Commit: `test: record core-owned commit acceptance` (hash: TBD)

## Phase 7 — Scope Closeout (owner: Codex, updated: 2026-05-08)

### Stream: Closeout

1. [TODO] `phase7.stream1.task1` Close this scope only after explicit user acceptance, archive the active plan, and dispose planning documents according to closeout rules (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, related planning/system docs if needed; expected commit: `chore: close core-owned managed documentation commit scope`).
2. [TODO] Git Commit: `chore: close core-owned managed documentation commit scope` (hash: TBD)
````
