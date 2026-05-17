# Plan Closeout: managed-review-confirm-button-2026-05-17

**Created:** 2026-05-17T18:16:06.528Z
**Acceptance:** User accepted v1.2.296 retest: managed review card shows Подтверждаю button in the requested position and behavior is correct.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** managed-review-confirm.phase5.closeout.task1
**Expected Commit:** docs: close managed review confirm button scope
**Last Recorded Commit:** 02df981b7
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/ManagedReview_ConfirmButton_Planning.md

## Active Plan Copy

````markdown
# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-review-confirm-button-2026-05-17",
  "branch": "main",
  "baseHead": "e7b5f78e0",
  "lastRecordedCommit": "02df981b7",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/ManagedReview_ConfirmButton_Planning.md",
  "currentTaskId": "managed-review-confirm.phase5.closeout.task1",
  "expectedCommitMessage": "docs: close managed review confirm button scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/ManagedReview_ConfirmButton_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/ManagedReview_ConfirmButton_Planning.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- Scope: replace managed user-review prose acceptance with a visible `Подтверждаю` action button on the Core/system review card.
- Core remains workflow authority: the UI button submits user intent only; Core classifies acceptance and advances managed stage plans.
- Do not add Project Manager-owned acceptance state or direct plan mutation.
- Keep microtasks to no more than 3 files each.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks. Do not bypass hooks.
- Release build requires separate explicit user confirmation.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-05-17)

### Stream: Active Scope Creation

1. [DONE] `managed-review-confirm.phase0.plan.task1` Create planning source, register it in Docs_Index, and open the active todo-plan (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/ManagedReview_ConfirmButton_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan managed review confirmation button`).
2. [DONE] Git Commit: `docs: plan managed review confirmation button` (hash: 8cab9d7cc)

## Phase 1 - Managed Review Confirmation UX (owner: Codex, updated: 2026-05-17)

### Stream: Core Handoff Copy

3. [DONE] `managed-review-confirm.phase1.core.task1` Replace managed user-review handoff copy so it points to the inline button instead of instructing users to type `подтверждаю`, and update Core handoff tests (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-user-handoff-messages.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts`; expected commit: `fix: update managed review handoff copy`).
4. [DONE] Git Commit: `fix: update managed review handoff copy` (hash: 9e57d51f5)

### Stream: Session UI Button

5. [DONE] `managed-review-confirm.phase1.ui.task1` Render an inline `Подтверждаю` action on `managed-workflow-user-review` system cards and route it through the existing send path (scope: `src/client/ui/src/session/dialog-panel.tsx, src/client/ui/src/session/session-view.tsx, media/session-view.css`; expected commit: `feat: add managed review confirm button`).
6. [DONE] Git Commit: `feat: add managed review confirm button` (hash: 4fc0202eb)

### Stream: UI Regression Coverage

7. [DONE] `managed-review-confirm.phase1.test.task1` Add render coverage for the managed review confirm button on the system dialog card (scope: `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts`; expected commit: `test: cover managed review confirm button`).
8. [DONE] Git Commit: `test: cover managed review confirm button` (hash: b1cf221b0)

## Phase 2 - Documentation And Verification (owner: Codex, updated: 2026-05-17)

### Stream: SSOT Documentation

9. [DONE] `managed-review-confirm.phase2.docs.task1` Document that managed review acceptance may be submitted from the inline system-card button while Core remains acceptance authority (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`; expected commit: `docs: document managed review confirm button`).
10. [DONE] Git Commit: `docs: document managed review confirm button` (hash: 59f06a1c8)

### Stream: Tooling Verification

11. [DONE] `managed-review-confirm.phase2.verify.task1` Run targeted Core/UI tests plus webview typecheck and record results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify managed review confirm button`).
    - Verification 2026-05-17: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts` passed 3/3.
    - Verification 2026-05-17: `npx tsx --test packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.test.ts` passed 2/2, including terminal `### Stream: User Return And Revisions`.
    - Verification 2026-05-17: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts` passed 5/5.
    - Verification 2026-05-17: `npx tsx --test src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts` passed 8/8; React emitted existing SSR `useLayoutEffect` warnings for static markup rendering.
    - Verification 2026-05-17: `npm run typecheck:webview` passed.
12. [DONE] Git Commit: `test: verify managed review confirm button` (hash: e98742edc)

## Phase 3 - Release Build (owner: Codex, updated: 2026-05-17)

### Stream: Release Preparation

13. [DONE] `managed-review-confirm.phase3.release.docs.task1` Update release notes for v1.2.296 before version bump/build so packaged README/CHANGELOG include the managed review confirm button (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.296 release`).
14. [DONE] Git Commit: `docs: prepare 1.2.296 release` (hash: cc315beb6)

### Stream: Release Automation

15. [DONE] `managed-review-confirm.phase3.release.buildall.task1` Run `./scripts/build-all.sh` for v1.2.296 and record generated provider/core/UI/launcher tarball artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.296 artifacts`).
    - Verification 2026-05-17: `./scripts/build-all.sh --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated release artifacts: `claude-module-1.2.296.tar.bz2`, `codex-module-1.2.296.tar.bz2`, `gemini-module-1.2.296.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.296.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.296.tar.bz2`, `vscode-webview-1.2.296.tar.bz2`, `project-manager-1.2.296.tar.bz2`.
16. [DONE] Git Commit: `chore: build release 1.2.296 artifacts` (hash: 389322b0c)
17. [DONE] `managed-review-confirm.phase3.release.vsix.task1` Run `./scripts/build-release.sh --use-current-version` for v1.2.296 and record the generated VSIX package (scope: VSIX package, release artifacts, `doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.296 vsix`).
    - Verification 2026-05-17: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated package: `codeai-hub-1.2.296.vsix` (48M).
    - Release confirmations: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, `VSIX runtime package surface verified`, `Release build complete`.
18. [DONE] Git Commit: `chore: package release 1.2.296 vsix` (hash: 02df981b7)

## Phase 4 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-17)

### Stream: User Retest

19. [DONE] `managed-review-confirm.phase4.acceptance.task1` User installs and retests v1.2.296, then confirms a managed user-review card shows the inline `Подтверждаю` button and that the button submits acceptance and advances the Core-owned stage lifecycle (scope: user workflow acceptance only; expected commit: none). Result: User accepted v1.2.296 retest: managed review card shows Подтверждаю button in the requested position and behavior is correct.

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-05-17)

### Stream: Scope Closeout

20. [IN_PROGRESS] `managed-review-confirm.phase5.closeout.task1` After explicit user acceptance, archive the active todo-plan, resolve the planning document disposition, and update Docs_Index if needed (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed review confirm button scope`).
21. [TODO] Git Commit: `docs: close managed review confirm button scope` (hash: TBD)
````
