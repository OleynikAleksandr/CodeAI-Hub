# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-terminal-residue-2026-06-04",
  "branch": "main",
  "baseHead": "c531f5680",
  "lastRecordedCommit": "9ca8c8d2f",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md",
  "currentTaskId": "phase1.stream12.task1",
  "expectedCommitMessage": "fix: track provider-native workflow sessions",
  "debt": {
    "expectedCommitMessage": "fix: track provider-native workflow sessions",
    "preCommitHead": "9ca8c8d2f",
    "stage": "commit_pending",
    "taskId": "phase1.stream12.task1"
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
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan application skeleton terminal residue fix` (hash: 6ecf65ead)

### Stream: Managed Completion Residue

3. [DONE] `phase1.stream2.task1` Make Application Skeleton final managed completion persist and commit session/translation residue before unlocking Quality Gates (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-completion-handoff.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.ts, doc/TODO/todo-plan.md`; expected commit: `fix: commit application skeleton completion session residue`).
4. [DONE] `phase1.stream2.commit1` Git Commit: `fix: commit application skeleton completion session residue` (hash: c60cf4a3b)

### Stream: Regression Test

5. [DONE] `phase1.stream3.task1` Cover Application Skeleton final handoff ordering so completion message persistence and terminal residue commit happen before Quality Gates activation (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover application skeleton completion residue ordering`).
6. [DONE] `phase1.stream3.commit1` Git Commit: `test: cover application skeleton completion residue ordering` (hash: de7b7136c)

### Stream: Documentation Sync

7. [DONE] `phase1.stream4.task1` Sync active SSOT docs so managed Application Skeleton completion follows the same persisted-message terminal residue rule as other managed stage completions (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: document application skeleton terminal residue commit`).
8. [DONE] `phase1.stream4.commit1` Git Commit: `docs: document application skeleton terminal residue commit` (hash: 28d43e1fb)

### Stream: Regression Test Typecheck Fix

9. [DONE] `phase1.stream5.task1` Make the Application Skeleton completion ordering regression test satisfy strict Core TypeScript build checks (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: typecheck application skeleton completion test`).
10. [DONE] `phase1.stream5.commit1` Git Commit: `fix: typecheck application skeleton completion test` (hash: 4590351ec)

### Stream: Tooling Verification

11. [DONE] `phase1.stream6.task1` Run targeted Application Skeleton managed handoff tests, Core build, and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted Application Skeleton handoff test passed; npm run build --workspace=@codeai-hub/core passed; npm run plan:validate passed.

### Stream: Release Build Confirmation Gate

12. [DONE] `phase1.stream7.task1` Ask the user whether to build release `1.2.451` for retesting Application Skeleton to Quality Gates unlock with clean Git (scope: user release-build confirmation; expected commit: no commit expected). Result: User explicitly confirmed release build 1.2.451.

### Stream: Release Metadata Prep

13. [DONE] `phase1.stream8.task1` Prepare README/CHANGELOG for future release `1.2.451` before running release packaging, so packaged VSIX metadata matches the release (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.451`).
14. [DONE] `phase1.stream8.commit1` Git Commit: `docs: prepare release 1.2.451` (hash: ddb73b0c4)

### Stream: Release Build

15. [DONE] `phase1.stream9.task1` Run `./scripts/build-all.sh` for `1.2.451` after explicit user confirmation and release metadata prep (scope: `package.json, package-lock.json, packages/core/package.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/Kimi_Module/package.json, packages/localization/package.json, packages/translation/package.json, packages/initiatives/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/**/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.451`).
16. [DONE] `phase1.stream9.commit1` Git Commit: `chore: build release 1.2.451` (hash: 428264853)

### Stream: VSIX Package

17. [DONE] `phase1.stream10.task1` Run `./scripts/build-release.sh --use-current-version` for `1.2.451` from the clean post-build-all tree (scope: `codeai-hub-1.2.451.vsix, package.json, package-lock.json, .vscodeignore, packages/core/src/templates/bundled-templates.ts, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.451`).
18. [DONE] `phase1.stream10.commit1` Git Commit: `chore: package release 1.2.451` (hash: 9ca8c8d2f)

### Stream: User Workflow Acceptance Testing

19. [DONE] `phase1.stream11.task1` Hand over release `1.2.451` for user retest; wait for explicit acceptance or next failure report (scope: user workflow acceptance; expected commit: no commit expected). Result: User retest accepted Codex Clear/Undo session rollback, but rejected Gemini because native Gemini chat files under `.gemini/tmp/<workspace>/chats/*.jsonl` were ignored by the runtime capsule `.gitignore`.

### Stream: Provider Native Session Git Ownership

20. [DONE] `phase1.stream12.task1` Make workspace runtime capsule `.gitignore` track provider-native workflow session histories for Codex, Claude, GLM-Claude-Code, Gemini, and Kimi while keeping provider tmp caches/auth ignored (scope: `packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule-gitignore.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: track provider-native workflow sessions`).
21. [PENDING] `phase1.stream12.commit1` Git Commit: `fix: track provider-native workflow sessions` (hash: TBD)

### Stream: Gemini Session Documentation Sync

22. [TODO] `phase1.stream13.task1` Document that Gemini native chat histories under `.gemini/tmp/<workspace>/chats/*.jsonl` are rollback-owned workflow session history despite living under Gemini tmp (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: document gemini native session git ownership`).
23. [TODO] `phase1.stream13.commit1` Git Commit: `docs: document gemini native session git ownership` (hash: TBD)

### Stream: Gemini Verification

24. [TODO] `phase1.stream14.task1` Run runtime capsule gitignore regression tests, Core build, and plan validation before asking for the next release build (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected).

### Stream: Release Build Confirmation Gate

25. [TODO] `phase1.stream15.task1` Ask the user whether to build release `1.2.452` for Gemini native session rollback retesting (scope: user release-build confirmation; expected commit: no commit expected).

### Stream: Release 1.2.452

26. [TODO] `phase1.stream16.task1` Prepare release metadata for `1.2.452` after explicit user confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.452`).
27. [TODO] `phase1.stream16.commit1` Git Commit: `docs: prepare release 1.2.452` (hash: TBD)
28. [TODO] `phase1.stream16.task2` Run `./scripts/build-all.sh` for `1.2.452` (scope: `package.json, package-lock.json, packages/core/package.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/Kimi_Module/package.json, packages/localization/package.json, packages/translation/package.json, packages/initiatives/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/**/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.452`).
29. [TODO] `phase1.stream16.commit2` Git Commit: `chore: build release 1.2.452` (hash: TBD)
30. [TODO] `phase1.stream16.task3` Run `./scripts/build-release.sh --use-current-version` for `1.2.452` (scope: `codeai-hub-1.2.452.vsix, package.json, package-lock.json, .vscodeignore, packages/core/src/templates/bundled-templates.ts, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.452`).
31. [TODO] `phase1.stream16.commit3` Git Commit: `chore: package release 1.2.452` (hash: TBD)

### Stream: User Workflow Acceptance Testing

32. [TODO] `phase1.stream17.task1` Hand over release `1.2.452` for user retest; wait for explicit acceptance or next failure report (scope: user workflow acceptance; expected commit: no commit expected).

### Stream: Scope Closeout

33. [TODO] `phase1.stream18.task1` Close this bugfix scope only after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**`; expected commit: `docs: close application skeleton terminal residue scope`).
34. [TODO] `phase1.stream18.commit1` Git Commit: `docs: close application skeleton terminal residue scope` (hash: TBD)
35. [TODO] `phase1.stream18.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: post-closeout handoff only; expected commit: none).
