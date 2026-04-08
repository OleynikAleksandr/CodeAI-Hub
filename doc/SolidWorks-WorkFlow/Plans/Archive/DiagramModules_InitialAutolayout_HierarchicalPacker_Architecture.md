# Diagram Modules Initial Autolayout Hierarchical Packer — Architecture

**Status:** Completed corrective scope shipped in release `1.1.911`
**Date:** 2026-04-08
**Owner:** Oleksandr + Codex
**Scope:** post-release corrective wave after `1.1.910`; fix the remaining `Diagram Modules` defect where first-open autolayout still lets modules visually run into `Cluster` and `Product Part` lower bounds, while preserving the already-working manual layout behavior

**Related documents:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_SharedVisualBounds_And_ManualAutolayout_Architecture.md`
- `doc/Sessions/Session015.md`

---

## 1. Problem statement

Release `1.1.910` fixed the defect for manual dragging, but did not fix the same defect for first-open autolayout.

Validated evidence after release `1.1.910`:
- manual drag now keeps positive visual gaps between `Module`, `Cluster`, and `Product Part` boundaries;
- first-open autolayout still produces screenshots where the lower edge of a module visually runs into the lower edge of its `Cluster` or `Product Part`;
- the problem reproduces after deleting `module-map.flow.json`, so this is no longer explainable by stale sidecar positions.

Latest user evidence:
- screenshot: `/Users/oleksandroliinyk/Desktop/Screenshot 2026-04-08 at 13.11.36.png`
- workspace: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini/.codeai-hub/codeai-hub-gemini/diagram_modules`

The corrective conclusion is now explicit:
- the shared visual-bounds contract from `1.1.910` was necessary for manual mode;
- but the remaining autolayout path still starts from an old heuristic seed and only applies a repair pass afterward;
- that architecture is too weak for dense localized content.

---

## 2. Root cause

### 2.1. Initial autolayout is still repair-style, not measured-first

`module-stage-react-flow.ts` still creates an initial projection using a deterministic but heuristic layout seed.
Then `diagram-editor-measured-layout-normalizer.ts` tries to repair that seed after React Flow measurements arrive.

This means the runtime still depends on guessed intermediate geometry for the first-open path.

### 2.2. Manual mode and initial autolayout now have different requirements

Manual dragging after `1.1.910` behaves correctly because the user already provided intent and the runtime only needs to:
- preserve the user position;
- clamp it to owner body bounds;
- separate collisions;
- resize containers.

Initial autolayout is different.
There is no user intent to preserve.
The runtime should be free to repack the hierarchy from measured dimensions.

Therefore one mistake in the previous fix was treating both paths as if they should use the same preservation strategy.
They should share bounds math, but not the same placement policy.

### 2.3. The missing invariant is a hierarchical pack-and-validate loop

The remaining bug exists because initial autolayout still does not perform a true bottom-up measured pack.
The correct owner contract is:
- pack `Module` cards inside each `Cluster` from real measured sizes;
- compute final `Cluster` boxes from the deepest direct child visual bottom;
- pack `Cluster` boxes and standalone `Module` cards inside each `Product Part` from those finalized child boxes;
- compute final `Product Part` boxes from the deepest direct child visual bottom;
- repeat validation until the layout stabilizes and every relevant gap is non-negative and at least `minGap`.

### 2.4. Persisted manual layouts must not be destroyed

A full measured repack is correct only when the runtime is rendering the seed autolayout.
If `module-map.flow.json` exists, the runtime must preserve the saved manual positions and only enforce the existing safety invariants.

So the new corrective scope needs an explicit layout-source split:
- `seed-autolayout` path: rebuild from measured hierarchy;
- `persisted-sidecar` path: preserve manual placement and only normalize bounds.

---

## 3. Accepted solution

### 3.1. Introduce explicit projection layout source

The projection delivered to the shell must say whether it came from:
- seed projection without sidecar;
- projection with persisted sidecar positions.

This flag becomes part of the measured autolayout decision.

### 3.2. Replace measured initial autolayout with a hierarchical packer

