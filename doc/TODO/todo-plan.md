# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_DevTreeParser_And_AutoFitZoom_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (§3 Invariant, §6.4 Diagram workflow stabilization)
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_TwoColumnModuleTable_Cleanup_Architecture.md` (precedent)
  - `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`
  - `packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`
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
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Real-time документация:** обновление `SystemArchitecture.md` §6.4 идёт в том же коммите, что и соответствующий код.
- Phase завершается на чистом дереве: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`, tarball'ы в `doc/tmp/releases/`, итог в `doc/Sessions/`.

## Phase 1 — Core DevTree Parser Stability (owner: claude, updated: 2026-04-21)

### Stream: Parser hardening
1. [TODO] Переписать `development-tree-snapshot.ts`: локальные regex-инстансы / `str.search()` вместо `NEXT_SECTION_RE.exec`, строго 2-column `MODULE_ROW_RE` (scope: `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts` — 1 файл).
2. [TODO] Git Commit: `fix: stabilize development tree parser against regex lastIndex drift` (hash: TBD)
3. [TODO] Regression-тесты: идемпотентность N повторных вызовов + Simple Relations leak guard (scope: `packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts` — 1 файл).
4. [TODO] Git Commit: `test: cover development tree parser idempotency and relations leak guard` (hash: TBD)
5. [TODO] Обновить `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §6.4 — фиксация regex lastIndex safety invariant для `development-tree-snapshot` (scope: 1 файл).
6. [TODO] Git Commit: `docs: record development tree parser lastIndex safety invariant` (hash: TBD)

**Phase 1 closure:** `npm run build --workspace @codeai-hub/core` зелёный, regression-тесты проходят.

## Phase 2 — Artifacts Diagram Auto-Fit Zoom (owner: claude, updated: 2026-04-21)

### Stream: Facade auto-fit
1. [TODO] Добавить auto-fit scale в `DiagramEditorFacade` через `ResizeObserver` + measure `scrollWidth` композиции, compose effective transform = auto-fit × user-zoom (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx` — 1 файл).
2. [TODO] Git Commit: `feat: auto-fit diagram canvas to artifacts panel width` (hash: TBD)
3. [TODO] Regression-тесты на auto-fit поведение при изменении container width (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx` — 1 файл).
4. [TODO] Git Commit: `test: cover diagram editor auto-fit zoom on container resize` (hash: TBD)
5. [TODO] Обновить `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §6.4 — auto-fit zoom как дефолтная база, Cmd/Ctrl+scroll и Cmd/Ctrl+0 как overlay (scope: 1 файл).
6. [TODO] Git Commit: `docs: record artifacts diagram auto-fit zoom contract` (hash: TBD)

**Phase 2 closure:** `npm run build:webview` + `npm run typecheck:webview` зелёные; визуальная проверка в PM — композиция помещается в ширину panel при любом reasonable window size.

## Phase 3 — Release cut

### Stream: Release
1. [TODO] Обновить README.md + CHANGELOG.md под upcoming версию ДО запуска build-all.sh (scope: 2 файла).
2. [TODO] Git Commit: `docs: prepare release notes for devtree parser + autofit zoom` (hash: TBD)
3. [TODO] `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`, copy tarball + VSIX в `doc/tmp/releases/`.
4. [TODO] Git Commit: `build: release <next-version>` (hash: TBD)
5. [TODO] User acceptance проверка: Development Tree стабилен на artifacts от `CodeAI-Hub claude/.codeai-hub/codeai-hub-claude/diagram_modules/`; auto-fit работает при изменении ширины окна.
