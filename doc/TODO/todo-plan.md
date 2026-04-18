# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_LivePreToolThinking_1.2.17.md`
- **Read this context before implementation:**
  - `doc/BugRegistry.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `packages/Claude_Module/src/messaging/claude-content-stream-handler.ts`
  - `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`
  - `packages/Claude_Module/src/messaging/message-processor.translation.test.ts`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Gates автоматически через Husky.
- Таргетные проверки до релиза: Claude messaging tests, `npm run build --workspace=@codeai-hub/claude-module`, `npm run build --workspace=@codeai-hub/core`.

## Phase 1 — Claude live pre-tool thinking fix 1.2.17 (owner: Codex, updated: 2026-04-18)

### Stream 1: Scope registration
1. [DONE] Зарегистрировать `BUG-2026-04-18-02`, создать planning-doc и активный `todo-plan.md`. — scope: `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Plans/Claude_LivePreToolThinking_1.2.17.md`, `doc/TODO/todo-plan.md`; commit: `docs: register 1.2.17 Claude live pre-tool thinking bug`
2. [DONE] Git Commit: `docs: register 1.2.17 Claude live pre-tool thinking bug` (hash: `4c34f3e07`)

### Stream 2: Release notes pre-bump
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под будущий релиз `1.2.17`. — scope: `README.md`, `CHANGELOG.md`; commit: `docs: prepare 1.2.17 release notes for Claude pre-tool thinking fix`
2. [DONE] Git Commit: `docs: prepare 1.2.17 release notes for Claude pre-tool thinking fix` (hash: `2ba51e7b3`)

### Stream 3: Claude pre-tool routing fix
1. [DONE] Подавить premature assistant/live emission для localized Claude pre-tool text и выпускать `tool_use` preamble через thinking path. — scope: `packages/Claude_Module/src/messaging/claude-content-stream-handler.ts`, `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`; commit: `fix(claude): route localized pre-tool live text through thinking`
2. [DONE] Git Commit: `fix(claude): route localized pre-tool live text through thinking` (hash: `5afd0aace`)

### Stream 4: Regression guards
1. [DONE] Добавить regression tests на `tool_use` preamble vs `end_turn` assistant text. — scope: `packages/Claude_Module/src/messaging/claude-stream-event-router.live-text.test.ts`, `packages/Claude_Module/src/messaging/message-processor.translation.test.ts`, `packages/Claude_Module/src/messaging/message-processor.pretool-thinking.translation.test.ts`; commit: `test(claude): guard pre-tool live text thinking classification`
2. [DONE] Git Commit: `test(claude): guard pre-tool live text thinking classification` (hash: `f43eca975`)

### Stream 5: SSOT sync
1. [DONE] Обновить Claude/System SSOT под новый pre-tool thinking contract. — scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`; commit: `docs: document Claude pre-tool live text thinking contract`
2. [DONE] Git Commit: `docs: document Claude pre-tool live text thinking contract` (hash: `f4bfae675`)

### Stream 6: Planning archive
1. [DONE] После завершения реализации перенести planning-doc в `Plans/Archive/`, обновить `Docs_Index.md` и перепривязать active `todo-plan.md` на archive-path planning source. — scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_LivePreToolThinking_1.2.17.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; commit: `docs: archive 1.2.17 Claude pre-tool thinking plan`
2. [DONE] Git Commit: `docs: archive 1.2.17 Claude pre-tool thinking plan` (hash: `a773a53f1`)

### Stream 7: Build verification follow-up
1. [DONE] Исправить type-contract `resolvePendingAssistantText` после target build failure `TS2322`, сохранив новый pre-tool thinking routing. — scope: `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`; commit: `fix(claude): restore pending text promise contract`
2. [DONE] Git Commit: `fix(claude): restore pending text promise contract` (hash: `5edc5be05`)

### Stream 8: Release build 1.2.17
1. [IN_PROGRESS] Прогнать таргетные тесты/сборки, затем `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`. — scope: release/build artifacts; commit: `chore: bump version to 1.2.17 for Claude pre-tool thinking fix release`
2. [IN_PROGRESS] Git Commit: `chore: bump version to 1.2.17 for Claude pre-tool thinking fix release` (hash: TBD)
3. [TODO] Архивировать `todo-plan.md`, вернуть placeholder `Execution Scope Status: EMPTY`, создать новый session report. — scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-1.2.17-claude-pre-tool-thinking.md`, `doc/Sessions/Session045.md`; commit: `docs: close 1.2.17 todo-plan after build`
4. [TODO] Git Commit: `docs: close 1.2.17 todo-plan after build` (hash: TBD)
