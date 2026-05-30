# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "input-unlock-settle-2026-05-30",
  "branch": "main",
  "baseHead": "84b5446e2",
  "lastRecordedCommit": "490414afb",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md",
  "currentTaskId": "release-docs-409",
  "expectedCommitMessage": "docs: prepare 1.2.409 release notes",
  "debt": {
    "expectedCommitMessage": "docs: prepare 1.2.409 release notes",
    "preCommitHead": "490414afb",
    "stage": "commit_pending",
    "taskId": "release-docs-409"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit: ...` item.
- Keep micro-task file scope at three files/packages or less.
- Plan grows incrementally; release streams are added before the closeout anchor.
- Do not run release build without explicit user confirmation.
- Scope closeout requires explicit user acceptance.

## Phase 1 — Input Unlock Settle + Release 1.2.409 (owner: Claude, updated: 2026-05-30)
### Stream: Input Unlock Timing Fix
1. [DONE] `input-unlock-settle` Defer the input unlock by a short settle window after a turn goes idle without a managed review gate, so the input does not free up before the agent's last streamed text finishes rendering; a managed review gate (activeManagedReviewMessageId) unlocks immediately, and a new running turn re-locks immediately — scope: `src/client/ui/src/session/input-panel.tsx, src/client/ui/src/session/session-view.tsx`; expected commit: `fix: defer input unlock until the agent stream settles`
2. [DONE] Git Commit: `fix: defer input unlock until the agent stream settles` (hash: 490414afb)

### Stream: Tooling Verification
3. [DONE] `input-unlock-settle-verify` Build webview and run webview typecheck for the input unlock settle fix — scope: `webview build` Result: webview typecheck and build:webview passed for the input unlock settle fix

### Stream: Release Build
4. [DONE] `release-docs-409` Update README and CHANGELOG to 1.2.409 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.409 release notes`
5. [PENDING] Git Commit: `docs: prepare 1.2.409 release notes` (hash: TBD)
6. [TODO] `release-build-409` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.409 release`
7. [TODO] Git Commit: `chore: build 1.2.409 release` (hash: TBD)
8. [TODO] `release-vsix-409` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.409 vsix`
9. [TODO] Git Commit: `chore: package 1.2.409 vsix` (hash: TBD)

### Stream: User Visual Acceptance Testing
10. [TODO] `release-acceptance-409` Hand off `codeai-hub-1.2.409.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate

### Stream: Scope Closeout
11. [TODO] `scope-closeout` Reserved post-closeout handoff anchor — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, planning-doc disposition`
