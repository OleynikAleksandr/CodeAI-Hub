# Development Tree Sidebar Visualization Architecture

**Status:** Draft for review (2026-04-09)
**Created:** 2026-04-09
**Updated:** 2026-04-09
**Owner:** Oleksandr + Claude
**Scope:** Define how the branch-level Development Tree (Product Part → Cluster → Module) is visualized in the Standalone Project Manager left sidebar so the user can navigate through branches without losing orientation.

**Related:**
- `Plans/DevelopmentTree_BranchWorkflow_Architecture.md` — defines the workflow this visualization renders.
- `System/WorkflowSteps_Overview.md` — trunk + branches shape.
- Prototype artifact: `doc/tmp/prototypes/development-tree-sidebar.html` (gitignored working mockup — not checked into source control; regenerate from this spec or ask its author).

---

## 1. Problem

`Diagram Modules` is the last trunk step. After it the Development Tree begins: per-part branches with clusters, modules and standalone modules. Today the PM left sidebar still shows only trunk stages and a flat child list under `Diagram Modules`. There is no way to:

- open a specific `Product Part` and see its clusters;
- drill into a cluster and see its modules;
- distinguish clustered modules from standalone modules under the same part;
- see, at a glance, whether the user is currently editing a Part Specification, a cluster, a module or a module artifact.

Early iterations showed predictable failure modes once branch nodes were added naively:

- All rows looked identical (triangle or dot + label), so the user could not tell a Product Part from a Cluster from a Module by looking.
- Exposing every branch artifact (`Part Specification`, `Cluster Specification`, `Cluster Facade`, plus five module artifacts) as a tree leaf produced a noisy, 5-level-deep tree where long module names were truncated past recognition at 220 px `min-width`.
- Duplicating the workspace name (once in the workspace picker, once as the tree root) wasted horizontal space and pushed every row further right.

The sidebar must stay narrow (current `--pm-sidebar-min-width: 220 px`, default ~280 px) and readable across all branch states.

---

## 2. Goal

After this scope the PM sidebar must render the Development Tree as a branch-level navigator that is:

- **Obvious in hierarchy** — it is never ambiguous which row is a Product Part, which is a Cluster and which is a Module, even at a glance.
- **Compact in depth** — the tree never goes deeper than 3 visible branch levels, and no tree row ever represents an editable artifact.
- **Focused on the current branch** — when the user opens a Product Part it visually claims the space it needs without hiding the other parts; other parts collapse into slim placeholders.
- **Aligned with the branch workflow** — the visible structure is 1:1 with `DevelopmentTree_BranchWorkflow_Architecture.md`: `Product Part → Cluster → Module` plus standalone modules under the same `Product Part`.

---

## 3. Non-Goals

This scope does not:

- implement the branch workflow itself (that is `DevelopmentTree_BranchWorkflow_Architecture.md`);
- change the top tab bar (`Description / Virtual Simulation / Diagram Modules`);
- change the Sessions panel or the rest of the PM layout;
- introduce a separate "Documentation Tree" section — that is a follow-up scope, see §8;
- define production TypeScript classes or CSS class names in the real `packages/ui/project-manager/styles.css` file (this document defines the visual contract; the implementation plan is a later `todo-plan.md`);
- introduce Mermaid, graph views or any new overall workspace picker.

---

## 4. Core Decisions

### 4.1. Tree depth is capped at 3 branch levels

Every branch row is one of:

- **Product Part** (`PP`) — collapsible, depth 1 under the workspace picker.
- **Cluster** (`CL`) — collapsible, depth 2 under its Product Part.
- **Module** (`M`) — leaf, depth 3 inside a cluster or depth 2 as a standalone under its Product Part.

No branch row represents an editable artifact. No row goes deeper than a leaf module.

### 4.2. Artifacts live in the Artifacts panel, not the tree

`Part Specification`, `Cluster Specification`, `Cluster Facade` and the five module artifacts (`Module Spec`, `Module Facade`, `Impl Foundation`, `TODO Plan`, `Implementation`) are not tree leaves. They are rendered as tabs in the right-hand Artifacts panel when the corresponding PP, Cluster or Module is selected:

