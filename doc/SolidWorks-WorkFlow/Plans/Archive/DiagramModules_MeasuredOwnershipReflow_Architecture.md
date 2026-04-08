# Diagram Modules Measured Ownership Reflow — Architecture

**Status:** Proposed corrective scope
**Date:** 2026-04-08
**Owner:** Oleksandr + Codex
**Scope:** post-release corrective wave after `1.1.908`; replace repair-style measured normalization with measured-first ownership reflow for `Diagram Modules`, derive `Cluster` / `Product Part` sizes from real rendered module cards and ownership headers, invalidate stale sidecars again, ship a new release build

**Related documents:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
- `doc/SolidWorks-WorkFlow/System/Diagram_UserFacing_Layout_And_Format_Architecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_MeasuredAutolayout_MinGap_Architecture.md`
- `doc/Sessions/Session013.md`

---

## 1. Problem statement

Release `1.1.908` fixed one symptom but not the contract itself.
User validation on the real `diagram_modules` workspace proved:
- module-to-module gaps are now kept more consistently;
- but module cards can still visually touch or cross the lower boundary of a `Cluster`;
- and children can still visually touch or cross the lower boundary of a `Product Part`.

Important evidence from the user-provided workspace:
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini/.codeai-hub/codeai-hub-gemini/diagram_modules`
- there is no `module-map.flow.json` there right now.

That means the defect is reproduced on the freshly computed layout itself, not on stale sidecar geometry.

---

## 2. Root cause

### 2.1. The current measured pass still starts from guessed ownership geometry

The current runtime does measure actual node boxes after React Flow mount, but it still keeps the overall ownership layout shape from the projection pass:
- `Module` cards can be pushed downward after render;
- `Cluster` / `Product Part` sizes are then adjusted as a repair step;
- but the parent ownership layout is not recomputed from scratch from measured children.

In other words:
- `x` ordering and rough seed heights come from the projection;
- the measured pass patches the result;
- the measured pass does **not** become the primary owner of container geometry.

### 2.2. Container body start is still heuristic

The actual visual boundary where children are allowed to begin depends on the real rendered ownership header:
- `Product Part` title/meta/purpose block;
- `Cluster` title/meta/purpose block.

Today that boundary is still effectively derived from estimated budgets.
As long as this remains heuristic, one side of the container may be repaired while another side is still wrong.

### 2.3. The correct invariant is hierarchical, not pairwise

The real layout invariant is not just:
- "keep siblings apart by at least `4px`".

The real invariant is:
1. measure the true rendered `Module` cards;
2. derive `Cluster` body packing and final height from those measured cards plus the measured cluster header boundary;
3. derive `Product Part` body packing and final height from the already-finalized `Cluster` boxes, standalone modules, and the measured product-part header boundary.

Without this ownership-first hierarchy, every next fix is still guesswork.

---

## 3. Accepted solution

### 3.1. Move from repair-pass to measured-first reflow

`Diagram Modules` will keep the deterministic projection only as a seed for:
- stable node ids;
- ownership relations;
- column `x` positions;
- sibling ordering.

But final `y` coordinates and container heights must be recomputed by a measured-first reflow pass after first render.

### 3.2. Measure real ownership boundaries

The runtime must collect not only measured node width/height, but also the real rendered ownership body-start boundary:
- for `Cluster` — actual header content height plus its fixed top padding and body gap;
- for `Product Part` — actual header content height plus its fixed top padding and body gap.

This measured body-start boundary becomes the authoritative `childMinY` during reflow.

### 3.3. Rebuild ownership containers bottom-up from measured children

Bottom-up reflow must be hierarchical:
1. finalize all `Module` positions inside each `Cluster` using measured module heights and measured cluster body-start;
2. finalize each `Cluster` height from the deepest measured child bottom plus bottom padding;
3. finalize all `Cluster` and standalone `Module` positions inside each `Product Part` using measured product-part body-start and already-finalized child heights;
4. finalize each `Product Part` height from the deepest child bottom plus bottom padding;
5. only then keep top-level product parts separated.

### 3.4. Keep the deterministic visual model

The new reflow still must not behave like a generic force layout.
It must remain deterministic:
- preserve the seed `x` columns from the projection;
- preserve stable ordering inside each column by existing `y`, then `id`;
- pack downward only;
- keep the minimum safe gap invariant as a lower bound, not as the primary layout mechanism.

---

## 4. Measured-first reflow algorithm

### 4.1. Measurement contract

Every visible node can carry measured width/height from React Flow.

Ownership containers additionally carry:
- `bodyStartY` — the real y-boundary below which child content may begin.

This value is measured from the actual rendered ownership header DOM, not estimated from string length.

### 4.2. Cluster reflow

For each `Cluster`:
- infer visual columns from existing seed `x` positions of child modules;
- sort module cards within each column by current `y`, then `id`;
- start each column at measured `bodyStartY`;
- place every next card at `previousCardBottom + MIN_SAFE_GAP`;
- compute final cluster height from the deepest card bottom plus bottom padding.

### 4.3. Product-part reflow

For each `Product Part`:
- use already-finalized `Cluster` heights plus measured standalone module heights;
- infer columns from the seed `x` positions of child clusters/modules;
- sort children inside each column by current `y`, then `id`;
- start each column at measured product-part `bodyStartY`;
- stack children downward with the same minimum safe gap;
- compute final product-part height from the deepest child bottom plus bottom padding.

This rule makes product-part size a direct function of its finalized children instead of a projection-time estimate.

### 4.4. Top-level packing

Top-level `Product Part` nodes are handled only after all ownership containers are finalized.
Their y-separation uses finalized style heights, not stale measured container heights from the seed pass.

---

## 5. Sidecar policy

The layout metric version must be bumped again.

Reason:
- release `1.1.908` sidecars may still encode ownership geometry accepted under the repair-pass contract;
- this scope introduces a different layout owner and a different interpretation of container geometry;
- stale sidecars must not silently win over the new ownership reflow.

Accepted action:
- increment `FLOW_SIDECAR_LAYOUT_METRIC_VERSION`;
- keep `revision` matching unchanged;
- recompute when sidecar version is stale.

---

## 6. Test strategy

### 6.1. New regression surface

The pure reflow surface must prove:
- cluster modules start below the measured ownership body-start boundary, not below the old heuristic boundary;
- cluster height is derived from finalized measured module heights plus bottom padding;
- product-part height is derived from finalized cluster/module heights plus bottom padding;
- top-level product parts use finalized reflow heights for downstream separation.

### 6.2. Measurement bridge evidence

The facade / measurement bridge surface must prove:
- ownership headers expose stable DOM hooks for measurement;
- the measured bridge includes ownership `bodyStartY` in the measured node payload;
- the shell compares snapshots with the new measured contract and applies the reflow automatically.

### 6.3. Release verification

Required evidence before closeout:
- `npx tsx --test ...diagram-editor...`
- `npm run build:webview`
- `npm run typecheck:webview`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

---

## 7. Execution streams

### Stream A — Planning baseline
- open the new corrective scope in planning docs;
- restore active `todo-plan.md`;
- register the active plan in `Docs_Index.md`.

### Stream B — Ownership measurement contract
- extend measured node payload with ownership body-start metrics;
- expose DOM hooks from ownership renderers;
- collect the new measurements in the React Flow bridge.

### Stream C — Measured-first ownership reflow
- rebuild `Cluster` and `Product Part` geometry from measured children instead of patching guessed container heights;
- update shell comparison logic so the reflow applies automatically and converges.

### Stream D — Sidecar + evidence + SSOT
- bump the sidecar layout metric version;
- extend regression evidence to the measured ownership contract;
- sync accepted docs.

### Stream E — Release and closeout
- prepare release-facing docs;
- build the next release;
- archive the planning doc and execution plan after successful packaging.

---

## 8. Expected outcome

After this corrective scope:
- first-open `Diagram Modules` layout should no longer depend on guessed ownership heights for `Cluster` and `Product Part`;
- module cards should keep a safe gap both from sibling modules and from container boundaries;
- `Cluster` and `Product Part` heights should be functions of finalized measured children;
- the fix should ship as a new release for the same validation workspace.
