# Development TODO Plan

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ProjectManager_DialogFileLinks_OpenInVSCode_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
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
  - `npm run build:webview`
  - `npm run typecheck:webview`
- `doc/TODO/todo-plan.md` must be updated in real time after every micro-task and every commit.

## Phase 1 — PM Dialog File Links Open In VS Code (owner: Codex, updated: 2026-04-07)

### Stream: Dialog Markdown File-Link Interception
1. [DONE] Add explicit local-file link parsing and dialog-link interception in `src/client/ui/src/session/file-link-target.ts`, `src/client/ui/src/session/markdown-content.tsx`, and `src/client/ui/src/session/dialog-panel.tsx`; scope: detect absolute local file hrefs with optional line/column metadata and expose an opt-in interception callback without changing non-file links; expected commit message: `feat(ui): intercept dialog file links`
2. [DONE] Git Commit: `feat(ui): intercept dialog file links` (hash: `067c0fc2c`)

### Stream: Session Surface Callback Wiring
3. [DONE] Thread the dialog file-link callback through `src/client/ui/src/session/session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`, and `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`; scope: PM session surfaces only, with no behavior change for artifact/help markdown; expected commit message: `feat(pm): wire session file link callbacks`
4. [DONE] Git Commit: `feat(pm): wire session file link callbacks` (hash: `998111602`)

### Stream: PM Opener Strategy
5. [DONE] Implement the PM opener strategy in `src/client/project-manager/services/project-manager-file-link-opener.ts`, `src/client/project-manager/services/pm-bridges.ts`, and `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; scope: prefer VS Code webview `postMessage` when available and fall back to `vscode://file` handoff in standalone PM; expected commit message: `feat(pm): open dialog file links in vscode`
6. [DONE] Git Commit: `feat(pm): open dialog file links in vscode` (hash: `f7247bb1f`)

### Stream: VS Code Host Editor Open
7. [DONE] Add the PM file-link open contract in `src/extension-module/home-view-message-router/message-types.ts`, `src/extension-module/home-view-message-router.ts`, and `src/extension-module/message-handlers/project-manager-file-link-handler.ts`; scope: validate `pm:file-link:open` payloads and open the target with `workspace.openTextDocument` plus `window.showTextDocument`; expected commit message: `feat(vscode): handle PM file link open requests`
8. [DONE] Git Commit: `feat(vscode): handle PM file link open requests` (hash: `b1d856172`)

### Stream: Parser Correctness Fix
9. [DONE] Correct `:line:column` parsing in `src/client/ui/src/session/file-link-target.ts` and `src/client/ui/src/session/file-link-target.test.ts`; scope: keep absolute-path detection intact while making parser correctness green for unix and windows file targets; expected commit message: `fix(ui): correct file link line parsing`
10. [DONE] Git Commit: `fix(ui): correct file link line parsing` (hash: `84315311f`)

### Stream: Remaining Regression Coverage
11. [DONE] Add remaining regression coverage in `src/client/project-manager/services/project-manager-file-link-opener.test.ts` and `src/extension-module/message-handlers/project-manager-file-link-handler.test.ts`; scope: `vscode://file` fallback generation and editor-open payload validation after the parser fix lands; expected commit message: `test(pm): cover dialog file link opening`
12. [DONE] Git Commit: `test(pm): cover dialog file link opening` (hash: `cfdbd5dc4`)

### Stream: Docs Sync
13. [DONE] Sync the implemented contract in `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, and `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`; scope: document dialog-only interception, VS Code editor-open ownership, and standalone fallback behavior; expected commit message: `docs(pm): document dialog file link opening`
14. [IN_PROGRESS] Git Commit: `docs(pm): document dialog file link opening` (hash: TBD)

### Stream: Release Build For User Testing
15. [TODO] Prepare release docs for the next test build in `README.md`, `CHANGELOG.md`, and `doc/TODO/todo-plan.md`; scope: release-prep docs only so the tree is clean before packaging; expected commit message: `docs(release): prep PM dialog file link test release`
16. [TODO] Git Commit: `docs(release): prep PM dialog file link test release` (hash: TBD)
17. [TODO] Run the release checklist for this scope in `doc/TODO/todo-plan.md` and release/build outputs: keep a clean tree before packaging, execute `./scripts/build-all.sh`, verify fresh tarballs in `doc/tmp/releases/`, execute `./scripts/build-release.sh --use-current-version`, and sync the final release status for user test delivery; scope: release closeout and packaging for a test build; expected commit message: `build(release): cut test build for PM dialog file links`
18. [TODO] Git Commit: `build(release): cut test build for PM dialog file links` (hash: TBD)
