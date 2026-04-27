# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_Reasoning_Paragraph_Streaming_1.2.87.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase и Stream; каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Real-time Documentation:** изменения runtime-логики Codex reasoning streaming синхронно отражать в `doc/SolidWorks-WorkFlow/Modules/Codex.md` и связанных module docs до коммита.
- Phase завершается на чистом дереве: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, фиксация артефактов и session report.

## Phase 1 — Codex reasoning paragraph streaming and release (owner: Codex, updated: 2026-04-27)

### Stream: Planning
1. [DONE] Create planning-doc and active todo-plan for Codex reasoning paragraph streaming — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Reasoning_Paragraph_Streaming_1.2.87.md`, `doc/TODO/todo-plan.md`; commit: `docs: plan codex reasoning paragraph streaming`
2. [DONE] Git Commit: `docs: plan codex reasoning paragraph streaming` (hash: `5d371cd09`)

### Stream: Provider Streaming Core
3. [DONE] Add Codex reasoning summary stream buffer microclass with focused tests — scope: `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-stream-buffer.ts`, `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-stream-buffer.test.ts`; commit: `feat: add codex reasoning paragraph buffer`
4. [DONE] Git Commit: `feat: add codex reasoning paragraph buffer` (hash: `a53daf9c5`)
5. [DONE] Wire paragraph-level reasoning emission into Codex app-server router and update Codex SSOT — scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts`, `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.test.ts`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`; commit: `feat: stream codex reasoning paragraphs`
6. [DONE] Git Commit: `feat: stream codex reasoning paragraphs` (hash: `4991c980d`)

### Stream: UI/Translation Contract Documentation
7. [DONE] Document sequential thinking blocks and per-block translation overlay expectations — scope: `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; commit: `docs: document codex reasoning paragraph overlays`
8. [DONE] Git Commit: `docs: document codex reasoning paragraph overlays` (hash: `8155c37b2`)

### Stream: Verification
9. [DONE] Run targeted Codex provider verification — scope: `packages/Codex_AppServer_Module`; command: `npm run build --workspace=@codeai-hub/codex-app-server-module` plus `node --test packages/Codex_AppServer_Module/dist/app-server/codex-reasoning-summary-stream-buffer.test.js packages/Codex_AppServer_Module/dist/app-server/codex-app-server-event-router.test.js`; commit: `test: verify codex reasoning paragraph streaming`
10. [DONE] Git Commit: `test: verify codex reasoning paragraph streaming` (hash: `7c2f9b816`)

### Stream: Release 1.2.87
11. [DONE] Prepare release notes for `1.2.87` before build-all — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare codex reasoning paragraph release notes`
12. [DONE] Git Commit: `docs: prepare codex reasoning paragraph release notes` (hash: `212376477`)
13. [DONE] Run `./scripts/build-all.sh` for `1.2.87` — scope: release scripts/generated artifacts, package/manifests, `doc/TODO/todo-plan.md`; commit: `chore: build codex reasoning paragraph release`
14. [DONE] Git Commit: `chore: build codex reasoning paragraph release` (hash: `a98c21efc`)
15. [DONE] Run `./scripts/build-release.sh --use-current-version` and verify VSIX/release artifacts — scope: release packaging output, `doc/TODO/todo-plan.md`; commit: `chore: package codex reasoning paragraph vsix`
16. [TODO] Git Commit: `chore: package codex reasoning paragraph vsix` (hash: TBD)
17. [TODO] Close active planning/todo scope and create completion session report — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Reasoning_Paragraph_Streaming_1.2.87.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Reasoning_Paragraph_Streaming_1.2.87.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-phase1-codex-reasoning-paragraph-1.2.87.md`, `doc/Sessions/Session0XX.md`; commit: `docs: close codex reasoning paragraph release`
18. [TODO] Git Commit: `docs: close codex reasoning paragraph release` (hash: TBD)
