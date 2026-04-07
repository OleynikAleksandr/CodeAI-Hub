# Development TODO Plan

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ProjectManager_DialogFileLinks_LauncherQueryDecode_Hotfix.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/ProjectManager_DialogFileLinks_PathEncoding_Hotfix.md`
- Only this list is the recovery document pack for the current execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Every implementation task must stay within **<= 3 files**.
- Every implementation task must be followed by a separate `Git Commit:` line so the commit cannot be skipped.
- If a task grows past 3 files, it must be split before implementation continues.
- The user explicitly deferred the broader method/knowledge documentation until after release validation; this cycle therefore syncs planning and release docs only, then waits for user confirmation before a wider SSOT/doc knowledge pass.
- Husky gates remain mandatory:
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Targeted manual validation required before release packaging:
  - `./scripts/build-cef-launcher.sh --launcher-version 1.1.903`
- `doc/TODO/todo-plan.md` must be updated in real time after every micro-task and every commit.

## Phase 1 — Standalone Launcher Query Decode Fix (owner: Codex, updated: 2026-04-07)

### Stream: Planning And Recovery Reset
1. [DONE] Finalize the previous completion report and open a new narrow execution cycle in `doc/SolidWorks-WorkFlow/Plans/ProjectManager_DialogFileLinks_LauncherQueryDecode_Hotfix.md`, `doc/TODO/todo-plan.md`, and `doc/SolidWorks-WorkFlow/Docs_Index.md`; scope: isolate the remaining `/%2FUsers%2F...` launcher query-decode regression after `1.1.903`; expected commit message: `docs(pm): plan launcher query decode hotfix`
2. [IN_PROGRESS] Git Commit: `docs(pm): plan launcher query decode hotfix` (hash: TBD)

### Stream: Launcher Query Decode Fix
3. [TODO] Update `packages/cef-launcher/src/launcher_handler.cc` and `doc/TODO/todo-plan.md`; scope: decode the `path` query parameter with filesystem-oriented URI unescape rules so standalone PM no longer hands VS Code a `%2F`-encoded absolute path; expected commit message: `fix(launcher): decode vscode file path query`
4. [TODO] Git Commit: `fix(launcher): decode vscode file path query` (hash: TBD)

### Stream: Release Build For User Testing
5. [TODO] Prepare release docs for the next hotfix test build in `README.md`, `CHANGELOG.md`, and `doc/TODO/todo-plan.md`; scope: announce the launcher query-decode hotfix and the deferred broader documentation pass; expected commit message: `docs(release): prep launcher query decode hotfix release`
6. [TODO] Git Commit: `docs(release): prep launcher query decode hotfix release` (hash: TBD)
7. [TODO] Run the release checklist for this scope in `doc/TODO/todo-plan.md` and release/build outputs: keep a clean tree before packaging, execute `./scripts/build-all.sh`, verify fresh tarballs in `doc/tmp/releases/`, execute `./scripts/build-release.sh --use-current-version`, and sync the final release status for user test delivery; scope: release closeout and packaging for the standalone launcher query-decode hotfix; expected commit message: `build(release): cut launcher query decode hotfix`
8. [TODO] Git Commit: `build(release): cut launcher query decode hotfix` (hash: TBD)

### Stream: Scope Closeout
9. [TODO] Archive the completed execution cycle in `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, and `doc/SolidWorks-WorkFlow/Docs_Index.md`; scope: close the active launcher query-decode hotfix plan after the release build is ready for user testing; expected commit message: `docs(closeout): archive launcher query decode hotfix scope`
10. [TODO] Git Commit: `docs(closeout): archive launcher query decode hotfix scope` (hash: TBD)
