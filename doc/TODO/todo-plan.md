# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-provider-neutral-in-progress-repair-1.2.250",
  "branch": "main",
  "baseHead": "a7c01210f6a52e05feec1db07eea09704df9e5e5",
  "lastRecordedCommit": "37c2dd5fe",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Quality_Gates_PostTurn_InProgress_Repair_1.2.250.md",
  "currentTaskId": "hotfix.phase6.continuity-store.task1",
  "expectedCommitMessage": "fix: harden session continuity chain persistence",
  "debt": {
    "expectedCommitMessage": "fix: harden session continuity chain persistence",
    "preCommitHead": "37c2dd5fe",
    "stage": "commit_pending",
    "taskId": "hotfix.phase6.continuity-store.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Quality_Gates_PostTurn_InProgress_Repair_1.2.250.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Execution Rules

- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация и отдельный `Git Commit: ...`.
- Commit выполняется через `npm run plan:commit -- "<expected commit message>"`.
- Release build уже подтвержден пользователем в текущем turn.
- После сборки scope остается ACTIVE до пользовательского retest/acceptance.

## Phase 1 — Hotfix Intake (owner: Codex, updated: 2026-05-13)

### Stream: Scope And Plan

1. [DONE] `hotfix.phase1.intake.task1` Create provider-neutral Quality Gates in-progress repair scope and docs index entry (scope: `doc/SolidWorks-WorkFlow/Plans/Quality_Gates_PostTurn_InProgress_Repair_1.2.250.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan provider-neutral quality gates in-progress repair`).
2. [DONE] Git Commit: `docs: plan provider-neutral quality gates in-progress repair` (hash: 9380a644b)

## Phase 2 — Core State Machine Fix (owner: Codex, updated: 2026-05-13)

### Stream: Quality Gates Repair Classification

3. [DONE] `hotfix.phase2.qg-state.task1` Fix Quality Gates continuation prompt and progress classification for accepted in-progress integration attempts with missing hooks (scope: `packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/quality-gates-progress.ts, packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts`; expected commit: `fix: detect incomplete quality gates integration`)
4. [DONE] Git Commit: `fix: detect incomplete quality gates integration` (hash: 09beacc77)
5. [DONE] `hotfix.phase2.qg-postturn.task1` Add provider-neutral post-turn regression and update managed workflow SSOT (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts, doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md, doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`; expected commit: `test: cover quality gates in-progress repair`)
6. [DONE] Git Commit: `test: cover quality gates in-progress repair` (hash: 9b999cea5)

## Phase 3 — Cross-Step Verification (owner: Codex, updated: 2026-05-13)

### Stream: Managed Step Parity

7. [DONE] `hotfix.phase3.cross-step.task1` Patch Application Skeleton materializing attempts and document Diagram Modules parity check (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts, packages/core/src/remote-bridge/handlers/application-skeleton-in-progress-materialization.test.ts, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`; expected commit: `docs: verify managed step post-turn parity`)
8. [DONE] Git Commit: `docs: verify managed step post-turn parity` (hash: cd9b13b13)

## Phase 4 — Release Build (owner: Codex, updated: 2026-05-13)

### Stream: Release 1.2.250

9. [DONE] `hotfix.phase4.release-docs.task1` Prepare README and CHANGELOG for release 1.2.250 (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release 1.2.250`)
10. [DONE] Git Commit: `docs: prepare release 1.2.250` (hash: 567acb234)
11. [DONE] `hotfix.phase4.release-build.task1` Run the approved release build and collect artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, packages/core/src/templates/bundled-templates.ts`; expected commit: `chore: release 1.2.250`)
12. [DONE] Git Commit: `chore: release 1.2.250` (hash: 37c2dd5fe)

## Phase 5 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-13)

### Stream: User Retest

13. [BLOCKED] `hotfix.phase5.user-test.task1` User installs release 1.2.250 and retests managed steps across providers. **BLOCKED 2026-05-13:** Claude provider retest exposed a provider-neutral continuity corruption defect: the completed Application Skeleton JSONL exists, but its `chain.json` became non-parseable, so Project Manager showed the start card instead of loading the existing session; Quality Gates also displayed a misleading upstream artifact "not found" label while the file existed on disk. (scope: user workflow; expected commit: `docs: accept release 1.2.250 retest`)
14. [TODO] Git Commit: `docs: accept release 1.2.250 retest` (hash: TBD)

## Phase 6 — Session Continuity Hotfix (owner: Codex, updated: 2026-05-13)

### Stream: Continuity Chain Recovery

15. [DONE] `hotfix.phase6.continuity-store.task1` Harden session continuity chain persistence and recovery for all workflow/development-tree stages so malformed `chain.json` files do not hide existing sessions from Project Manager (scope: `packages/core/src/session-continuity/continuity-store.ts, packages/core/src/session-continuity/index-registry.ts, packages/core/src/session-continuity/continuity-store.test.ts`; expected commit: `fix: harden session continuity chain persistence`)
16. [PENDING] Git Commit: `fix: harden session continuity chain persistence` (hash: TBD)
17. [TODO] `hotfix.phase6.continuity-docs.task1` Document the continuity recovery invariant and the user-visible retest blocker in workflow SSOT docs (scope: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: document continuity recovery invariant`)
18. [TODO] Git Commit: `docs: document continuity recovery invariant` (hash: TBD)

## Phase 7 — Scope Closeout (owner: Codex, updated: 2026-05-13)

### Stream: Close Plan After User Acceptance

19. [TODO] `hotfix.phase7.closeout.task1` Archive active plan and dispose the planning document after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close quality gates in-progress repair scope`)
20. [TODO] Git Commit: `docs: close quality gates in-progress repair scope` (hash: TBD)
