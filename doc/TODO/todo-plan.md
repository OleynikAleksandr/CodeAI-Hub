# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/Sessions/Session155.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 62 — Detachable diagram window (owner: Oleksandr, updated: 2026-03-25)

### Stream 1: Create DetachedDiagramView component

Минимальный full-screen компонент: загружает артефакт Diagram Modules, рендерит DiagramEditorFacade на 100% viewport. Без sidebar, без session panel.

1. [TODO] **Create `detached-diagram-view.tsx`** in `src/client/project-manager/components/diagram-editor/`. Reuses `useDiagramLoader` + `useDiagramPersistence` with detached sidecar path. Full-viewport ReactFlow. (scope: 1 new file)
2. [TODO] Git Commit: `feat(pm): add DetachedDiagramView component for popup window`

### Stream 2: Route detection in app.tsx

Detect `?mode=detached-diagram` query param. If present, render DetachedDiagramView instead of MainLayout.

3. [TODO] **Update `app.tsx`** to parse URL params and conditionally render DetachedDiagramView. (scope: 1 file)
4. [TODO] Git Commit: `feat(pm): route detached-diagram mode in app entry point`

### Stream 3: Detach button in diagram panel

Add a "Detach" button in the diagram panel that calls `window.open()` with the correct URL and query params.

5. [TODO] **Add detach button** to `diagram-stage-panel-scaffold.tsx`. Uses `window.location.href` as base, appends `?mode=detached-diagram&workspaceSlug=X&workspacePath=Y`. (scope: 1 file)
6. [TODO] Git Commit: `feat(pm): add detach button to open diagram in separate window`

### Stream 4: Release build

7. [TODO] Таргетные сборки: `npm run build:webview`, `npm run typecheck:webview`, тесты.
8. [TODO] Release build: `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`.
9. [TODO] Git Commit: `chore(release): bump version to <TBD>`
