# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "pm-sidebar-settings-action-2026-05-17",
  "branch": "main",
  "baseHead": "3ad97771b",
  "lastRecordedCommit": "21c99219a",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/PM_Sidebar_Settings_Action_Planning.md",
  "currentTaskId": "pm-sidebar-settings.phase4.feedback.verify.task1",
  "expectedCommitMessage": "test: verify pm main area edge gutter",
  "debt": {
    "expectedCommitMessage": "test: verify pm main area edge gutter",
    "preCommitHead": "21c99219a",
    "stage": "commit_pending",
    "taskId": "pm-sidebar-settings.phase4.feedback.verify.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/PM_Sidebar_Settings_Action_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/PM_Sidebar_Settings_Action_Planning.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- Scope: remove the Project Manager bottom footer/status bar and move `Open Settings` to the bottom of the left sidebar.
- Do not change Settings ownership: the button remains only a PM command surface that opens the existing right-panel Settings takeover.
- Keep the session and artifact panels vertically expanded by removing the footer render path.
- Keep microtasks to no more than 3 files each.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks. Do not bypass hooks.
- Release build requires separate explicit user confirmation.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-05-17)

### Stream: Active Scope Creation

1. [DONE] `pm-sidebar-settings.phase0.plan.task1` Create planning source, register it in Docs_Index, and open the active todo-plan (scope: `doc/SolidWorks-WorkFlow/Plans/PM_Sidebar_Settings_Action_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan pm sidebar settings action`).
2. [DONE] Git Commit: `docs: plan pm sidebar settings action` (hash: 5d606fc9a)

## Phase 1 - Project Manager Layout Update (owner: Codex, updated: 2026-05-17)

### Stream: Sidebar Settings Action

3. [DONE] `pm-sidebar-settings.phase1.layout.task1` Move `Open Settings` into the bottom of the left sidebar and remove the visible footer output (scope: `src/client/project-manager/components/layout/sidebar.tsx, src/client/project-manager/components/layout/status-bar.tsx, packages/ui/project-manager/styles.css`; expected commit: `feat: move pm settings action to sidebar`).
4. [DONE] Git Commit: `feat: move pm settings action to sidebar` (hash: abe67b6e3)
5. [DONE] `pm-sidebar-settings.phase1.cleanup.task1` Remove the obsolete footer component after the main layout no longer needs it (scope: `src/client/project-manager/components/layout/main-area.tsx, src/client/project-manager/components/layout/status-bar.tsx`; expected commit: `refactor: remove pm status bar component`).
6. [DONE] Git Commit: `refactor: remove pm status bar component` (hash: 728e18590)

## Phase 2 - Documentation And Verification (owner: Codex, updated: 2026-05-17)

### Stream: SSOT Documentation

7. [DONE] `pm-sidebar-settings.phase2.docs.task1` Update PM/UI bundle SSOT docs for sidebar-owned Settings action and removed bottom footer (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; expected commit: `docs: document pm sidebar settings action`).
8. [DONE] Git Commit: `docs: document pm sidebar settings action` (hash: df9ac14d8)

### Stream: Tooling Verification

9. [DONE] `pm-sidebar-settings.phase2.verify.task1` Run targeted PM layout verification and webview build/typecheck, then record results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify pm sidebar settings action`).
    - Verification 2026-05-17: `npx tsx --test src/client/project-manager/components/layout/workflow-navigation.test.ts` passed 1/1.
    - Verification 2026-05-17: `npm run typecheck:webview` passed.
    - Verification 2026-05-17: `npm run build:project-manager` passed.
    - Verification 2026-05-17: `npm run build:webview` passed.
    - Verification 2026-05-17: static search found no remaining PM source references to `StatusBar`, `status-bar`, `pm-status-bar`, `pm-status-open-settings`, `pm-status-hint`, `pm-status-zoom`, or visible `Workflow Tree MVP`.
    - Browser note 2026-05-17: in-app Browser blocked direct `file://` navigation to the generated Project Manager bundle by URL policy, so no browser screenshot was taken.
10. [DONE] Git Commit: `test: verify pm sidebar settings action` (hash: 6b133cc33)

## Phase 3 - Release Build (owner: Codex, updated: 2026-05-17)

### Stream: Release Preparation