- Selecting a Product Part shows one tab — `Part Specification`.
- Selecting a Cluster shows two tabs — `Cluster Spec` and `Cluster Facade`.
- Selecting a Module shows five tabs — `Module Spec`, `Module Facade`, `Impl Foundation`, `TODO Plan`, `Implementation`.

This matches the existing PM pattern where `Diagram Modules` has two tree children (`Module Graph` + session) but the step's real work surface lives in the Artifacts panel. The tree is a navigator; the Artifacts panel is the work surface.

### 4.3. No duplicated workspace root row

The workspace name is already shown in the workspace picker at the top of the sidebar. The tree therefore does not render a `CodeAI-Hub codex 5.4` root row. Trunk stages and Product Parts sit directly under the picker, and every row gets back the horizontal space that used to be consumed by the duplicate root.

### 4.4. Type badges and typography differentiate PP / Cluster / Module

Every branch row has a short uppercase type badge placed between the status marker and the label:

- `PP` — accent-green background (`var(--pm-accent-strong)`), dark text.
- `CL` — blue background (`#4f7ec9`), light text.
- `M` — neutral dark background, muted text + faint border.

Badges are reinforced by per-type typography so the hierarchy is visible even if a user ignores badges entirely:

- **PP rows** — 13 px, bold (700), primary text color, slightly taller padding.
- **Cluster rows** — 12.5 px, semibold (600), primary text color, medium padding.
- **Module rows** — 12 px, regular (400), muted text color, compact padding.

### 4.5. Open Product Part is wrapped in an accent frame

When a `Product Part` is expanded, its row and all of its children (clusters, clustered modules, standalone modules) are wrapped in a single rounded-rect frame with:

- `border: 1px solid var(--pm-accent-border)`
- `background: rgba(66, 201, 162, 0.04)` (very faint accent tint)
- `border-radius: 12px`

The frame is dynamic: expanding a cluster inside the PP adds rows, and the frame grows vertically to keep hugging them. Only one PP frame exists at a time (strict accordion, §4.9). This makes it unambiguous which Product Part the user is currently working inside, without coloring individual rows.

### 4.6. Open Cluster draws a connector-line group to its modules

When a cluster is expanded inside an open PP:

- The cluster row's label and chevron switch to the accent-green color.
- A vertical connector line (`border-left: 1px solid rgba(95, 227, 186, 0.32)`) runs along the left edge of the module list directly under the cluster chevron.
- Each module row draws a short horizontal stub (`::before` pseudo-element, 14 px wide) from the vertical line to the module's status dot.
- Module labels inside an open cluster get `var(--pm-text-primary)` color — visually brighter than modules in a closed cluster or standalone modules, reinforcing that they belong to the highlighted cluster above.

This makes the cluster→module ownership obvious without reading badges.

### 4.7. Standalone modules are visually separated from clustered modules

Standalone modules are rendered as direct children of `pm-tree__pp-children`, under all clusters of the same Product Part. They are:

- not wrapped in any cluster-connector list;
- rendered with the same `M` badge but a slightly muted label color (`#b4c0cf`) compared to clustered modules in an open cluster;
- marked without any `[STD]` inline pill — position inside the PP frame but outside any cluster-children list is sufficient context.

This is a conscious reversal of an earlier `[STD]` marker idea: the extra pill added visual noise without improving clarity once the PP frame and cluster connectors were in place.

### 4.8. No `kind` marker (`svc` / `store` / `adp`) in the tree

Module `kind` (`service`, `store`, `adapter` from `product-parts/<id>.md`) is metadata for the agent, not the user. The sidebar does not render it — neither as an inline marker next to the module label nor as a tooltip. If a future use case genuinely needs the kind to be surfaced to the user, it goes into the Artifacts panel subtitle, not the tree.

### 4.9. Accordion is strict by default

Opening a Product Part collapses any previously open Product Part. Opening a cluster inside a PP collapses any previously open cluster. This bounds the vertical size of the open area and prevents "explosion" where every PP and every cluster is expanded at once, producing a scroll-heavy sidebar.

