# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "questionnaire-autoscroll-2026-05-30",
  "branch": "main",
  "baseHead": "cf7c49e1e",
  "lastRecordedCommit": "29ff3d65b",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md",
  "currentTaskId": "release-docs",
  "expectedCommitMessage": "docs: prepare 1.2.407 release notes",
  "debt": {
    "expectedCommitMessage": "docs: prepare 1.2.407 release notes",
    "preCommitHead": "29ff3d65b",
    "stage": "commit_pending",
    "taskId": "release-docs"
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
- Plan grows incrementally: new fixes/observations from the test-01 run are added as new Streams on demand, not planned ahead.
- Do not run release build without explicit user confirmation.
- Scope closeout requires explicit user acceptance.

## Phase 1 — Questionnaire Auto-Scroll (owner: Claude, updated: 2026-05-30)
### Stream: Auto-Scroll Implementation
1. [DONE] `autoscroll-impl` Auto-scroll description questionnaire to the first unfilled required section on load and to the submit footer once all required sections are filled (required = all except optional sections 0/8/9/10/12; section 11 is the last required) — scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx, src/client/project-manager/components/description/questionnaire-autoscroll.ts, src/client/ui/src/components/idea-questionnaire/idea-questionnaire-view.tsx, doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md`; expected commit: `feat: auto-scroll questionnaire to next unfilled section or submit`
2. [DONE] Git Commit: `feat: auto-scroll questionnaire to next unfilled section or submit` (hash: 29ff3d65b)

### Stream: Tooling Verification
3. [DONE] `autoscroll-verify` Build webview and run webview typecheck for the questionnaire auto-scroll change — scope: `webview build` Result: webview typecheck and build:webview passed for questionnaire auto-scroll change

### Stream: Release Build
4. [DONE] `release-docs` Update README and CHANGELOG to 1.2.407 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.407 release notes`
5. [PENDING] Git Commit: `docs: prepare 1.2.407 release notes` (hash: TBD)
6. [TODO] `release-build` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.407 release`
7. [TODO] Git Commit: `chore: build 1.2.407 release` (hash: TBD)
8. [TODO] `release-vsix` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.407 vsix`
9. [TODO] Git Commit: `chore: package 1.2.407 vsix` (hash: TBD)

### Stream: User Visual Acceptance Testing
10. [TODO] `release-acceptance` Hand off `codeai-hub-1.2.407.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate

### Stream: Scope Closeout
11. [TODO] `scope-closeout` Reserved post-closeout handoff anchor — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, planning-doc disposition`
