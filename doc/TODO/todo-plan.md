# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_AutoFitZoom_NaturalWidthHotfix_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §6.4 (уже содержит auto-fit zoom contract, требует rephrase без `max-content`)
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_DevTreeParser_And_AutoFitZoom_Architecture.md` (архив предыдущего цикла 1.2.40; оригинальная реализация auto-fit + max-content решение)
  - `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`
  - `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Phase завершается на чистом дереве: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`, tarball'ы в `doc/tmp/releases/`, итог в `doc/Sessions/`.

## Phase 1 — Natural-Width Hotfix (owner: claude, updated: 2026-04-21)

### Stream: Remove max-content from auto-fit composition
1. [IN_PROGRESS] Убрать `width: "max-content"` + `minWidth: "100%"` из inner div `DiagramEditorFacade`; inverter assertion `max-content === false` в source-level regression тесте (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx` + `diagram-editor-facade.test.tsx` — 2 файла).
2. [TODO] Git Commit: `fix: restore natural grid sizing for diagram auto-fit composition` (hash: TBD)
3. [TODO] Обновить `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §6.4 — rephrase auto-fit zoom contract без упоминания `max-content`/`min-width: 100%`; добавить запись `BUG-2026-04-21-03` в `doc/BugRegistry.md` (scope: 2 файла).
4. [TODO] Git Commit: `docs: drop max-content from auto-fit contract and register hotfix bug` (hash: TBD)

**Phase 1 closure:** `npm run typecheck:webview` + `npm run build:webview` зелёные; source-level regression тест auto-fit проходит; визуальная проверка в PM — композиция помещается в ширину panel при auto-fit и масштабируется Cmd/Ctrl+scroll.

## Phase 2 — Release 1.2.41

### Stream: Release
1. [TODO] README.md + CHANGELOG.md под 1.2.41 ДО запуска build-all.sh (scope: 2 файла).
2. [TODO] Git Commit: `docs: prepare release notes for auto-fit natural-width hotfix (1.2.41)` (hash: TBD)
3. [TODO] `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`; tarball + VSIX в `doc/tmp/releases/`.
4. [TODO] Git Commit: `build: release 1.2.41` (hash: TBD)
5. [TODO] User acceptance на workspace `CodeAI-Hub claude`: Diagram Modules Artifacts panel помещается по горизонтали при разных ширинах окна, без улёта cluster'ов вправо.
