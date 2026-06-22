# Plan Closeout: release-1-2-561-verification-2026-06-20

**Created:** 2026-06-20T16:12:05.871Z
**Acceptance:** User accepted the 1.2.561 VSIX on 2026-06-20.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** phase1.stream6.task1
**Expected Commit:** docs: close 1.2.561 release scope
**Last Recorded Commit:** 2c63815c3
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Release_1_2_561_Verification_Planning.md

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "release-1-2-561-verification-2026-06-20",
  "branch": "main",
  "baseHead": "6442104b4",
  "lastRecordedCommit": "2c63815c3",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Release_1_2_561_Verification_Planning.md",
  "currentTaskId": "phase1.stream6.task1",
  "expectedCommitMessage": "docs: close 1.2.561 release scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Release_1_2_561_Verification_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Only this list is the source for this execution cycle.

## Execution Rules

- Use `npm run plan:commit -- "<expected commit message>"` for planned commits.
- Do not bypass Husky hooks or quality gates.
- Release Build Confirmation Gate: user explicitly requested a new release build for retest on 2026-06-20.
- Scope Closeout runs only after explicit user acceptance.

## Phase 1 — Release 1.2.561 Verification (owner: session, updated: 2026-06-20)

### Stream: Planning Intake

1. [DONE] `phase1.stream1.task1` Open a minimal active release scope for `1.2.561`. (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Release_1_2_561_Verification_Planning.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: open 1.2.561 release scope`)
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: open 1.2.561 release scope` (hash: 6d1cabc14)

### Stream: Release Notes

3. [DONE] `phase1.stream2.task1` Update release notes for `1.2.561` before the release build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.561 release notes`)
4. [DONE] `phase1.stream2.commit1` Git Commit: `docs: prepare 1.2.561 release notes` (hash: 95383caf8)

### Stream: Release Build

5. [DONE] `phase1.stream3.task1` Run the normal release build scripts for `1.2.561`, collect VSIX/tarballs, and record evidence. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, .vscodeignore, media/react-chat.js, doc/tmp/releases/**, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.561 verification release`) Evidence: `./scripts/build-all.sh --allow-dirty` completed for `1.2.561`; `./scripts/build-release.sh --use-current-version --allow-dirty` completed; VSIX: `codeai-hub-1.2.561.vsix` (5.5M); tarballs copied under `doc/tmp/releases/*1.2.561*`.
6. [DONE] `phase1.stream3.commit1` Git Commit: `chore: build 1.2.561 verification release` (hash: 553741597)

### Stream: Process Instruction Update

7. [DONE] `phase1.stream4.task1` Add the minimal ToDoPlan/commit orchestration order to the root agent instructions. (scope: `AGENTS.md, doc/TODO/todo-plan.md`; expected commit: `docs: document plan commit orchestration`)
8. [DONE] `phase1.stream4.commit1` Git Commit: `docs: document plan commit orchestration` (hash: 2c63815c3)

### Stream: User Workflow Acceptance Testing

9. [DONE] `phase1.stream5.task1` Wait for user retest and explicit acceptance of the `1.2.561` VSIX. (scope: observation only; expected commit: not required) Result: User accepted release 1.2.561; proceed to scope closeout.

### Stream: Scope Closeout

10. [IN_PROGRESS] `phase1.stream6.task1` Close the release scope after user acceptance and archive the plan. (scope: `doc/TODO/Archive/**, doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close 1.2.561 release scope`)
11. [TODO] `phase1.stream6.commit1` Git Commit: `docs: close 1.2.561 release scope` (hash: TBD)
````
