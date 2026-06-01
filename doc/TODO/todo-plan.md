# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-status-open-settings-bottom-align-2026-06-01",
  "branch": "main",
  "baseHead": "8453d4f19",
  "lastRecordedCommit": "1f274c582",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/SessionStatus_OpenSettings_BottomBar_Alignment_Layout.md",
  "currentTaskId": "release-vsix-2",
  "expectedCommitMessage": "chore: package 1.2.433 vsix",
  "debt": {
    "expectedCommitMessage": "chore: package 1.2.433 vsix",
    "preCommitHead": "1f274c582",
    "stage": "commit_pending",
    "taskId": "release-vsix-2"
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
6. [DONE] Git Commit: `fix: align open settings button with session status bar` (hash: fb8e9fc73)

## Phase 3 - Verification & Release (owner: Claude, updated: 2026-06-01)
### Stream: Tooling Verification
7. [DONE] `layout-verify` Run targeted webview/project-manager builds and typecheck to confirm the CSS bundles regenerate cleanly — scope: `webview + project-manager build/typecheck` Result: Verification passed: build:webview (react-chat.js unchanged - CSS is not bundled into JS), build:project-manager (dist regenerated, gitignored), typecheck:webview clean. Fresh CSS confirmed injected into the Project Manager bundle: old .session-app 'padding: 0 0 8px' gone, footer 'padding: 13px 12px 8px' and settings button 'min-height: 28px' present. No tracked build artifacts dirtied.

### Stream: Release Build Confirmation
8. [DONE] `release-confirmation` Ask the user explicitly to confirm building a new release before any version bump or build script — scope: user confirmation gate Result: User explicitly confirmed building release 1.2.432 for visual verification.

### Stream: Release Build
9. [DONE] `release-docs` Update README "Current Release" and CHANGELOG for the next version before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.432 release notes`
10. [DONE] Git Commit: `docs: prepare 1.2.432 release notes` (hash: 1666f6463)
11. [DONE] `release-build` Run `./scripts/build-all.sh` to bump versions and rebuild provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.432 release`
12. [DONE] Git Commit: `chore: build 1.2.432 release` (hash: 4f85db6f0)
13. [DONE] `release-vsix` Run `./scripts/build-release.sh --use-current-version` to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.432 vsix`
14. [DONE] Git Commit: `chore: package 1.2.432 vsix` (hash: 2c10b04a7)

## Phase 4 - User Visual Acceptance Testing (owner: Claude, updated: 2026-06-01)
### Stream: User Visual Acceptance Testing
15. [DONE] `user-visual-acceptance` Hand over the VSIX and wait for explicit user visual acceptance of the bottom-bar alignment — scope: user acceptance gate Result: User tested 1.2.432: status panel bottom drop ACCEPTED. OPEN SETTINGS rejected - button height not equal to visible chip (32px) and not on the same horizontal line as the chips. HTML prototype doc/tmp/prototypes/open-settings-bottom-align.html approved by user as the target. Proceeding to fix and re-release 1.2.433.

## Phase 5 - Open Settings Alignment Fix Round 2 (owner: Claude, updated: 2026-06-01)
### Stream: Open Settings Height & Baseline Fix
16. [DONE] `open-settings-baseline-fix` Set the OPEN SETTINGS button height to 32px (the visible chip height) and make the footer zone symmetric (17px top/bottom) so the button top/bottom align with the status chips baseline; sync the planning doc — scope: `packages/ui/project-manager/styles.css, doc/SolidWorks-WorkFlow/Plans/SessionStatus_OpenSettings_BottomBar_Alignment_Layout.md`; expected commit: `fix: align open settings button height and baseline with status chips`
17. [DONE] Git Commit: `fix: align open settings button height and baseline with status chips` (hash: 34f8eeead)

## Phase 6 - Re-Verification & Release 1.2.433 (owner: Claude, updated: 2026-06-01)
### Stream: Tooling Verification
18. [DONE] `layout-verify-2` Rebuild the project-manager bundle and confirm the new footer/button CSS is injected — scope: `project-manager build` Result: Verification passed: build:project-manager regenerated dist with new CSS - footer 'padding: 17px 12px' (symmetric) present, old '13px 12px 8px' gone, settings button 'min-height: 32px' present. dist gitignored, no tracked artifacts dirtied.

### Stream: Release Build
19. [DONE] `release-docs-2` Update README "Current Release" and CHANGELOG for 1.2.433 — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.433 release notes`
20. [DONE] Git Commit: `docs: prepare 1.2.433 release notes` (hash: 6bae49de1)
21. [DONE] `release-build-2` Run `./scripts/build-all.sh` to bump versions to 1.2.433 and rebuild provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.433 release`
22. [DONE] Git Commit: `chore: build 1.2.433 release` (hash: 1f274c582)
23. [DONE] `release-vsix-2` Run `./scripts/build-release.sh --use-current-version` to package the 1.2.433 VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.433 vsix`
24. [PENDING] Git Commit: `chore: package 1.2.433 vsix` (hash: TBD)

## Phase 7 - User Visual Acceptance Testing Round 2 (owner: Claude, updated: 2026-06-01)
### Stream: User Visual Acceptance Testing
25. [TODO] `user-visual-acceptance-2` Hand over the 1.2.433 VSIX and wait for explicit user visual acceptance of the OPEN SETTINGS alignment — scope: user acceptance gate

## Phase 8 - Scope Closeout (owner: Claude, updated: 2026-06-01)
### Stream: Scope Closeout
26. [TODO] `scope-closeout` After acceptance, archive the todo-plan and planning doc and refresh the docs index — scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/**`
