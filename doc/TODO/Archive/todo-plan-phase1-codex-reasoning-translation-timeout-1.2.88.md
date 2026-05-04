# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Reasoning_Translation_Timeout_1.2.88.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
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
- **Real-time Documentation:** изменения runtime-логики translation overlay синхронно отражать в `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md` до коммита.
- Phase завершается на чистом дереве: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, фиксация артефактов и session report.

## Phase 1 — Codex reasoning translation timeout and release (owner: Codex, updated: 2026-04-27)

### Stream: Planning
1. [DONE] Create planning-doc and active todo-plan for reasoning translation timeout — scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Reasoning_Translation_Timeout_1.2.88.md`, `doc/TODO/Archive/todo-plan-phase1-codex-reasoning-translation-timeout-1.2.88.md`; commit: `docs: plan codex reasoning translation timeout`
2. [DONE] Git Commit: `docs: plan codex reasoning translation timeout` (hash: `881a2142f`)

### Stream: Timeout Fix
3. [DONE] Raise live reasoning translation minimum timeout to 15 seconds and document the runtime policy — scope: `packages/core/src/session-translation/session-translation-facade.ts`, `packages/core/src/session-translation/session-translation-facade.test.ts`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`; commit: `fix: extend reasoning translation timeout`
4. [DONE] Git Commit: `fix: extend reasoning translation timeout` (hash: `b40c3fae4`)

### Stream: Verification
5. [DONE] Run targeted Core/session translation verification — scope: `packages/core`; command: `npm run build --workspace=@codeai-hub/core` plus `node --test packages/core/dist/session-translation/session-translation-facade.test.js`; commit: `test: verify reasoning translation timeout`
6. [DONE] Git Commit: `test: verify reasoning translation timeout` (hash: `37ea0f33c`)

### Stream: Release 1.2.88
7. [DONE] Prepare release notes for `1.2.88` before build-all — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare reasoning translation timeout release notes`
8. [DONE] Git Commit: `docs: prepare reasoning translation timeout release notes` (hash: `5a0383de6`)
9. [DONE] Run `./scripts/build-all.sh` for `1.2.88` — scope: release scripts/generated artifacts, package/manifests, `doc/TODO/todo-plan.md`; commit: `chore: build reasoning translation timeout release`
10. [DONE] Git Commit: `chore: build reasoning translation timeout release` (hash: `bfbc6d632`)
11. [DONE] Run `./scripts/build-release.sh --use-current-version` and verify VSIX/release artifacts — scope: release packaging output, `doc/TODO/todo-plan.md`; commit: `chore: package reasoning translation timeout vsix`
12. [DONE] Git Commit: `chore: package reasoning translation timeout vsix` (hash: `01a4c3f4b`)
13. [DONE] Close active planning/todo scope and create completion session report — scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Reasoning_Translation_Timeout_1.2.88.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/Archive/todo-plan-phase1-codex-reasoning-translation-timeout-1.2.88.md`, `legacy session report (removed)`; commit: `docs: close reasoning translation timeout release`
14. [DONE] Git Commit: `docs: close reasoning translation timeout release` (hash: `d554352db`)