For `seed-autolayout` only, the measured pass will stop being a repair pass.
It will become a deterministic hierarchical packer:
1. group direct children by container and by visual column key;
2. sort each column top-to-bottom;
3. place children sequentially from `bodyStartY` using measured visual heights;
4. resize the owner from the deepest direct child visual bottom;
5. continue bottom-up from `Cluster` to `Product Part`;
6. run the same logic again until no layout signature changes.

### 3.3. Keep manual and sidecar layout on preserve-and-normalize policy

For `persisted-sidecar` mode we keep the current user-respecting behavior:
- preserve saved coordinates as much as possible;
- clamp to container body bounds;
- repair collisions;
- resize owners.

This avoids breaking the already-working manual mode.

### 3.4. Add an explicit final validation pass

After packing the seed layout, the runtime must validate the following conditions:
- sibling gap between vertically stacked items in the same column is `>= minGap`;
- bottom gap between deepest child and owner boundary is `>= minGap`;
- the same rule holds at both levels: `Module -> Cluster` and `Cluster/Standalone -> Product Part`.

If any rule fails after one pass, the measured packer repeats until a fixed point or a safe iteration cap is reached.

---

## 4. Implementation outline

### 4.1. Projection metadata

Add a small projection-level layout source field.
This should be produced when the diagram loader applies or skips `module-map.flow.json`.

### 4.2. Measured seed packer helper

Introduce a pure helper dedicated to measured initial autolayout.
Responsibilities:
- build a parent-to-children index;
- infer stable visual columns from current `x` anchors;
- repack child `y` positions from measured visual heights;
- resize owners from deepest child bottoms;
- return a new snapshot and layout signature.

### 4.3. Fixed-point measured normalizer

`diagram-editor-measured-layout-normalizer.ts` should become a mode-aware coordinator:
- `seed-autolayout` -> run hierarchical measured packer until stable;
- `persisted-sidecar` -> keep current conservative normalization path.

### 4.4. Shell integration

The shell keeps the existing manual drag normalizer unchanged.
Only the measured path gets the new layout-source-aware branch.

---

## 5. Test strategy

### 5.1. Seed autolayout regression

Add a measured-layout regression fixture that mirrors the actual dense scenario:
- two clusters at the top of the product part;
- standalone modules below;
- measured module heights large enough that a heuristic seed would undershoot the parent bounds.

Required proof:
- cluster bottom is below the deepest module visual bottom by at least `minGap`;
- product-part bottom is below the deepest direct child visual bottom by at least `minGap`.

### 5.2. Persisted layout preservation

Add explicit evidence that the measured path does not repack a persisted/manual layout from scratch when a sidecar-backed projection is loaded.

### 5.3. Release verification

Required before closeout:
- targeted `npx tsx --test` runs for measured normalizer and shell-related diagram surfaces;
- `npm run build:webview`;
- `npm run typecheck:webview`;
- `./scripts/build-all.sh`;
- `./scripts/build-release.sh --use-current-version`.

---

## 6. Expected outcome

After this corrective scope:
- manual dragging must continue to keep safe gaps exactly as in release `1.1.910`;
- first-open autolayout without `module-map.flow.json` must stop depending on guessed container heights and instead repack from measured hierarchy;
- dense localized `Cluster` and `Product Part` cases must converge to a stable safe layout after the measured validation loop;
- the fix must ship in one new release build for user validation.

---

## 7. Implementation progress on 2026-04-08

Already implemented in the active execution cycle:
- projection now declares `layoutSource`, so the shell can distinguish `seed-autolayout` from `persisted-sidecar`;
- the measured shell path is now layout-source-aware while manual drag remains unchanged;
- `seed-autolayout` now uses a pure hierarchical packer that repacks children from measured `bodyStartY` and measured visual heights, then resizes `Cluster` and `Product Part` owners until the layout settles;
- regression evidence now covers both sides of the split: safe seed autolayout and preserved sidecar-backed manual composition.
- release verification passed through targeted `tsx --test` runs, `npm run build:webview`, `npm run typecheck:webview`, `./scripts/build-all.sh`, and `./scripts/build-release.sh --use-current-version`, producing release `1.1.911`.
