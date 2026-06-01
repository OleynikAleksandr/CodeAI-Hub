# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-status-open-settings-bottom-align-2026-06-01",
  "branch": "main",
  "baseHead": "8453d4f19",
  "lastRecordedCommit": "2f902b3a6",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/SessionStatus_OpenSettings_BottomBar_Alignment_Layout.md",
  "currentTaskId": "open-settings-bottom-align",
  "expectedCommitMessage": "fix: align open settings button with session status bar",
  "debt": {
    "expectedCommitMessage": "fix: align open settings button with session status bar",
    "preCommitHead": "2f902b3a6",
    "stage": "commit_pending",
    "taskId": "open-settings-bottom-align"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionStatus_OpenSettings_BottomBar_Alignment_Layout.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Plans/SessionStatus_OpenSettings_BottomBar_Alignment_Layout.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit: ...` item.
- Keep micro-task file scope at three files/packages or less.
- Pure visual / CSS scope: no Core/contract/workflow-truth change; SSOT stays in the planning doc.
- Do not run the release build without explicit user confirmation (Release Build Confirmation Gate).
- Scope closeout requires explicit user acceptance.

## Phase 1 - Planning Intake (owner: Claude, updated: 2026-06-01)
### Stream: Planning Intake
1. [DONE] `planning-intake` Create the planning doc and active todo-plan, register the planning doc in the docs index — scope: `doc/SolidWorks-WorkFlow/Plans/SessionStatus_OpenSettings_BottomBar_Alignment_Layout.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan session status and open settings bottom alignment`
2. [DONE] Git Commit: `docs: plan session status and open settings bottom alignment` (hash: 568ab8c2c)

## Phase 2 - Bottom Bar Layout Implementation (owner: Claude, updated: 2026-06-01)
### Stream: Session Status Panel Bottom Drop
3. [DONE] `status-panel-bottom-drop` Drop the session status panel to the window bottom by removing the residual `.session-app` bottom padding and the sessions-panel content bottom padding, leaving only the 8px minimal gap — scope: `media/session-view.css, packages/ui/project-manager/styles.css`; expected commit: `fix: drop session status panel to window bottom`
4. [DONE] Git Commit: `fix: drop session status panel to window bottom` (hash: 2f902b3a6)

### Stream: Open Settings Button Alignment
5. [DONE] `open-settings-bottom-align` Match the OPEN SETTINGS button height to the status chip button, match the footer zone height to the status panel, and bottom-align the button with the status chips — scope: `packages/ui/project-manager/styles.css`; expected commit: `fix: align open settings button with session status bar`
6. [PENDING] Git Commit: `fix: align open settings button with session status bar` (hash: TBD)

## Phase 3 - Verification & Release (owner: Claude, updated: 2026-06-01)
### Stream: Tooling Verification
7. [TODO] `layout-verify` Run targeted webview/project-manager builds and typecheck to confirm the CSS bundles regenerate cleanly — scope: `webview + project-manager build/typecheck`

### Stream: Release Build Confirmation
8. [TODO] `release-confirmation` Ask the user explicitly to confirm building a new release before any version bump or build script — scope: user confirmation gate

### Stream: Release Build
9. [TODO] `release-docs` Update README "Current Release" and CHANGELOG for the next version before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.432 release notes`
10. [TODO] Git Commit: `docs: prepare 1.2.432 release notes` (hash: TBD)
11. [TODO] `release-build` Run `./scripts/build-all.sh` to bump versions and rebuild provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.432 release`
12. [TODO] Git Commit: `chore: build 1.2.432 release` (hash: TBD)
13. [TODO] `release-vsix` Run `./scripts/build-release.sh --use-current-version` to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.432 vsix`
14. [TODO] Git Commit: `chore: package 1.2.432 vsix` (hash: TBD)

## Phase 4 - User Visual Acceptance Testing (owner: Claude, updated: 2026-06-01)
### Stream: User Visual Acceptance Testing
15. [TODO] `user-visual-acceptance` Hand over the VSIX and wait for explicit user visual acceptance of the bottom-bar alignment — scope: user acceptance gate

## Phase 5 - Scope Closeout (owner: Claude, updated: 2026-06-01)
### Stream: Scope Closeout
16. [TODO] `scope-closeout` After acceptance, archive the todo-plan and planning doc and refresh the docs index — scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/**`
