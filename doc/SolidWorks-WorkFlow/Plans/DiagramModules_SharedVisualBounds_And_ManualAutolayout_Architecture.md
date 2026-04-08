# Diagram Modules Shared Visual Bounds And Unified Manual Autolayout — Architecture

**Status:** Accepted implementation baseline
**Date:** 2026-04-08
**Owner:** Oleksandr + Codex
**Scope:** post-release corrective wave after `1.1.909`; fix the common boundary-overlap defect in `Diagram Modules` for both first-open autolayout and manual dragging by replacing duplicated border-box math with one shared visual-bounds contract and shipping a new release build

**Related documents:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_MeasuredOwnershipReflow_Architecture.md`
- `doc/Sessions/Session014.md`

---

## 1. Problem statement

Release `1.1.909` still does not satisfy the user-visible boundary contract.
The same defect is now confirmed in three independent situations:
- fresh autolayout after deleting `module-map.flow.json`;
- autolayout with an existing sidecar;
- manual drag after the user tries to correct the layout by hand.

Validated workspace and evidence:
- workspace: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini/.codeai-hub/codeai-hub-gemini/diagram_modules`
- screenshot: `/Users/oleksandroliinyk/Desktop/Screenshot 2026-04-08 at 10.21.57.png`
- user observation: lower module edges still visually run into `Cluster` and `Product Part` boundaries even after manual repositioning.

This means the defect is no longer explainable by only one bad seed layout or by stale sidecar geometry.
A common container-boundary invariant is still wrong.

---

## 2. Root cause

### 2.1. Auto and manual paths still do not share one geometry source of truth

`Diagram Modules` currently has two different layout paths:
- measured autolayout normalization after React Flow mount;
- manual drag container-resize logic in `diagram-editor-shell.tsx`.

They do not use the same geometry helpers.
As a result, one path can be improved while the other continues to recompute container bounds from older assumptions.

### 2.2. The current math still uses border-box sizes where the user sees visual overflow

The rendered `Module` card has an outer shadow:
- `boxShadow: "0 10px 24px rgba(0, 0, 0, 0.24)"`

React Flow measured height and the current shell `nodeRect()` only see the border box.
The user, however, sees the visual card together with its shadow.
Therefore the product can currently satisfy a border-box gap while still visually appearing to overlap the parent boundary.

This is especially visible on the lower edge because:
- cluster bottom padding is currently `12px`;
- product-part bottom padding is currently `12px`;
- the module shadow visually extends downward by roughly the same order of magnitude.

### 2.3. The manual drag path still resizes containers from fallback style heights

`diagram-editor-shell.tsx` still uses a local `nodeRect()` helper that falls back to:
- `style.height`
- `style.minHeight`
- `DEFAULT_CHILD_HEIGHT`

That means manual drag can resize `Cluster` / `Product Part` from stale or underestimated child geometry even after measured DOM heights exist.
This explains why the user can reproduce the same defect after dragging.

### 2.4. Parent boxes must be built from the maximum child bottom, not from guessed row heights

For a container with several vertical columns, the only correct lower bound is:
- `max(childBottom among all direct children) + container bottom padding`

For `Cluster` this means:
- direct children are only `Module` cards.

For `Product Part` this means:
- direct children are finalized `Cluster` boxes and standalone `Module` cards.

The current product still contains code paths where this rule is not applied from one shared helper using the same visual bounds.

---

## 3. Accepted solution

### 3.1. Introduce one shared visual-bounds contract

A new shared geometry helper layer will become the only owner of node bounds used by layout code.
For every node it must provide:
- base width and height;
- visual bottom overflow for `Module` cards;
- final visual bottom coordinate `y + baseHeight + visualOverflowBottom`;
- container body-start boundary from measured ownership headers.

The important distinction is:
- container layout must respect what the user actually sees, not only the border box returned by React Flow.

### 3.2. Recompute containers from finalized direct children

For both auto and manual flows:
- `Cluster` height = maximum visual bottom of direct module children + cluster bottom padding;
- `Product Part` height = maximum visual bottom of direct cluster/standalone children + product-part bottom padding.

This is hierarchical and bottom-up:
1. finalize module geometry;
2. finalize cluster boxes from modules;
3. finalize product-part boxes from finalized clusters and standalone modules.

### 3.3. Use the same shared bounds in autolayout and manual drag

The corrective scope explicitly rejects having two different resize contracts.
The measured normalization path and the manual drag path must both consume the same shared geometry helpers.

Resulting invariant:
- a layout that is safe after first-open autolayout must remain safe after user dragging;
- a layout that becomes safe after manual dragging must resize its ownership containers using the same visual bounds as autolayout.

### 3.4. Keep deterministic placement, change only the ownership contract

This scope does not switch to force layout.
The seed column model remains deterministic.
What changes is only the contract that determines:
- how child bottoms are computed;
- how container heights are derived;
- how manual drag reflows and resizes ownership boxes after a move.

