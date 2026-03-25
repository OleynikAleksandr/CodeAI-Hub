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

## Phase 62 — Detachable diagram window [DONE] (owner: Oleksandr, updated: 2026-03-25)

### Stream 1: Create DetachedDiagramView component

1. [DONE] **Create `detached-diagram-view.tsx`** — full-viewport ReactFlow with detached sidecar path. (scope: 1 new file)

### Stream 2: Route detection in app.tsx

3. [DONE] **Update `app.tsx`** — parse `?mode=detached-diagram` query param, render DetachedDiagramView. (scope: 1 file)

### Stream 3: Detach button in diagram panel

5. [DONE] **Add detach button** to `diagram-stage-panel-scaffold.tsx` — opens `window.open()` with query params. (scope: 1 file)

6. [DONE] Git Commit: `feat(pm): detachable diagram window with independent layout persistence` (hash: fa477a8a)

### Stream 4: Release build

7. [DONE] Таргетные сборки — зелёные.
8. [DONE] Release build: `./scripts/build-all.sh` → 1.1.795, `./scripts/build-release.sh` → `codeai-hub-1.1.795.vsix`.
9. [DONE] Git Commit: `chore(release): bump version to 1.1.795` (hash: 78b27088)

---

## Phase 63 — UX: Detach relocation, Option+drag, dynamic container resize [DONE] (owner: Oleksandr, updated: 2026-03-25)

### Stream 1: Move Detach button to artifact header

1. [DONE] **Relocate Detach button** — add `extraActions` slot to `StageArtifactHeaderToggle`, pass Detach from `main-area.tsx` (via `useDetachDiagramButton` hook in `detach-diagram-button.tsx`) when `activeTool === "Diagram Modules"`, remove from `diagram-stage-panel-scaffold.tsx`.

### Stream 2: Replace Ctrl with Option (Alt) for node drag

2. [DONE] **Change drag modifier key** — replace `Control`/`Meta` with `Alt` in `diagram-editor-facade.tsx`. On macOS Ctrl+click = right-click.

### Stream 3: Dynamic container resizing on node drag

3. [DONE] **Add container constraints + dynamic resize** — `ContainerConstraints` type in `domain-model-to-react-flow.types.ts`, populated in `module-stage-react-flow.ts`. Removed `extent:"parent"` from child nodes. `resizeContainersToFit` in `diagram-editor-shell.tsx` clamps child positions and resizes containers bottom-up on every drag frame.

4. [DONE] Git Commit: `feat(pm): relocate Detach button, use Option+drag, dynamic container resizing` (hash: 00630a32)

### Stream 4: Release build

5. [DONE] Release build: `./scripts/build-all.sh` → 1.1.796, `./scripts/build-release.sh` → `codeai-hub-1.1.796.vsix`.
6. [DONE] Git Commit: `chore(release): bump version to 1.1.796` (hash: bc429627)
