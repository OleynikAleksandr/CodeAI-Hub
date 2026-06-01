# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-tabbar-hide-idbar-raise-2026-06-01",
  "branch": "main",
  "baseHead": "7fd2c7e1a",
  "lastRecordedCommit": "7fd2c7e1a",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/SessionTabBar_Hide_IdBarRaise_Layout.md",
  "currentTaskId": "planning-intake",
  "expectedCommitMessage": "docs: plan hide session tab bar and raise id bar",
  "debt": {
    "expectedCommitMessage": "docs: plan hide session tab bar and raise id bar",
    "preCommitHead": "7fd2c7e1a",
    "stage": "commit_pending",
    "taskId": "planning-intake"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionTabBar_Hide_IdBarRaise_Layout.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Plans/SessionTabBar_Hide_IdBarRaise_Layout.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit: ...` item.
- Keep micro-task file scope at three files/packages or less.
- Pure visual / CSS scope: tab bar stays in code (hidden via CSS); no Core/contract/workflow-truth change.
- Do not run the release build without explicit user confirmation (Release Build Confirmation Gate).
- Scope closeout requires explicit user acceptance.

## Phase 1 - Planning Intake (owner: Claude, updated: 2026-06-01)
### Stream: Planning Intake
1. [DONE] `planning-intake` Create the planning doc and active todo-plan, register the planning doc in the docs index — scope: `doc/SolidWorks-WorkFlow/Plans/SessionTabBar_Hide_IdBarRaise_Layout.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan hide session tab bar and raise id bar`
2. [PENDING] Git Commit: `docs: plan hide session tab bar and raise id bar` (hash: TBD)

## Phase 2 - Tab Bar Hide Implementation (owner: Claude, updated: 2026-06-01)
### Stream: Hide Tab Bar & Raise ID Bar
3. [TODO] `hide-tabbar-raise-idbar` Hide the session tab bar (`.session-app__header { display: none }`, kept in code) and reduce the sessions-panel content top padding to the standard 8px gap so the session ID bar rises to the top — scope: `media/session-view.css, packages/ui/project-manager/styles.css`; expected commit: `feat: hide session tab bar and raise id bar`
4. [TODO] Git Commit: `feat: hide session tab bar and raise id bar` (hash: TBD)

## Phase 3 - Verification & Release (owner: Claude, updated: 2026-06-01)
### Stream: Tooling Verification
5. [TODO] `tabbar-verify` Rebuild the project-manager bundle and typecheck the webview; confirm the new CSS is injected — scope: `project-manager build + webview typecheck`

### Stream: Release Build Confirmation
6. [TODO] `release-confirmation` Ask the user explicitly to confirm building a new release before any version bump or build script — scope: user confirmation gate

### Stream: Release Build
7. [TODO] `release-docs` Update README "Current Release" and CHANGELOG for 1.2.434 — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.434 release notes`
8. [TODO] Git Commit: `docs: prepare 1.2.434 release notes` (hash: TBD)
9. [TODO] `release-build` Run `./scripts/build-all.sh` to bump versions to 1.2.434 and rebuild provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.434 release`
10. [TODO] Git Commit: `chore: build 1.2.434 release` (hash: TBD)
11. [TODO] `release-vsix` Run `./scripts/build-release.sh --use-current-version` to package the 1.2.434 VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.434 vsix`
12. [TODO] Git Commit: `chore: package 1.2.434 vsix` (hash: TBD)

## Phase 4 - User Visual Acceptance Testing (owner: Claude, updated: 2026-06-01)
### Stream: User Visual Acceptance Testing
13. [TODO] `user-visual-acceptance` Hand over the 1.2.434 VSIX and wait for explicit user visual acceptance of the hidden tab bar and raised ID bar — scope: user acceptance gate

## Phase 5 - Scope Closeout (owner: Claude, updated: 2026-06-01)
### Stream: Scope Closeout
14. [TODO] `scope-closeout` After acceptance, archive the todo-plan and planning doc and refresh the docs index — scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/**`
