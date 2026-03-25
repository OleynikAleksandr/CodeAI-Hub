# Detachable Diagram Window — Architecture

## Problem

The Module Graph diagram in Project Manager is confined to a single panel. Users with multiple monitors want to:
- View the full diagram on a separate monitor with custom proportions
- Keep the PM on the primary monitor for session/artifact navigation
- Drag nodes in the detached window without affecting the PM graph

## Solution: `window.open()` Popup with Layout Isolation

### How it works

1. **Detach button** in the diagram panel opens `window.open(url)` with `?mode=detached-diagram&workspaceSlug=X&workspacePath=Y`
2. CEF launcher **already supports popups** — `OnPopupBrowserViewCreated()` creates a new top-level window automatically
3. The PM React app detects the query parameter in `app.tsx` and renders a **minimal diagram-only view** instead of the full `MainLayout`
4. The detached view loads the same artifact data from the same core server but uses a **separate sidecar path** for node positions

### Layout Isolation

- Main PM persists node positions to: `.codeai-hub/<slug>/diagram_modules/flow-sidecar.json`
- Detached window persists to: `.codeai-hub/<slug>/diagram_modules/flow-sidecar-detached.json`
- On first open, detached window inherits current positions from the main sidecar
- Subsequent moves in the detached window only update the detached sidecar
- Changes in PM do NOT propagate to the detached window (and vice versa)

### Components

| Component | Role |
|-----------|------|
| `app.tsx` | Route: detect `?mode=detached-diagram` → render `DetachedDiagramView` |
| `DetachedDiagramView` | Minimal shell: load artifact, render `DiagramEditorFacade` full-screen |
| `diagram-stage-panel-scaffold.tsx` | Add "Detach" button to open `window.open()` |
| `use-diagram-persistence.ts` | Accept configurable `flowSidecarPath` (already does) |

### Constraints

- No live sync between windows — each has its own layout state
- Detached window survives PM stage navigation (it has its own data fetch)
- Closing the detached window has no effect on PM
- Zoom/pan state is per-window (ReactFlow default)
