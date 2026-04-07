# Development TODO Plan

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ProjectManager_DialogFileLinks_PathEncoding_Hotfix.md`
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
  - `node --import tsx --test src/client/ui/src/session/file-link-target.test.ts`
  - `npm run build:project-manager`
  - `npm run typecheck:webview`
  - `./scripts/build-cef-launcher.sh --launcher-version 1.1.902`
- `doc/TODO/todo-plan.md` must be updated in real time after every micro-task and every commit.

## Phase 1 — Standalone PM File-Link Path Encoding Fix (owner: Codex, updated: 2026-04-07)

### Stream: Planning And Recovery Reset
1. [DONE] Reconstruct the remaining standalone regression from the tested `1.1.902` behavior and restate the new path-encoding decision in `doc/SolidWorks-WorkFlow/Plans/ProjectManager_DialogFileLinks_PathEncoding_Hotfix.md`, `doc/TODO/todo-plan.md`, and `doc/SolidWorks-WorkFlow/Docs_Index.md`; scope: open a new execution cycle for path normalization and launcher URI repair only; expected commit message: `docs(pm): plan file link path encoding hotfix`
2. [TODO] Git Commit: `docs(pm): plan file link path encoding hotfix` (hash: TBD)

### Stream: UI File Path Normalization
3. [TODO] Update `src/client/ui/src/session/file-link-target.ts`, `src/client/ui/src/session/file-link-target.test.ts`, and `doc/TODO/todo-plan.md`; scope: decode percent-encoded absolute file targets before the PM opener pipeline while preserving location parsing; expected commit message: `fix(ui): decode encoded dialog file paths`
4. [TODO] Git Commit: `fix(ui): decode encoded dialog file paths` (hash: TBD)

### Stream: Launcher VS Code URI Repair
5. [TODO] Update `packages/cef-launcher/src/launcher_handler.cc` and `doc/TODO/todo-plan.md`; scope: build the final `vscode://file/...` target without encoding `/` and `:` again, while keeping optional line/column suffixes; expected commit message: `fix(launcher): preserve standalone vscode file paths`
6. [TODO] Git Commit: `fix(launcher): preserve standalone vscode file paths` (hash: TBD)

### Stream: Docs Sync
7. [TODO] Sync the clarified standalone fallback contract in `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`, and `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; scope: document that the remaining hotfix repairs percent-encoded file paths while the external VS Code confirmation prompt may still appear as a platform-level safeguard; expected commit message: `docs(pm): sync file link path encoding hotfix`
8. [TODO] Git Commit: `docs(pm): sync file link path encoding hotfix` (hash: TBD)

### Stream: Release Build For User Testing
9. [TODO] Prepare release docs for the next hotfix test build in `README.md`, `CHANGELOG.md`, and `doc/TODO/todo-plan.md`; scope: document the path-encoding fix before packaging; expected commit message: `docs(release): prep file link path hotfix release`
10. [TODO] Git Commit: `docs(release): prep file link path hotfix release` (hash: TBD)
11. [TODO] Run the release checklist for this scope in `doc/TODO/todo-plan.md` and release/build outputs: keep a clean tree before packaging, execute `./scripts/build-all.sh`, verify fresh tarballs in `doc/tmp/releases/`, execute `./scripts/build-release.sh --use-current-version`, and sync the final release status for user test delivery; scope: release closeout and packaging for a hotfix test build; expected commit message: `build(release): cut file link path hotfix`
12. [TODO] Git Commit: `build(release): cut file link path hotfix` (hash: TBD)
