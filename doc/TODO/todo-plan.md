# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "pm-sidebar-settings-action-2026-05-17",
  "branch": "main",
  "baseHead": "3ad97771b",
  "lastRecordedCommit": "3094a80d6",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/PM_Sidebar_Settings_Action_Planning.md",
  "currentTaskId": "pm-sidebar-settings.phase15.docs.review-gate.task1",
  "expectedCommitMessage": "docs: clarify preliminary review gate behavior",
  "debt": {
    "expectedCommitMessage": "docs: clarify preliminary review gate behavior",
    "preCommitHead": "3094a80d6",
    "stage": "commit_pending",
    "taskId": "pm-sidebar-settings.phase15.docs.review-gate.task1"
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
20. [DONE] Git Commit: `test: verify pm main area edge gutter` (hash: 3c71d5b25)

## Phase 5 - Release Build For Retest (owner: Codex, updated: 2026-05-17)

### Stream: Release Confirmation Gate

21. [DONE] `pm-sidebar-settings.phase5.release.confirm.task1` Wait for explicit user confirmation before preparing or building the next retest release after the gutter fix (scope: user release confirmation only; expected commit: none). Result: User confirmed release build for v1.2.298 after the Project Manager edge gutter fix.

### Stream: Release Preparation

22. [DONE] `pm-sidebar-settings.phase5.release.docs.task1` After release confirmation, update release notes for v1.2.298 before version bump/build so packaged README/CHANGELOG include the Project Manager edge gutter fix (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.298 release`).
    - Release docs 2026-05-17: `README.md` Current Release and `CHANGELOG.md` now describe v1.2.298 Project Manager edge gutter polish.
23. [DONE] Git Commit: `docs: prepare 1.2.298 release` (hash: 36d9e7b0c)

### Stream: Release Automation

24. [DONE] `pm-sidebar-settings.phase5.release.buildall.task1` Run `./scripts/build-all.sh` for v1.2.298 and record generated provider/core/UI/launcher tarball artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.298 artifacts`).
    - Verification 2026-05-17: `./scripts/build-all.sh --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated artifacts 2026-05-17: `claude-module-1.2.298.tar.bz2`, `codex-module-1.2.298.tar.bz2`, `gemini-module-1.2.298.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.298.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.298.tar.bz2`, `vscode-webview-1.2.298.tar.bz2`, `project-manager-1.2.298.tar.bz2`.
25. [DONE] Git Commit: `chore: build release 1.2.298 artifacts` (hash: 7f070a51d)
26. [DONE] `pm-sidebar-settings.phase5.release.vsix.task1` Run `./scripts/build-release.sh --use-current-version` for v1.2.298 and record the generated VSIX package (scope: VSIX package, release artifacts, `doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.298 vsix`).
    - Verification 2026-05-17: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated package 2026-05-17: `codeai-hub-1.2.298.vsix` (48M).
    - Release confirmations 2026-05-17: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, `VSIX runtime package surface verified`, `Release build complete`.
27. [DONE] Git Commit: `chore: package release 1.2.298 vsix` (hash: 97818f0bc)

## Phase 6 - User Visual Acceptance Testing (owner: Oleksandr, updated: 2026-05-17)

### Stream: User Retest

28. [DONE] `pm-sidebar-settings.phase6.acceptance.task1` User installs and tests the next release, then confirms the bottom footer is gone, `Workflow Tree MVP` is not visible, `Open Settings` sits at the bottom of the left sidebar, and the main area has matching bottom/right gutters (scope: user visual acceptance only; expected commit: none). Result: User acceptance moved into new step progression usability feedback stream.

## Phase 7 - Step Progression Usability Feedback (owner: Codex, updated: 2026-05-18)

### Stream: Review Confirmation Flow

29. [DONE] `pm-sidebar-settings.phase7.feedback.review-flow.task1` Extend Core-owned review handoff and Project Manager session confirmation so Description and Virtual Simulation show the same `Подтверждаю` action and confirmation activates the next workflow step card (scope: `packages/core/src/managed-workflow-orchestration/**, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn*, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, src/client/ui/src/session/session-view*, src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `feat: extend workflow review confirmation flow`).
30. [DONE] Git Commit: `feat: extend workflow review confirmation flow` (hash: fa6ac261a)

### Stream: Next Step Card Polish

31. [DONE] `pm-sidebar-settings.phase7.feedback.start-card.task1` Remove the managed orchestration preview block from the next-step card and widen listbox options so model names fit horizontally (scope: `src/client/project-manager/components/shared/stage-confirmation-card.tsx, src/client/project-manager/components/capture-workbench/dom-listbox-selector.tsx, src/client/project-manager/components/shared/stage-confirmation-card.test.ts, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`; expected commit: `fix: polish workflow start card controls`).
32. [DONE] Git Commit: `fix: polish workflow start card controls` (hash: 45bf72b93)

### Stream: Tooling Verification

33. [DONE] `pm-sidebar-settings.phase7.feedback.verify.task1` Run targeted Core/PM tests and webview checks for the step progression usability fixes, then record results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify workflow step progression polish`).
    - Verification 2026-05-18: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts src/client/project-manager/components/shared/stage-confirmation-card.test.ts` passed 13/13.
    - Verification 2026-05-18: `npm run typecheck:webview` passed.
    - Verification 2026-05-18: `npm run build --workspace @codeai-hub/core` passed.
    - Verification 2026-05-18: `npm run build:project-manager` passed.
    - Verification 2026-05-18: `npm run build:webview` passed.
    - Browser note 2026-05-18: Project Manager is packaged as a VS Code/CEF webview bundle and this repo has no standalone PM dev-server target for direct Browser inspection.
34. [DONE] Git Commit: `test: verify workflow step progression polish` (hash: eaa91a277)

## Phase 8 - Release Build For Retest (owner: Codex, updated: 2026-05-18)

### Stream: Release Confirmation Gate

35. [DONE] `pm-sidebar-settings.phase8.release.confirm.task1` Wait for explicit user confirmation before preparing or building the next retest release after the step progression usability fixes (scope: user release confirmation only; expected commit: none). Result: User confirmed release build for v1.2.299 after the workflow step progression polish.

### Stream: Release Preparation

36. [DONE] `pm-sidebar-settings.phase8.release.docs.task1` After release confirmation, update release notes for v1.2.299 before version bump/build so packaged README/CHANGELOG include the workflow step progression usability fixes (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.299 release`).
    - Release docs 2026-05-18: `README.md` Current Release and `CHANGELOG.md` now describe v1.2.299 workflow step progression polish.
37. [DONE] Git Commit: `docs: prepare 1.2.299 release` (hash: d2b27c27c)

### Stream: Release Automation

38. [DONE] `pm-sidebar-settings.phase8.release.buildall.task1` Run `./scripts/build-all.sh` for v1.2.299 and record generated provider/core/UI/launcher tarball artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.299 artifacts`).
    - Verification 2026-05-18: `./scripts/build-all.sh --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated artifacts 2026-05-18: `claude-module-1.2.299.tar.bz2`, `codex-module-1.2.299.tar.bz2`, `gemini-module-1.2.299.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.299.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.299.tar.bz2`, `vscode-webview-1.2.299.tar.bz2`, `project-manager-1.2.299.tar.bz2`.
39. [DONE] Git Commit: `chore: build release 1.2.299 artifacts` (hash: 4327515c5)
40. [DONE] `pm-sidebar-settings.phase8.release.vsix.task1` Run `./scripts/build-release.sh --use-current-version` for v1.2.299 and record the generated VSIX package (scope: VSIX package, release artifacts, `doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.299 vsix`).
    - Verification 2026-05-18: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated package 2026-05-18: `codeai-hub-1.2.299.vsix` (48M).
    - Release confirmations 2026-05-18: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, `VSIX runtime package surface verified`, `Release build complete`.
41. [DONE] Git Commit: `chore: package release 1.2.299 vsix` (hash: 34b946b2b)

## Phase 9 - Acceptance Feedback Fix (owner: Codex, updated: 2026-05-18)

### Stream: Preliminary Step Handoff Regression

42. [DONE] `pm-sidebar-settings.phase9.feedback.preliminary-handoff.task1` Remove the premature Core-owned review handoff from Description and Virtual Simulation so these provider-direct preliminary steps start normally and do not show a system completion card at session start (scope: `packages/core/src/managed-workflow-orchestration/preliminary-review-handoff.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.ts, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `fix: suppress preliminary workflow handoff`). Regression source: v1.2.299 user retest showed `Core: Description completed` immediately after the initial provider prompt, before the agent worked.
43. [DONE] Git Commit: `fix: suppress preliminary workflow handoff` (hash: a0fc8f156)
44. [DONE] `pm-sidebar-settings.phase9.feedback.verify.task1` Run targeted Core preliminary handoff regression tests and affected builds/typechecks, then record results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify preliminary workflow handoff fix`).
    - Verification 2026-05-18: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts` passed 6/6.
    - Verification 2026-05-18: `npm run build --workspace @codeai-hub/core` passed.
    - Verification 2026-05-18: `npm run typecheck:webview` passed.
    - Verification 2026-05-18: `npm run build:webview` passed.
    - Verification 2026-05-18: `npm run build:project-manager` passed.
45. [DONE] Git Commit: `test: verify preliminary workflow handoff fix` (hash: 755f4b32c)

## Phase 10 - Release Build For Retest (owner: Codex, updated: 2026-05-18)

### Stream: Release Confirmation Gate

46. [DONE] `pm-sidebar-settings.phase10.release.confirm.task1` Wait for explicit user confirmation before preparing or building the next retest release after the preliminary handoff regression fix (scope: user release confirmation only; expected commit: none). Result: User confirmed release build for v1.2.300 after the Description/Virtual Simulation premature Core handoff fix.

### Stream: Release Preparation

47. [DONE] `pm-sidebar-settings.phase10.release.docs.task1` After release confirmation, update release notes for v1.2.300 before version bump/build so packaged README/CHANGELOG include the preliminary handoff regression fix (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.300 release`).
    - Release docs 2026-05-18: `README.md` Current Release and `CHANGELOG.md` now describe v1.2.300 preliminary step handoff regression fix.
48. [DONE] Git Commit: `docs: prepare 1.2.300 release` (hash: 922760804)

### Stream: Release Automation

49. [DONE] `pm-sidebar-settings.phase10.release.buildall.task1` Run `./scripts/build-all.sh` for v1.2.300 and record generated provider/core/UI/launcher tarball artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.300 artifacts`).
    - Verification 2026-05-18: `./scripts/build-all.sh --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated artifacts 2026-05-18: `claude-module-1.2.300.tar.bz2`, `codex-module-1.2.300.tar.bz2`, `gemini-module-1.2.300.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.300.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.300.tar.bz2`, `vscode-webview-1.2.300.tar.bz2`, `project-manager-1.2.300.tar.bz2`.
50. [DONE] Git Commit: `chore: build release 1.2.300 artifacts` (hash: 93680509f)
51. [DONE] `pm-sidebar-settings.phase10.release.vsix.task1` Run `./scripts/build-release.sh --use-current-version` for v1.2.300 and record the generated VSIX package (scope: VSIX package, release artifacts, `doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.300 vsix`).
    - Verification 2026-05-18: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated package 2026-05-18: `codeai-hub-1.2.300.vsix` (49M reported by release script; filesystem size 48M).
    - Release confirmations 2026-05-18: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, `VSIX runtime package surface verified`, `Release build complete`.
52. [DONE] Git Commit: `chore: package release 1.2.300 vsix` (hash: 2a4491eca)

## Phase 11 - Acceptance Feedback Fix (owner: Codex, updated: 2026-05-18)

### Stream: Preliminary Step Router Separation

53. [DONE] `pm-sidebar-settings.phase11.feedback.preliminary-router.task1` Remove Description/Virtual Simulation from managed review decision interception and turn-completion hooks so startup prompts containing confirmation instructions are dispatched to providers instead of being consumed as Core acceptance (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts, packages/core/src/managed-workflow-orchestration, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `fix: route preliminary prompts to providers`). Regression source: v1.2.300 user retest still showed `Core: Description completed` immediately after the start prompt because the generic managed review classifier intercepted preliminary stage text containing `подтверждаю`.
54. [DONE] Git Commit: `fix: route preliminary prompts to providers` (hash: 7827efdfb)
55. [DONE] `pm-sidebar-settings.phase11.feedback.verify.task1` Run targeted preliminary router regression tests and affected Core/UI builds, then record results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify preliminary provider routing`).
    - Verification 2026-05-18: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts` passed 13/13.
    - Verification 2026-05-18: `npm run build --workspace @codeai-hub/core` passed.
    - Verification 2026-05-18: `npm run typecheck:webview` passed.
    - Verification 2026-05-18: `npm run build:webview` passed.
    - Verification 2026-05-18: `npm run build:project-manager` passed.
56. [DONE] Git Commit: `test: verify preliminary provider routing` (hash: f185a940d)

## Phase 12 - Release Build For Retest (owner: Codex, updated: 2026-05-18)

### Stream: Release Confirmation Gate

57. [DONE] `pm-sidebar-settings.phase12.release.confirm.task1` Wait for explicit user confirmation before preparing or building the next retest release after the preliminary router separation fix (scope: user release confirmation only; expected commit: none). Result: User confirmed release build for v1.2.301 after the v1.2.300 retest still showed premature Description completion.

### Stream: Release Preparation

58. [DONE] `pm-sidebar-settings.phase12.release.docs.task1` After release confirmation, update release notes for v1.2.301 before version bump/build so packaged README/CHANGELOG include the provider-direct preliminary routing fix (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.301 release`).
    - Release docs 2026-05-18: `README.md` Current Release and `CHANGELOG.md` now describe v1.2.301 provider-direct preliminary routing fix.
59. [DONE] Git Commit: `docs: prepare 1.2.301 release` (hash: 36744ae38)

### Stream: Release Automation

60. [DONE] `pm-sidebar-settings.phase12.release.buildall.task1` Run `./scripts/build-all.sh` for v1.2.301 and record generated provider/core/UI/launcher tarball artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.301 artifacts`).
    - Verification 2026-05-18: `./scripts/build-all.sh --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated artifacts 2026-05-18: `claude-module-1.2.301.tar.bz2`, `codex-module-1.2.301.tar.bz2`, `gemini-module-1.2.301.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.301.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.301.tar.bz2`, `vscode-webview-1.2.301.tar.bz2`, `project-manager-1.2.301.tar.bz2`.
61. [DONE] Git Commit: `chore: build release 1.2.301 artifacts` (hash: 383154504)
62. [DONE] `pm-sidebar-settings.phase12.release.vsix.task1` Run `./scripts/build-release.sh --use-current-version` for v1.2.301 and record the generated VSIX package (scope: VSIX package, release artifacts, `doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.301 vsix`).
    - Verification 2026-05-18: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated package 2026-05-18: `codeai-hub-1.2.301.vsix` (49M reported by release script; filesystem size 48M).
    - Release confirmations 2026-05-18: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, `VSIX runtime package surface verified`, `Release build complete`.
63. [DONE] Git Commit: `chore: package release 1.2.301 vsix` (hash: 9ccecc2f8)

## Phase 13 - Acceptance Feedback Fix (owner: Codex, updated: 2026-05-18)

### Stream: Preliminary Review Gate

64. [DONE] `pm-sidebar-settings.phase13.feedback.preliminary-gate.task1` Restore the Description/Virtual Simulation post-turn Core review gate without reintroducing startup prompt interception (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `fix: restore preliminary review gate`). Regression source: v1.2.301 user retest showed provider work starts, but after the agent asks questions Core does not append the `Подтверждаю` review card for Description.
65. [DONE] Git Commit: `fix: restore preliminary review gate` (hash: ed45b8132)
66. [DONE] `pm-sidebar-settings.phase13.feedback.verify.task1` Add and run preliminary review-gate regression tests plus affected Core/UI builds, then record results (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts, src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: verify preliminary review gate`).
    - Verification 2026-05-18: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.preliminary.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts` passed 15/15.
    - Verification 2026-05-18: `npm run build --workspace @codeai-hub/core` passed.
    - Verification 2026-05-18: `npm run typecheck:webview` passed.
    - Verification 2026-05-18: `npm run build:webview` passed.
    - Verification 2026-05-18: `npm run build:project-manager` passed.
67. [DONE] Git Commit: `test: verify preliminary review gate` (hash: 12fb51f82)

## Phase 14 - Release Build For Retest (owner: Codex, updated: 2026-05-18)

### Stream: Release Confirmation Gate

68. [DONE] `pm-sidebar-settings.phase14.release.confirm.task1` Wait for explicit user confirmation before preparing or building the next retest release after the preliminary review-gate fix (scope: user release confirmation only; expected commit: none). Result: User requested the fix and a new release build after v1.2.301 missed the post-turn Core review card.

### Stream: Release Preparation

69. [DONE] `pm-sidebar-settings.phase14.release.docs.task1` After release confirmation, update release notes for v1.2.302 before version bump/build so packaged README/CHANGELOG include the preliminary review gate fix (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.302 release`).
    - Release docs 2026-05-18: `README.md` Current Release and `CHANGELOG.md` now describe v1.2.302 preliminary review gate fix.
70. [DONE] Git Commit: `docs: prepare 1.2.302 release` (hash: be037bb4f)

### Stream: Release Automation

71. [DONE] `pm-sidebar-settings.phase14.release.buildall.task1` Run `./scripts/build-all.sh` for v1.2.302 and record generated provider/core/UI/launcher tarball artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.302 artifacts`).
    - Verification 2026-05-18: `./scripts/build-all.sh --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated artifacts 2026-05-18: `claude-module-1.2.302.tar.bz2`, `codex-module-1.2.302.tar.bz2`, `gemini-module-1.2.302.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.302.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.302.tar.bz2`, `vscode-webview-1.2.302.tar.bz2`, `project-manager-1.2.302.tar.bz2`.
72. [DONE] Git Commit: `chore: build release 1.2.302 artifacts` (hash: ae41287a6)
73. [DONE] `pm-sidebar-settings.phase14.release.vsix.task1` Run `./scripts/build-release.sh --use-current-version` for v1.2.302 and record the generated VSIX package (scope: VSIX package, release artifacts, `doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.302 vsix`).
    - Verification 2026-05-18: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated package 2026-05-18: `codeai-hub-1.2.302.vsix` (49M reported by release script; filesystem size 48M).
    - Release confirmations 2026-05-18: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, `VSIX runtime package surface verified`, `Release build complete`.
74. [DONE] Git Commit: `chore: package release 1.2.302 vsix` (hash: 3094a80d6)

## Phase 15 - Preliminary Review Gate Documentation (owner: Codex, updated: 2026-05-18)

### Stream: Review Gate SSOT Clarification

75. [DONE] `pm-sidebar-settings.phase15.docs.review-gate.task1` Clarify the Core-owned preliminary review gate in system/session workflow SSOT docs, including repeated post-turn gate behavior and UI button acceptance (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`; expected commit: `docs: clarify preliminary review gate behavior`).
76. [PENDING] Git Commit: `docs: clarify preliminary review gate behavior` (hash: TBD)
77. [TODO] `pm-sidebar-settings.phase15.docs.step-contracts.task1` Clarify Description, Virtual Simulation, and orchestration boundary contracts for the same repeated review-card and `Подтверждаю` button semantics (scope: `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md, doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`; expected commit: `docs: document preliminary review gate contracts`).
78. [TODO] Git Commit: `docs: document preliminary review gate contracts` (hash: TBD)

## Phase 16 - User Visual Acceptance Testing (owner: Oleksandr, updated: 2026-05-18)

### Stream: User Retest

79. [TODO] `pm-sidebar-settings.phase16.acceptance.task1` User installs and tests the next release, then confirms Description and Virtual Simulation start agent work without a premature Core completion card, show the post-turn Core review card with `Подтверждаю`, repeat that review card after agent revisions, and the confirmation button opens the next step card (scope: user visual acceptance only; expected commit: none).

## Phase 17 - Scope Closeout (owner: Codex, updated: 2026-05-18)

### Stream: Scope Closeout

80. [TODO] `pm-sidebar-settings.phase17.closeout.task1` After explicit user acceptance, archive the active todo-plan, resolve the planning document disposition, and update Docs_Index if needed (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close pm sidebar settings action scope`).
81. [TODO] Git Commit: `docs: close pm sidebar settings action scope` (hash: TBD)
82. [TODO] `pm-sidebar-settings.phase17.closeout.handoff` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
