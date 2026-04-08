# Diagram Modules Measured Autolayout Min-Gap Enforcement — Architecture

**Status:** Proposed corrective scope
**Date:** 2026-04-08
**Owner:** Oleksandr + Codex
**Scope:** post-release corrective wave after `1.1.907`; measured post-render normalization for `Diagram Modules`, global minimum safe gap between `Product Part` / `Cluster` / `Module`, stale sidecar invalidation, new release build

**Related documents:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
- `doc/SolidWorks-WorkFlow/System/Diagram_UserFacing_Layout_And_Format_Architecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- `doc/Sessions/Session013.md`

---

## 1. Problem statement

Release `1.1.907` hardened the heuristic height budgets for the initial `Diagram Modules` projection, but user validation immediately showed that the core visual defect is still alive:
- module cards can still visually overlap one another;
- module cards can still visually touch or cross cluster boundaries;
- standalone modules can still visually touch or cross the lower product-part boundary.

The new screenshot after `1.1.907` proves that the remaining bug is not just an unlucky localized constant.
The active implementation still relies on a projection-time estimate of text height, while the actual rendered DOM height can become larger after React Flow measures the node.

Result:
- the nominal layout gap exists in code,
- but the effective visual gap can collapse to zero or become negative after render.

---

## 2. Root cause

### 2.1. Two different geometries exist today

Current `Diagram Modules` rendering effectively has two geometries:
1. **projection geometry** — calculated in `module-stage-react-flow.ts` from text heuristics and fixed constants;
2. **rendered geometry** — the actual DOM size after React Flow mounts the custom node and the browser lays out the text.

The first geometry is used to decide:
- child `y` positions,
- cluster heights,
- product-part heights.

The second geometry is what the user actually sees.

### 2.2. Existing collision logic does not protect the first-open layout

`diagram-editor-shell.tsx` already has sibling-separation logic, but it only runs for moved nodes after drag interactions.
It does not normalize the first-open layout against the real measured node boxes.

Therefore the current contract is:
- “estimate first-open layout once”
- and only later “repair collisions if the user drags something”.

That is the wrong ownership boundary for this bug.

### 2.3. Minimum gap is already present nominally, but not enforced on measured boxes

The code already contains nominal gaps and paddings larger than `4px`.
That means the missing piece is not “one more gap constant”.
The missing piece is a hard post-render invariant:
- the **actual measured rectangles** of `Product Part`, `Cluster`, and `Module` must keep a global minimum safe gap.

---

## 3. Accepted solution

### 3.1. Introduce a measured normalization pass

`Diagram Modules` will keep the deterministic projection pass as the initial seed layout, but after React Flow finishes measuring nodes, the UI must run one additional normalization pass using the actual measured node sizes.

This pass becomes the owner of the hard visual safety invariant.

### 3.2. Introduce one global hard invariant

A single hard invariant is added for the measured pass:
- `MIN_SAFE_GAP = 4px`

This invariant applies to:
- `Module` vs sibling `Module`;
- `Module` vs `Cluster` inner boundary;
- `Cluster` vs sibling `Cluster` / standalone `Module` inside a `Product Part`;
- any child node vs the lower boundary of its container.

Important:
- the visual design may still use larger semantic gaps such as `12px`;
- `4px` is not the preferred aesthetic spacing;
- it is the **minimum allowed effective gap** after render.

### 3.3. Keep layout deterministic by moving only later siblings downward

The measured normalization pass must not behave like a generic graph solver.
It should stay deterministic and conservative:
- preserve the existing `x` positions;
- preserve the existing sibling order implied by the projection;
- move only later siblings downward when measured boxes would otherwise overlap or violate the minimum gap;
- resize containers after child normalization.

This keeps the layout readable and avoids “teleporting” early nodes upward or sideways.

---

## 4. Measured-pass algorithm

### 4.1. Data collection

After React Flow reports that nodes are measured, the runtime collects for every visible node:
- actual measured width;
- actual measured height;
- current projected `x` / `y`;
- parent ownership (`cluster`, `productPart`, or top-level).

### 4.2. Bottom-up normalization

Normalization runs bottom-up:
1. normalize all children of each `Cluster`;
2. resize the `Cluster` to the lowest measured child bottom plus container padding;
3. normalize all children of each `Product Part` using already-updated cluster sizes;
4. resize the `Product Part` to the lowest measured child bottom plus container padding;
5. normalize top-level ownership nodes only if container growth would create overlap between top-level siblings.

### 4.3. Downward packing rule

Inside one parent container:
- children are processed in stable order by current `y`, then `x`, then `id`;
- a child is clamped to the parent header/body start boundary;
- if its measured rectangle would overlap any already-placed sibling with horizontal intersection, it is pushed downward until the gap becomes at least `MIN_SAFE_GAP`;
- if a later sibling already has enough space, it keeps its original `y`.

### 4.4. Container resize rule

After children are normalized:
- container width remains at least the existing minimum width;
- container height becomes `max(minHeight, lowestChildBottom + paddingBottom)`;
- the lower boundary is therefore driven by the **real** rendered child content, not by heuristic text math.

---

## 5. Sidecar policy

The sidecar contract must be bumped again.

Reason:
- old `.flow.json` positions can represent geometry that was accepted under the pre-measured contract;
- the new measured-pass runtime owns a different layout invariant;
- stale sidecars must not silently reapply pre-fix geometry as if it were still canonical.

Accepted action:
- increment `FLOW_SIDECAR_LAYOUT_METRIC_VERSION`;
- keep revision matching unchanged;
- continue to fall back to computed layout when sidecar coverage/version is stale.

---

## 6. Test strategy

### 6.1. New required regression surface

The old projection-only tests are no longer sufficient.
The new scope must introduce a pure measured-layout regression surface that proves:
- stacked cluster modules are pushed downward to keep at least `4px` effective gap when actual measured heights exceed projected heights;
- product-part height expands so the last child keeps at least `4px` distance from the lower boundary;
- top-level ownership nodes remain non-overlapping if container growth changes downstream heights.

### 6.2. Existing evidence that must remain green

The scope still requires targeted verification of the existing `Diagram Modules` surface:
- `npx tsx --test ...diagram-editor...`
- `npm run build:webview`
- `npm run typecheck:webview`

### 6.3. Release verification

After code and docs are green:
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

The release is considered valid only after the new VSIX is created successfully.

---

## 7. Execution streams

### Stream A — Planning baseline
- open the corrective scope in planning docs;
- restore an active `todo-plan.md`;
- register the new active plan in `Docs_Index.md`.

### Stream B — Measured normalization core
- add a pure measured-layout normalizer with a hard `MIN_SAFE_GAP` invariant;
- align node typing so measured width/height can travel through the controlled React Flow state.

### Stream C — React Flow measurement bridge
- read actual node sizes after first render from React Flow;
- hand measured boxes back into the shell;
- apply normalization automatically before any manual drag interaction.

### Stream D — Sidecar invalidation and regression evidence
- bump layout metric version;
- extend regression coverage for measured gap enforcement;
- sync accepted docs with the new ownership contract.

### Stream E — Release and closeout
- prepare release-facing docs;
- build the next release;
- archive planning and execution docs after successful packaging.

---

## 8. Expected outcome

After this corrective scope:
- `Diagram Modules` first-open layout should no longer depend solely on heuristic text-height guesses;
- every visible `Product Part`, `Cluster`, and `Module` should keep at least a `4px` effective gap from neighboring boundaries;
- localized dense content should no longer require manual node dragging just to stop overlaps;
- the fix should ship in a new release after full release packaging.