11. [DONE] `pm-sidebar-settings.phase3.release.docs.task1` Update release notes for v1.2.297 before version bump/build so packaged README/CHANGELOG include the Project Manager sidebar Settings action change (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.297 release`).
12. [DONE] Git Commit: `docs: prepare 1.2.297 release` (hash: 5e94e6868)

### Stream: Release Automation

13. [DONE] `pm-sidebar-settings.phase3.release.buildall.task1` Run `./scripts/build-all.sh` for v1.2.297 and record generated provider/core/UI/launcher tarball artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.297 artifacts`).
    - Verification 2026-05-17: `./scripts/build-all.sh --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated artifacts 2026-05-17: `claude-module-1.2.297.tar.bz2`, `codex-module-1.2.297.tar.bz2`, `gemini-module-1.2.297.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.297.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.297.tar.bz2`, `vscode-webview-1.2.297.tar.bz2`, `project-manager-1.2.297.tar.bz2`.
14. [DONE] Git Commit: `chore: build release 1.2.297 artifacts` (hash: bd4aafa1d)
15. [DONE] `pm-sidebar-settings.phase3.release.vsix.task1` Run `./scripts/build-release.sh --use-current-version` for v1.2.297 and record the generated VSIX package (scope: VSIX package, release artifacts, `doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.297 vsix`).
    - Verification 2026-05-17: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated package 2026-05-17: `codeai-hub-1.2.297.vsix` (48M).
    - Release confirmations 2026-05-17: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, `VSIX runtime package surface verified`, `Release build complete`.
16. [DONE] Git Commit: `chore: package release 1.2.297 vsix` (hash: b4e8935cd)

## Phase 4 - Acceptance Feedback Fix (owner: Codex, updated: 2026-05-17)

### Stream: Edge Gutter Fix

17. [DONE] `pm-sidebar-settings.phase4.feedback.gutter.task1` Add an unhighlighted bottom/right gutter around the Project Manager main panel area so session status controls and artifact/settings controls do not touch the outer PM edge (scope: `packages/ui/project-manager/styles.css, doc/TODO/todo-plan.md`; expected commit: `fix: add pm main area edge gutter`).
18. [DONE] Git Commit: `fix: add pm main area edge gutter` (hash: 21c99219a)
19. [DONE] `pm-sidebar-settings.phase4.feedback.verify.task1` Run targeted Project Manager build/typecheck verification and record the result (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify pm main area edge gutter`).
    - Verification 2026-05-17: `npm run build:project-manager` passed.
    - Verification 2026-05-17: `npm run typecheck:webview` passed.
20. [PENDING] Git Commit: `test: verify pm main area edge gutter` (hash: TBD)

## Phase 5 - Release Build For Retest (owner: Codex, updated: 2026-05-17)

### Stream: Release Confirmation Gate

21. [TODO] `pm-sidebar-settings.phase5.release.confirm.task1` Wait for explicit user confirmation before preparing or building the next retest release after the gutter fix (scope: user release confirmation only; expected commit: none).

### Stream: Release Preparation

22. [TODO] `pm-sidebar-settings.phase5.release.docs.task1` After release confirmation, update release notes for v1.2.298 before version bump/build so packaged README/CHANGELOG include the Project Manager edge gutter fix (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.298 release`).
23. [TODO] Git Commit: `docs: prepare 1.2.298 release` (hash: TBD)

### Stream: Release Automation

24. [TODO] `pm-sidebar-settings.phase5.release.buildall.task1` Run `./scripts/build-all.sh` for v1.2.298 and record generated provider/core/UI/launcher tarball artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.298 artifacts`).
25. [TODO] Git Commit: `chore: build release 1.2.298 artifacts` (hash: TBD)
26. [TODO] `pm-sidebar-settings.phase5.release.vsix.task1` Run `./scripts/build-release.sh --use-current-version` for v1.2.298 and record the generated VSIX package (scope: VSIX package, release artifacts, `doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.298 vsix`).
27. [TODO] Git Commit: `chore: package release 1.2.298 vsix` (hash: TBD)

## Phase 6 - User Visual Acceptance Testing (owner: Oleksandr, updated: 2026-05-17)

### Stream: User Retest

28. [TODO] `pm-sidebar-settings.phase6.acceptance.task1` User installs and tests the next release, then confirms the bottom footer is gone, `Workflow Tree MVP` is not visible, `Open Settings` sits at the bottom of the left sidebar, and the main area has matching bottom/right gutters (scope: user visual acceptance only; expected commit: none).

## Phase 7 - Scope Closeout (owner: Codex, updated: 2026-05-17)

### Stream: Scope Closeout

29. [TODO] `pm-sidebar-settings.phase7.closeout.task1` After explicit user acceptance, archive the active todo-plan, resolve the planning document disposition, and update Docs_Index if needed (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close pm sidebar settings action scope`).
30. [TODO] Git Commit: `docs: close pm sidebar settings action scope` (hash: TBD)
31. [TODO] `pm-sidebar-settings.phase7.closeout.handoff` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