A soft accordion mode ("user manually collapses") remains a possible toggle for users who prefer it but is not the default.

### 4.10. Counter format is `done/total`

Every collapsible row shows a right-aligned, tabular-numeric counter in the format `done/total` (e.g. `3/12`). The counter aggregates:

- **Module** counter — number of completed artifacts out of five.
- **Cluster** counter — aggregated from its `Cluster Spec`/`Cluster Facade` state plus all its modules.
- **Product Part** counter — aggregated from `Part Specification` plus all clusters plus all standalone modules.

`done/total` was chosen over progress-bar glyphs (`▓▓▒░░`) because it stays readable with totals ranging from 1 to 15+ and because the exact ratio is more informative than a fuzzy bar at this size.

### 4.11. Label overflow shows a tooltip on hover

Module, cluster and Product Part names are often longer than the available label width at depth 3 inside a 220-280 px sidebar (`Project Workspace Artifact Store` is 31 characters; ~15 characters fit comfortably at depth 3). Every row therefore must expose its full name on hover.

- **Prototype** uses the native `title` attribute on the label span — works immediately, but browser-controlled delay (~500–1500 ms) feels sluggish.
- **Production** must ship a custom tooltip component (see §7) with configurable delay (150–200 ms recommended), overflow detection (only shows when `scrollWidth > clientWidth`), and PM-themed styling (`var(--pm-panel)` background, `var(--pm-accent-border)`, 12 px).

---

## 5. Visual Specifications (for the real implementation)

All colors, sizes and spacings below are the contract the production implementation must honor. They are replicated from the prototype CSS, which in turn mirrors `packages/ui/project-manager/styles.css` variables.

### 5.1. Sidebar chrome (unchanged)

- `--pm-sidebar-min-width: 220 px`, `--pm-sidebar-max-width: 420 px`.
- Background `var(--pm-panel)`, right border `1 px solid var(--pm-border-color)`.
- Workspace picker keeps its current look and padding.

### 5.2. Tree row base (mostly unchanged)

- Font-size baseline 13 px; per-type overrides in §4.4.
- `padding: 6px 12px; margin: 0 8px; gap: 10px; border-radius: 10px`.
- Marker slot 24 px square (chevron or status dot, mutually exclusive in the base row API).

### 5.3. Product Part frame

- Wrapper element: `<li class="pm-tree__pp-wrapper">` around the PP row and its children list.
- Open state adds `--open` modifier with:
  - `border: 1px solid var(--pm-accent-border);`
  - `background: rgba(66, 201, 162, 0.04);`
  - `border-radius: 12px;`
  - `padding: 2px 0 8px; margin: 4px 8px;`
- The PP row inside an open wrapper drops its own `--selected` border because the frame already provides the visual selection indicator.
- Children list: `<ul class="pm-tree__pp-children">` with `margin: 2px 10px 0 12px` relative to the wrapper.

### 5.4. Cluster connector group

- Wrapper element: `<li class="pm-tree__cluster-wrapper">` inside `pp-children`.
- Open state adds `--open` modifier with:
  - cluster label color → `var(--pm-accent-strong)`;
  - cluster chevron color → `var(--pm-accent-strong)`.
