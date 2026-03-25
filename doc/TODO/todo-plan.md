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

## Phase 63 — UX: Detach relocation, Option+drag, dynamic container resize (owner: Oleksandr, updated: 2026-03-25)

### Stream 1: Move Detach button to artifact header

1. [TODO] **Relocate Detach button** — add `extraActions` slot to `StageArtifactHeaderToggle`, pass Detach from `main-area.tsx` when `activeTool === "Diagram Modules"`, remove from `diagram-stage-panel-scaffold.tsx`. (scope: `stage-artifact-header-toggle.tsx`, `main-area.tsx`, `diagram-stage-panel-scaffold.tsx`)
2. [TODO] Git Commit: `fix(pm): move Detach button to artifact header next to Artifacts toggle`

### Stream 2: Replace Ctrl with Option (Alt) for node drag

3. [TODO] **Change drag modifier key** — replace `Control`/`Meta` with `Alt` in `diagram-editor-facade.tsx`. On macOS Ctrl+click = right-click, Option is the correct modifier. (scope: `diagram-editor-facade.tsx`)
4. [TODO] Git Commit: `fix(pm): use Option/Alt instead of Ctrl for diagram node drag`

### Stream 3: Dynamic container resizing on node drag

5. [TODO] **Add container constraints to types** — extend `ProductPartFlowNodeData` and `ClusterFlowNodeData` with `containerConstraints` (childMinX, childMinY, minWidth, minHeight, paddingRight, paddingBottom). Remove `extent: "parent"` from child nodes. Populate constraints in `module-stage-react-flow.ts`. (scope: `domain-model-to-react-flow.types.ts`, `module-stage-react-flow.ts`)
6. [TODO] Git Commit: `feat(pm): add container constraints to flow node data for dynamic resizing`
7. [TODO] **Implement dynamic resize logic** — in `diagram-editor-shell.tsx`, after `applyNodeChanges` clamp child positions and recalculate container width/height from children bounding box. Cascade: cluster resize → product part resize. Min width PP=720, Cluster=single-column. (scope: `diagram-editor-shell.tsx`)
8. [TODO] Git Commit: `feat(pm): dynamic container resizing when dragging nodes`
