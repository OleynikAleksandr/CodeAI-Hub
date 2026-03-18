# Diagram Workflow User Surface Architecture

**Status:** DRAFT - approved recovery scope
**Date:** 2026-03-18
**Scope:** Product-facing UI contract for `Diagram Modules` and `Diagram Facades`

**Related documents:**
- `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_Audit_TODO_Plan.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/TODO/todo-plan.md`
- `doc/Sessions/Session093.md`

---

## 1. Problem

The bootstrap path for `Diagram Modules` and `Diagram Facades` is now working again, but the user-facing surface is still wrong.

Current behavior mixes three different concerns in the same right panel:
- the human-facing diagram;
- the runtime-owned Markdown source artifact (`module-map.md`, `facade-map.md`);
- dense semantic editing forms and technical layout details (`*.flow.json`).

That makes the stage feel unreliable even when the session and artifacts are technically correct.

---

## 2. Product Decision

For diagram stages, the primary user surface must be the diagram itself.

### Final UX contract

- `Artifacts` shows the visual diagram, not raw Markdown.
- `Source` shows the canonical Markdown artifact in read-only mode.
- `Help` remains the explanatory panel.
- `module-map.md` / `facade-map.md` remain the canonical runtime SSOT, but they are not the default surface.
- `*.flow.json` remains an internal persistence sidecar and must not be shown as a user artifact.
- Returning to a diagram stage must reopen the diagram view, not the raw `.md` source.

---

## 3. Interaction Model

### Header modes

For `Diagram Modules` and `Diagram Facades`, the artifact header must expose:
- `Artifacts`
- `Source`
- `Help`

For non-diagram stages, the existing contract remains unchanged:
- `Artifacts`
- `Help`

### Diagram mode

- The canvas is the first visible object in the right panel.
- Technical subtitles such as `artifact -> flow sidecar` are removed from the default UI.
- Editing controls stay available, but they become clearly secondary to the diagram.
- The user must be able to manually refine layout in React Flow and keep that layout persisted.

### Source mode

- Shows only raw `module-map.md` or `facade-map.md`.
- Read-only by default.
- Used for debugging, inspection, or copy/export workflows.
- Does not expose `*.flow.json`.

---

## 4. Implementation Slices

### Slice A - MainArea header contract

- Extend the right-panel header mode model to include `source` for diagram stages only.
- Keep `artifacts` as the default mode after toolbar navigation, workspace-tree sync, and stage reopen.
- Prevent diagram stages from auto-falling back to raw Markdown just because a canonical artifact was selected internally for sync.

### Slice B - Diagram source routing

- Resolve canonical diagram source from the active stage (`module-map.md`, `facade-map.md`) instead of treating it as the primary artifact surface.
- Reuse the existing Markdown artifact viewer as a secondary `Source` view.

### Slice C - Diagram-first stage panels

- Reorder diagram stage panels so the visual shell is primary.
- Remove internal path/sidecar chrome from the default panel.
- Demote semantic editing controls into secondary/collapsible sections.
- Improve layout readability by making manual node arrangement a first-class path alongside optional auto-layout.

---

## 5. Non-goals For This Recovery Phase

- Replacing Markdown DSL as the canonical SSOT.
- Building a full dedicated inspector-driven diagram editor in this phase.
- Exposing runtime/internal files beyond the canonical `.md` source.

---

## 6. Verification

Manual verification for this phase must prove:

1. Clicking `Diagram Modules` or `Diagram Facades` opens the stage with `Artifacts` selected and the diagram visible.
2. Switching to another stage and back still reopens the diagram, not raw Markdown.
3. Clicking `Source` shows the canonical `.md` artifact in read-only mode.
4. The right panel never exposes `*.flow.json`.
5. Manual node movement persists after reopen/resume.

---

## 7. Rewrite Instruction For Main TODO

The recovered execution plan must stop treating `module-map.md` / `facade-map.md` as the user artifact surface for diagram stages.

The new active execution scope is:
- recover the product-facing diagram surface;
- keep source artifacts available only as a secondary debug view;
- ship a new release that validates the revised `Artifacts / Source / Help` contract.
