# Development TODO Plan

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ProjectManager_DialogFileLinks_StandaloneFallback_Fix.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- Only this list is the recovery document pack for the current execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Every implementation task must stay within **<= 3 files**.
- Every implementation task must be followed by a separate `Git Commit:` line so the commit cannot be skipped.
- If a task grows past 3 files, it must be split before implementation continues.
- Real-time docs sync is mandatory: any architecture or behavior change must update the relevant `doc/` files in the same commit.
- Husky gates remain mandatory:
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Targeted manual validation is required before closing a stream when the touched area needs it:
  - `npm run build:project-manager`
  - `./scripts/build-cef-launcher.sh --launcher-version 1.1.901`
- `doc/TODO/todo-plan.md` must be updated in real time after every micro-task and every commit.

## Phase 1 — Standalone PM File-Link Fallback Fix (owner: Codex, updated: 2026-04-07)

### Stream: Planning And Recovery Reset
1. [DONE] Reconstruct the regression from the shipped `1.1.901` behavior and restate the product decision in `doc/SolidWorks-WorkFlow/Plans/ProjectManager_DialogFileLinks_StandaloneFallback_Fix.md`, `doc/TODO/todo-plan.md`, and `doc/SolidWorks-WorkFlow/Docs_Index.md`; scope: open a new execution cycle with the launcher-host fallback fix as the only active scope; expected commit message: `docs(pm): plan standalone file link fallback fix`
2. [DONE] Git Commit: `docs(pm): plan standalone file link fallback fix` (hash: `3a2dbfeec`)

### Stream: PM Launcher Bridge Fallback
3. [DONE] Update `src/client/project-manager/services/pm-bridges.ts`, `src/client/project-manager/services/project-manager-file-link-opener.ts`, and `src/client/project-manager/services/project-manager-file-link-opener.test.ts`; scope: prefer a launcher bridge handoff for standalone file links before the raw URI fallback, while keeping the VS Code webview path unchanged; expected commit message: `fix(pm): route standalone file links through launcher bridge`
4. [DONE] Git Commit: `fix(pm): route standalone file links through launcher bridge` (hash: `c2c52036e`)

### Stream: Launcher Host External Handoff
5. [DONE] Update `packages/cef-launcher/src/launcher_handler_bridge_helpers.h`, `packages/cef-launcher/src/launcher_handler.h`, and `packages/cef-launcher/src/launcher_handler.cc`; scope: add a dedicated launcher command for PM file-link handoff and cancel in-window navigation before delegating the generated VS Code URI to the OS; expected commit message: `fix(launcher): hand off vscode file links externally`
6. [IN_PROGRESS] Git Commit: `fix(launcher): hand off vscode file links externally` (hash: TBD)

### Stream: Docs Sync
7. [TODO] Sync the corrected fallback contract in `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`, and `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; scope: document that standalone PM uses launcher-host handoff instead of Chromium anchor navigation for dialog file links; expected commit message: `docs(pm): sync standalone file link fallback`
8. [TODO] Git Commit: `docs(pm): sync standalone file link fallback` (hash: TBD)

### Stream: Release Build For User Testing
9. [TODO] Prepare release docs for the next hotfix test build in `README.md`, `CHANGELOG.md`, and `doc/TODO/todo-plan.md`; scope: document the standalone fallback fix before packaging; expected commit message: `docs(release): prep standalone file link hotfix release`
10. [TODO] Git Commit: `docs(release): prep standalone file link hotfix release` (hash: TBD)
11. [TODO] Run the release checklist for this scope in `doc/TODO/todo-plan.md` and release/build outputs: keep a clean tree before packaging, execute `./scripts/build-all.sh`, verify fresh tarballs in `doc/tmp/releases/`, execute `./scripts/build-release.sh --use-current-version`, and sync the final release status for user test delivery; scope: release closeout and packaging for a hotfix test build; expected commit message: `build(release): cut standalone file link hotfix`
12. [TODO] Git Commit: `build(release): cut standalone file link hotfix` (hash: TBD)
