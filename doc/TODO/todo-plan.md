# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "workflow-clear-session-cleanup-rollback-2026-06-03",
  "branch": "main",
  "baseHead": "12edb060e",
  "lastRecordedCommit": "bbd623a1b",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md",
  "currentTaskId": "phase4.stream2.task1",
  "expectedCommitMessage": "fix: flush preliminary review translations before commit",
  "debt": {
    "expectedCommitMessage": "fix: flush preliminary review translations before commit",
    "preCommitHead": "bbd623a1b",
    "stage": "commit_pending",
    "taskId": "phase4.stream2.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`

## Execution Rules

- Keep the rollback scoped to the Clear/Undo session cleanup regression.
- Use Git rollback mechanics for the cleanup code; do not rewrite public history.
- Commit every completed task through `npm run plan:commit -- "<expected commit message>"`.
- The user explicitly asked for a verification release after the rollback; build `1.2.448` without closing the scope until user retest is complete.

## Phase 1 — Roll Back Clear/Undo Session Cleanup (owner: Codex, updated: 2026-06-03)

### Stream: Plan Intake

1. [DONE] `phase1.stream1.task1` Create the active rollback plan for the Clear/Undo provider-native session cleanup regression (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan workflow clear cleanup rollback`).
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan workflow clear cleanup rollback` (hash: 3ab555283)

### Stream: Code Rollback

3. [DONE] `phase1.stream2.task1` Roll back the Clear/Undo session cleanup code to the pre-`cd34a5d08` behavior, removing the broad workflow history cleanup helper and restoring the narrower service path (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-runtime-cleanup.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.runtime-cleanup.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: revert workflow clear session cleanup`).
4. [DONE] `phase1.stream2.commit1` Git Commit: `fix: revert workflow clear session cleanup` (hash: 66e037018)

### Stream: Documentation Sync

5. [DONE] `phase1.stream3.task1` Sync the workflow documentation so it no longer claims the reverted broad provider-native cleanup behavior as the active contract (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: sync workflow clear cleanup rollback`).
6. [DONE] `phase1.stream3.commit1` Git Commit: `docs: sync workflow clear cleanup rollback` (hash: 358a577a6)

### Stream: Tooling Verification

7. [DONE] `phase1.stream4.task1` Run targeted Clear/Undo tests plus Core build and plan validation after the rollback (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Verification passed: @codeai-hub/core build, workflow-step-clear-service test suite (7 tests), and plan validation.

## Phase 2 — Release 1.2.448 For Rollback Retest (owner: Codex, updated: 2026-06-03)

### Stream: Release Notes

8. [DONE] `phase2.stream1.task1` Prepare `1.2.448` release notes for the Clear/Undo session cleanup rollback (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.448`).
9. [DONE] `phase2.stream1.commit1` Git Commit: `docs: prepare release 1.2.448` (hash: 58cc84012)

### Stream: Release Build

10. [DONE] `phase2.stream2.task1` Run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version` for `1.2.448`, then record the generated release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, packages/core/src/templates/bundled-templates.ts, .vscodeignore, doc/tmp/releases/**, *.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.448`).
11. [DONE] `phase2.stream2.commit1` Git Commit: `chore: build release 1.2.448` (hash: f92c9fb3e)

### Stream: User Workflow Acceptance Testing

12. [DONE] `phase2.stream3.task1` Hand over release `1.2.448` for user retest; wait for explicit acceptance or the next failure report (scope: user workflow acceptance; expected commit: no commit expected). Result: User tested release 1.2.448: provider-native sessions are created and no longer disappear. Next work should be planned as a safe step-bound session cleanup design.

### Stream: Scope Closeout

13. [DONE] `phase2.stream4.task1` Extend this accepted rollback scope into the Git-owned workflow runtime sessions MVP requested by the user, keeping the Development Tree planning source active and avoiding `plan:closeout` archival (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan git-owned workflow runtime sessions`).
14. [DONE] `phase2.stream4.commit1` Git Commit: `docs: plan git-owned workflow runtime sessions` (hash: e4ce012c6)

## Phase 3 — Git-Owned Workflow Runtime Sessions MVP (owner: Codex, updated: 2026-06-04)

### Stream: Runtime Capsule Git Ownership

15. [DONE] `phase3.stream1.task1` Update workspace runtime capsule ignore rules and rollback-ignore classification so workflow unified sessions and provider-native session histories are Git-owned, while settings, localization, credentials, installed packages, caches, SQLite databases, logs and binaries stay outside Git (scope: `packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.ts, packages/core/src/workflow/runtime/workspace-settings-rollback-ignore.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.test.ts`; expected commit: `fix: track workflow runtime sessions in git`).
16. [DONE] `phase3.stream1.commit1` Git Commit: `fix: track workflow runtime sessions in git` (hash: f1903ad48)

### Stream: Commit And Rollback Behavior

17. [DONE] `phase3.stream2.task1` Update accepted step commits so Core no longer untracks provider-native session histories or unified session JSONL files and still untracks provider caches/secrets (scope: `packages/core/src/workflow/boundary/workflow-step-commit-facade.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts`; expected commit: `fix: rollback workflow sessions through git`).
18. [DONE] `phase3.stream2.commit1` Git Commit: `fix: rollback workflow sessions through git` (hash: 4a968f4f9)
19. [DONE] `phase3.stream2.task2` Update boundary rollback tests so Git rollback removes tracked future workflow sessions while preserving ignored settings/localization/cache state (scope: `packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts, packages/core/src/workflow/boundary/workflow-boundary-facade-runtime-sessions.test.ts, packages/core/src/workflow/boundary/workflow-rollback-runtime-sessions.test.ts`; expected commit: `fix: keep workflow sessions under boundary rollback`).
20. [DONE] `phase3.stream2.commit2` Git Commit: `fix: keep workflow sessions under boundary rollback` (hash: e0c25f06e)

### Stream: Documentation Sync

21. [DONE] `phase3.stream3.task1` Document the MVP rule that local Git and GitHub push include workflow session histories, with `.gitignore` excluding only secrets, auth, caches, installations and noisy runtime files (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: document git-owned runtime session rollback`).
22. [DONE] `phase3.stream3.commit1` Git Commit: `docs: document git-owned runtime session rollback` (hash: c733fb25f)

### Stream: Tooling Verification

23. [DONE] `phase3.stream4.task1` Run targeted runtime capsule, workflow boundary and workflow step commit tests plus Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Verification passed: runtime capsule gitignore tests, workflow boundary rollback/session tests, workflow step commit tests, @codeai-hub/core build, and plan validation.

### Stream: Release Notes

24. [DONE] `phase3.stream5.task1` Prepare release notes for `1.2.449` Git-owned workflow runtime sessions MVP (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.449`).
25. [DONE] `phase3.stream5.commit1` Git Commit: `docs: prepare release 1.2.449` (hash: 5491807b0)

### Stream: Release Build

26. [DONE] `phase3.stream6.task1` Run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version` for `1.2.449`, then record generated release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, packages/core/src/templates/bundled-templates.ts, .vscodeignore, doc/tmp/releases/**, *.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.449`).
27. [DONE] `phase3.stream6.commit1` Git Commit: `chore: build release 1.2.449` (hash: 9d9d86c4c)

### Stream: User Workflow Acceptance Testing

28. [BLOCKED] `phase3.stream7.task1` Hand over release `1.2.449` for user Clear/Undo retest with Git-owned unified and provider-native workflow sessions (scope: user workflow acceptance; expected commit: no commit expected). Result: User tested release 1.2.449 after Description acceptance in `FinderWidget-Test01`; Git stayed dirty because `runtime/sessions/unified/...description.translations.jsonl` received the `managed-workflow-complete` translation after `codeai-step: Description accepted`. The accepted commit also included provider cache/log files under Claude `Library/Caches/...` and `.claude/mcp-needs-auth-cache.json`, so provider cache ignore/untrack rules need tightening.

### Stream: Scope Closeout

29. [TODO] `phase3.stream8.task1` Close this extended scope only after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**`; expected commit: `docs: close git-owned workflow runtime sessions scope`).
30. [TODO] `phase3.stream8.commit1` Git Commit: `docs: close git-owned workflow runtime sessions scope` (hash: TBD)

## Phase 4 — Release 1.2.450 Acceptance Residue Fix (owner: Codex, updated: 2026-06-04)

### Stream: Plan Intake

31. [DONE] `phase4.stream1.task1` Record the release 1.2.449 acceptance-test failure and add regression streams for post-acceptance translation residue plus provider cache/log tracking (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan release 1.2.450 acceptance residue fix`).
32. [DONE] `phase4.stream1.commit1` Git Commit: `docs: plan release 1.2.450 acceptance residue fix` (hash: bbd623a1b)

### Stream: Preliminary Acceptance Flush

33. [DONE] `phase4.stream2.task1` Make preliminary Description/Virtual Simulation acceptance wait for queued dialog message and translation overlay persistence before accepted-step Git commit (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-review-committer.ts, packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-review-committer.test.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade-residual-docs.test.ts`; expected commit: `fix: flush preliminary review translations before commit`).
34. [PENDING] `phase4.stream2.commit1` Git Commit: `fix: flush preliminary review translations before commit` (hash: TBD)

### Stream: Provider Cache Ignore Tightening

35. [TODO] `phase4.stream3.task1` Extend workspace runtime capsule `.gitignore` cache patterns for provider `Caches/` folders and provider `*-cache.json` files (scope: `packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.test.ts`; expected commit: `fix: ignore provider cache files in runtime capsule`).
36. [TODO] `phase4.stream3.commit1` Git Commit: `fix: ignore provider cache files in runtime capsule` (hash: TBD)
37. [TODO] `phase4.stream3.task2` Extend accepted-step commit cleanup so legacy tracked provider `Caches/` folders and provider `*-cache.json` files are untracked before clean-Git gate (scope: `packages/core/src/workflow/boundary/workflow-step-commit-facade.ts, packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts`; expected commit: `fix: untrack provider cache files in step commits`).
38. [TODO] `phase4.stream3.commit2` Git Commit: `fix: untrack provider cache files in step commits` (hash: TBD)

### Stream: Tooling Verification

39. [TODO] `phase4.stream4.task1` Run targeted preliminary committer, runtime capsule gitignore, workflow step commit tests plus Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected).