- Children list: `<ul class="pm-tree__cluster-children">` with:
  - `margin: 0 0 2px 33px;` (the `33 px` aligns the border-left with the cluster row's chevron center);
  - `border-left: 1px solid rgba(95, 227, 186, 0.32);`
- Each module row inside this list adds `padding-left: 18px;` and draws its horizontal stub through `::before`:
  - `position: absolute; top: 50%; left: 0; width: 14px; height: 1px; background: rgba(95, 227, 186, 0.32);`
- Module labels inside the connector list → `var(--pm-text-primary)`.

### 5.5. Standalone module rows

- Plain `<li class="pm-tree__item pm-tree__item--type-m">` as a direct child of `pm-tree__pp-children` (not inside any cluster-children list).
- Label color `#b4c0cf` (between muted and primary).
- No `[STD]` pill, no cluster connector.

### 5.6. Type badges

- `pm-tree__type-badge` base: `padding: 1px 6px; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; line-height: 14px; border-radius: 4px; text-transform: uppercase;`
- `--pp`: `color: #08221c; background: var(--pm-accent-strong);`
- `--cl`: `color: #eaf2ff; background: #4f7ec9;`
- `--m`: `color: var(--pm-text-muted); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);`

### 5.7. Counter

- `pm-tree__counter`: `margin-left: 6px; font-size: 11px; font-variant-numeric: tabular-nums; color: var(--pm-text-muted);`
- Selected row counter color → `var(--pm-accent-strong)`.

---

## 6. Interaction Rules

### 6.1. Selection semantics

- Clicking a trunk tab (`Description`, `Virtual Simulation`, `Diagram Modules`) selects that trunk stage. The sidebar's branch accordion collapses so irrelevant branches are not left open behind the trunk view.
- Clicking a Product Part row selects the part AND expands it. Clicking it again does not toggle off; the toggle affordance is the chevron.
- Clicking the chevron on a Product Part toggles expand/collapse without changing which branch node the user last worked on.
- The same pattern applies to Cluster rows.
- Clicking a Module row (clustered or standalone) selects the module but does nothing else — modules are leaves.

### 6.2. Strict accordion

- Opening a Product Part closes any other open Product Part and resets the "open cluster" pointer.
- Opening a Cluster inside an open PP closes any other open cluster inside the same PP.
- The soft mode (manual collapse) is a deferred optional toggle, not the default.

### 6.3. Active-path highlighting

- Open PP — rendered inside an accent frame (§4.5).
- Open Cluster — label and chevron switch to accent-green, connector lines appear (§4.6).
- Modules inside an open cluster — primary-text-color labels (§4.6).
- Selected row — the existing `pm-tree__item--selected` rules still apply for the row itself; the frame does not replace selection, it complements it.

### 6.4. Stage-tab synchronization

- Selecting any branch node automatically keeps the top `Diagram Modules` tab as the active stage (branches live under Diagram Modules as a conceptual continuation).
- Selecting a trunk tab changes both the active stage AND the selection to that trunk stage.

---

## 7. Main Area Tab Model

Tabs are the work surface for editable artifacts. The Artifacts panel must render:

### 7.1. Product Part selected

- Panel title = Product Part name.
- Single tab: `Part Specification`.
- Filename label: `.codeai-hub/…/development_tree/product-parts/<part-id>/product-part-specification.md`.
- Editor content = Part Specification markdown (fields per `DevelopmentTree_BranchWorkflow_Architecture.md §7.1`).

### 7.2. Cluster selected

- Panel title = `<PP name> › <Cluster name>`.
- Two tabs: `Cluster Spec` and `Cluster Facade`.
- Filenames: `cluster-specification.md` and `cluster-facade-contract.md` under the cluster's directory.
- Switching tabs swaps which of the two markdown files the editor shows; the tree selection does not move.

### 7.3. Module selected (clustered or standalone)

- Panel title = `<PP name> › <Cluster name> › <Module name>` (for clustered), `<PP name> › <Module name>` (for standalone).
- Five tabs: `Module Spec`, `Module Facade`, `Impl Foundation`, `TODO Plan`, `Implementation`.
- Each tab shows a status dot: done (accent-green), in progress (amber), todo (muted grey).
- Filename label updates with the active tab.

### 7.4. Tab status aggregation

The `done/total` counter on a module row equals the number of tab status dots that are in the "done" state. This gives the user a consistent way to read progress from the tree without opening the module.

---

## 8. Open Questions

These are intentionally left unresolved in this scope. They will be revisited in a follow-up session before the `todo-plan.md` for implementation is written.

### 8.1. Documentation Tree vs Development Tree

The Development Tree now claims all branch navigation. There is no separate "Documentation Tree" section in the sidebar, even though the project maintains documentation under `doc/SolidWorks-WorkFlow/System/`, `Clusters/`, `Modules/`, `Contracts/`. Some of that documentation is effectively a "mirror" of the Development Tree (one `Clusters/<cluster>.md` per designed cluster, etc.), and mixing it into the Development Tree would conflate "what we're designing now" with "what we've already documented".

Candidate paths, none committed:

- A second top-level section in the sidebar called `Documentation Tree` that mirrors `Clusters/` / `Modules/` / `Contracts/` structure.
- A per-PP toggle in the Artifacts panel that switches between "editable design artifacts" and "frozen documentation".
- No sidebar surface for documentation at all — rely on the existing IDE file navigator.

### 8.2. Custom tooltip component

The native `title` attribute has an OS-controlled delay (~500–1500 ms) that feels sluggish. The production implementation must ship a custom tooltip with configurable delay (~150–200 ms), overflow detection and PM-themed styling. Details: see §4.11. This is deferred to the implementation `todo-plan.md` — this document records the requirement, not the code.

### 8.3. Soft accordion toggle

Strict accordion is the default (§4.9). Whether the sidebar exposes a user-level toggle for soft accordion (or a per-session persisted preference) is open.

### 8.4. Counter behavior for empty Product Parts

A Product Part whose branch has not been started yet (e.g. `VS Code Extension` in the current workspace) shows `0/1` — only the (unwritten) `Part Specification` is counted. This is honest but visually it looks like "nothing done". Alternative: render placeholder PPs with `—` instead of `0/1`. Not decided.

### 8.5. Ordering of Product Parts

The prototype renders parts in the order they appear in `product-parts.index.md`. Whether the sidebar should respect a user-authored ordering, an alphabetical ordering, or a "currently active first" ordering is open.

---

## 9. Prototype Reference

A fully interactive mockup of this design lives at:

`doc/tmp/prototypes/development-tree-sidebar.html`

The prototype is a self-contained HTML+CSS+JS file that replicates the PM sidebar 1:1 (colors, sizes, typography, marker sizes, border radii), renders the real workspace structure from `.codeai-hub/codeai-hub-codex-5-4/diagram_modules/product-parts.index.md` and the `Local Core Runtime` subtree from `product-parts/local-core-runtime.md`, and makes every interaction in this document clickable. It is gitignored (`doc/tmp/` is excluded from source control) because it is a working artifact for design discussion, not a shippable deliverable. Regenerate it from this spec or ask the session author if the file is missing.

The prototype exposes a small control strip for runtime toggles:

- `Accordion mode` — strict (default) vs soft.
- `Separator row` — whether the `── Development Tree ──` divider is visible between trunk stages and the first Product Part.
- `Show N/M counters` — toggle the right-aligned counters.

The prototype also embeds a full PM shell (window chrome, top tab bar, Sessions panel, Artifacts panel, bottom status bar) so the sidebar can be evaluated in its real surrounding context, not in isolation.

---

## 10. Related Documents

- `Plans/DevelopmentTree_BranchWorkflow_Architecture.md` — the branch workflow this visualization renders (PP Specification, Cluster Design, Module Design, standalone-module path, `Implementation Foundation` gate).
- `System/WorkflowSteps_Overview.md` — trunk + branches shape and the Development Tree preamble.
- `System/SystemArchitecture.md §6` — Diagram Modules boundary, ownership hierarchy, sidecar v2.
- `Contracts/FacadeClassDiagram_DesignAndMaintenance.md` — facade contract rules that Cluster Facade and Module Facade tabs must satisfy.

---

## 11. Verification Target

This planning scope is sufficiently prepared when the following questions can be answered unambiguously from this document without opening the prototype:

1. What are the three branch row types and how does a user tell them apart at a glance?
2. Where do Part Specification, Cluster Spec, Cluster Facade and the five module artifacts live?
3. How does the sidebar make it obvious which Product Part the user is currently editing?
4. How does the sidebar make it obvious which modules belong to which cluster?
5. How does the sidebar handle module names that are too long for the available label width?
6. What is the maximum tree depth? Why not deeper?
7. Why is `STD` marker removed and how are standalone modules still distinguishable from clustered ones?
8. Why is the workspace name not rendered as a tree root row?
9. Which open questions block the implementation `todo-plan.md`?
