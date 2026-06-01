# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "clear-menu-dialog-restyle-2026-06-01",
  "branch": "main",
  "baseHead": "a8da6740b",
  "lastRecordedCommit": "f002a0a0e",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/ClearMenu_ConfirmDialog_Restyle_DesignSystem.md",
  "currentTaskId": "release-vsix-2",
  "expectedCommitMessage": "chore: package 1.2.436 vsix",
  "debt": {
    "expectedCommitMessage": "chore: package 1.2.436 vsix",
    "preCommitHead": "f002a0a0e",
    "stage": "commit_pending",
    "taskId": "release-vsix-2"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ClearMenu_ConfirmDialog_Restyle_DesignSystem.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Plans/ClearMenu_ConfirmDialog_Restyle_DesignSystem.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit: ...` item.
- Keep micro-task file scope at three files/packages or less.
- Pure visual / className refactor: no behavior or workflow-truth change; reuse PM design tokens and `.pm-modal*` / `.pm-workspace-menu*` patterns.
- Do not run the release build without explicit user confirmation (Release Build Confirmation Gate).
- Scope closeout requires explicit user acceptance.

## Phase 1 - Planning Intake (owner: Claude, updated: 2026-06-01)
### Stream: Planning Intake
1. [DONE] `planning-intake` Create the planning doc and active todo-plan, register the planning doc in the docs index — scope: `doc/SolidWorks-WorkFlow/Plans/ClearMenu_ConfirmDialog_Restyle_DesignSystem.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan clear menu and confirm dialog restyle`
2. [DONE] Git Commit: `docs: plan clear menu and confirm dialog restyle` (hash: 487f580bb)

## Phase 2 - Restyle Implementation (owner: Claude, updated: 2026-06-01)
### Stream: Restyle Clear Menu & Confirm Dialog
3. [DONE] `restyle-clear-menu` Replace the inline styles in the Clear context menu and confirm dialog with PM design-system classes (`.pm-tree-menu*` + `.pm-modal__button--danger`), reusing `--pm-*` tokens and the `.pm-modal` / `.pm-workspace-menu` patterns; keep only the cursor `left/top` inline — scope: `packages/ui/project-manager/styles.css, src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx`; expected commit: `fix: restyle clear menu and confirm dialog to design system`
4. [DONE] Git Commit: `fix: restyle clear menu and confirm dialog to design system` (hash: 136ce1628)

## Phase 3 - Verification & Prototype (owner: Claude, updated: 2026-06-01)
### Stream: Tooling Verification
5. [DONE] `restyle-verify` Rebuild the project-manager bundle and typecheck the webview; confirm the new classes are injected — scope: `project-manager build + webview typecheck` Result: Verification passed: build:project-manager regenerated dist, typecheck:webview clean. New design-system classes confirmed in the bundle: pm-tree-menu (9 occurrences) and pm-modal__button--danger (2). No tracked artifacts dirtied.

### Stream: Prototype Visual Check
6. [DONE] `prototype-check` Produce an HTML prototype of the restyled menu + dialog and get the user to confirm the design before the release build — scope: prototype + user design confirmation gate Result: User approved the restyle prototype (doc/tmp/prototypes/clear-menu-restyle.html) as the target design.

## Phase 4 - Release Confirmation (owner: Claude, updated: 2026-06-01)
### Stream: Release Build Confirmation
7. [DONE] `release-confirmation` Ask the user explicitly to confirm building a new release before any version bump or build script — scope: user confirmation gate Result: User confirmed building release 1.2.435 with the restyled Clear menu and confirm dialog.

## Phase 5 - Release Build (owner: Claude, updated: 2026-06-01)
### Stream: Release Build
8. [DONE] `release-docs` Update README "Current Release" and CHANGELOG for 1.2.435 — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.435 release notes`
9. [DONE] Git Commit: `docs: prepare 1.2.435 release notes` (hash: ddc199682)
10. [DONE] `release-build` Run `./scripts/build-all.sh` to bump versions to 1.2.435 and rebuild provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.435 release`
11. [DONE] Git Commit: `chore: build 1.2.435 release` (hash: 9d2f8ff6a)
12. [DONE] `release-vsix` Run `./scripts/build-release.sh --use-current-version` to package the 1.2.435 VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.435 vsix`
13. [DONE] Git Commit: `chore: package 1.2.435 vsix` (hash: 2a916409f)

## Phase 6 - User Visual Acceptance Testing (owner: Claude, updated: 2026-06-01)
### Stream: User Visual Acceptance Testing
14. [DONE] `user-visual-acceptance` Hand over the 1.2.435 VSIX and wait for explicit user visual acceptance of the restyled menu and dialog — scope: user acceptance gate Result: User reviewed 1.2.435: design direction accepted but the menu item was off (text not centered, button too large from a fixed height without flex centering) and menu/dialog did not yet read as part of the design. Approved the interactive prototype with a compact centered menu item, compact 32px dialog buttons; also requested renaming Clear to Clear/Undo since the action is an undo via Git rollback. Proceeding to polish + re-release 1.2.436.

## Phase 7 - Restyle Polish & Clear/Undo Round 2 (owner: Claude, updated: 2026-06-01)
### Stream: Menu Polish & Clear/Undo Label
16. [DONE] `restyle-polish` Center and compact the menu item (flex centering, no fixed height), use compact 32px dialog buttons, and rename the Clear action to "Clear/Undo" (it is an undo via Git rollback) on the menu item and the danger button — scope: `packages/ui/project-manager/styles.css, src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx`; expected commit: `fix: polish clear menu and rename clear to clear/undo`
17. [DONE] Git Commit: `fix: polish clear menu and rename clear to clear/undo` (hash: af4b65b6b)

## Phase 8 - Re-Verification & Release 1.2.436 (owner: Claude, updated: 2026-06-01)
### Stream: Tooling Verification
18. [DONE] `restyle-verify-2` Rebuild the project-manager bundle and typecheck the webview; confirm the polished classes and Clear/Undo label are injected — scope: `project-manager build + webview typecheck` Result: Verification passed: build:project-manager OK, typecheck:webview clean. app.js contains Clear/Undo (2) and pm-tree-menu__btn--danger; bundle CSS has pm-tree-menu__item flex-centered and compact pm-tree-menu__btn; old pm-modal__button--danger removed.

### Stream: Release Build Confirmation
19. [DONE] `release-confirmation-2` Ask the user explicitly to confirm building a new release before any version bump or build script — scope: user confirmation gate Result: User confirmed building release 1.2.436 with the polished menu and Clear/Undo label.

### Stream: Release Build
20. [DONE] `release-docs-2` Update README "Current Release" and CHANGELOG for 1.2.436 — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.436 release notes`
21. [DONE] Git Commit: `docs: prepare 1.2.436 release notes` (hash: 561562481)
22. [DONE] `release-build-2` Run `./scripts/build-all.sh` to bump versions to 1.2.436 and rebuild provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.436 release`
23. [DONE] Git Commit: `chore: build 1.2.436 release` (hash: f002a0a0e)
24. [DONE] `release-vsix-2` Run `./scripts/build-release.sh --use-current-version` to package the 1.2.436 VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.436 vsix`
25. [PENDING] Git Commit: `chore: package 1.2.436 vsix` (hash: TBD)

## Phase 9 - User Visual Acceptance Testing Round 2 (owner: Claude, updated: 2026-06-01)
### Stream: User Visual Acceptance Testing
26. [TODO] `user-visual-acceptance-2` Hand over the 1.2.436 VSIX and wait for explicit user visual acceptance of the polished menu, dialog, and Clear/Undo label — scope: user acceptance gate

## Phase 10 - Scope Closeout (owner: Claude, updated: 2026-06-01)
### Stream: Scope Closeout
27. [TODO] `scope-closeout` After acceptance, archive the todo-plan and planning doc and refresh the docs index — scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/**`