---

## 4. Shared visual-bounds model

### 4.1. Visual bounds

For `Module` cards we accept a small explicit visual overflow allowance on the lower edge.
It represents the part of the card that the user sees but React Flow does not include in border-box measurement.

Baseline rule:
- `visualBottom(module) = y + measuredHeight + moduleVisualBottomOverflow`

For `Cluster` and `Product Part` no additional outer-shadow overflow is required in this scope.
Their final bottom is still their border box.

### 4.2. Container body-start boundary

Containers keep using measured ownership header boundaries:
- `bodyStartY` for `Cluster`
- `bodyStartY` for `Product Part`

But both layout paths must resolve that value through one shared helper instead of each path interpreting `childMinY` independently.

### 4.3. Column handling

Columns remain inferred from seed `x` positions.
Within one column children are ordered by current `y`, then `id`.
The container lower boundary is never based on average or per-row heuristics.
It is always based on the deepest direct child bottom across all columns.

---

## 5. Code changes

### 5.1. Shared layout bounds helper

Introduce a small pure helper module for diagram layout geometry.
Responsibilities:
- resolve base node width and height from measured/style values;
- resolve visual bottom overflow for modules;
- resolve container body-start from measured ownership headers;
- expose one canonical rect/bottom API for layout consumers.

### 5.2. Measured autolayout normalization

Update the measured normalizer so that:
- child stacking uses shared visual bottom math;
- cluster height uses the deepest direct child visual bottom;
- product-part height uses the deepest finalized cluster/standalone visual bottom.

### 5.3. Manual drag normalization

Extract the manual drag container-resize logic into a pure helper.
That helper must:
- reuse the same shared visual bounds as measured autolayout;
- resolve sibling collisions from the same geometry;
- clamp children from the same measured `bodyStartY` contract;
- resize `Cluster` and `Product Part` from the deepest direct child visual bottom.

### 5.4. Sidecar invalidation

Because the shared geometry contract changes again, the flow sidecar metric version must be bumped.
Older `.flow.json` positions must not silently apply to the new container-resize math.

---

## 6. Test strategy

### 6.1. Geometry evidence

New or updated pure tests must prove:
- module visual bottom is larger than the measured border box by the accepted overflow allowance;
- container height is derived from the deepest direct child visual bottom;
- product-part height is derived from finalized direct children across multiple columns.

### 6.2. Manual drag evidence

The manual drag path must gain direct regression evidence for:
- dragged modules not leaving the parent border visually intersecting their lower edge;
- container resize after drag using measured/shared geometry instead of `style.minHeight` fallback.

### 6.3. Release verification

Required evidence before closeout:
- targeted `npx tsx --test` runs for the touched diagram editor surfaces;
- `npm run build:webview`
- `npm run typecheck:webview`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

---

## 7. Execution streams

### Stream A — Planning baseline
- open the new corrective scope in docs;
- restore active `todo-plan.md`;
- start a new session report for the corrective cycle.

### Stream B — Shared visual bounds
- add shared geometry helpers for diagram node bounds;
- make measured autolayout derive container bottoms from visual child bounds;
- cover the new invariant with pure tests.

### Stream C — Unified manual drag
- extract manual drag resize into a pure helper;
- make shell dragging use the same geometry contract as autolayout;
- add manual-path regression evidence.

### Stream D — Sidecar and SSOT sync
- bump the sidecar layout metric version;
- update accepted Diagram Modules architecture evidence and release-facing docs.

### Stream E — Release build
- run the final release stream and build the next VSIX after all diagram/editor checks are green.

---

## 8. Expected outcome

After this corrective scope:
- the same boundary invariant should hold for first-open autolayout and manual drag;
- `Cluster` and `Product Part` lower borders should be derived from the deepest direct child visual bottom, not only from border-box math;
- deleting or keeping `module-map.flow.json` should no longer change the presence of lower-edge boundary collisions;
- the fix should ship in one new release build for user re-validation.

---

## 9. Implementation progress on 2026-04-08

Already implemented in the active execution cycle:
- a shared layout-bounds helper now owns canonical base width/height, measured ownership `bodyStartY`, and module visual-bottom math;
- measured autolayout normalization now grows `Cluster` and `Product Part` from the deepest direct child visual bottom instead of border-box-only heights;
- manual drag resize no longer lives as a shell-local fallback algorithm and now runs through a dedicated pure manual normalizer using the same geometry contract;
- the shell regression surface explicitly proves that manual position changes route through the unified manual normalizer;
- the flow sidecar layout metric version has been bumped to invalidate stale geometry from the pre-fix contract.

Still pending before closeout:
- sync release-facing docs;
- run the final targeted verification wave plus release build;
- archive the planning doc and execution plan after packaging succeeds.
