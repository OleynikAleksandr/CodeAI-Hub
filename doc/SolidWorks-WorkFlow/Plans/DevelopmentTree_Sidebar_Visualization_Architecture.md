# Development Tree Sidebar Visualization Architecture

**Status:** Draft for review (2026-04-09, rev 2)
**Created:** 2026-04-09
**Updated:** 2026-04-09
**Owner:** Oleksandr + Claude
**Scope:** Define how the Project Manager left sidebar renders the full project navigation — Documentation Tree (trunk stages), Development Tree (branches), and the interaction model with the Sessions and Artifacts panels — using one unified "node = step" pattern across trunk and branches.

**Related:**

- `Plans/DevelopmentTree_BranchWorkflow_Architecture.md` — the branch workflow this visualization renders.
- `System/WorkflowSteps_Overview.md` — trunk + branches shape.
- Prototype artifact: `doc/tmp/prototypes/development-tree-sidebar.html` (gitignored working mockup — not checked into source control; see §10 for rev 1 vs rev 2 notes).

---

## 1. Problem

The current sidebar pattern for trunk stages (Description / Virtual Simulation / Diagram Modules) expands each stage into two child rows: an "artifact" row and a "session" row. In the actual source code (`src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`), both child rows do the same thing — clicking either one opens the artifact on the right AND opens the session on the left. They are two aliases for the same navigation action, not two independent targets.

The alias pattern works in trunk because each stage has exactly one `(artifact, session)` pair, but it breaks as soon as the workflow enters the Development Tree:

- A Cluster has two artifacts (Cluster Spec + Cluster Facade), produced by one design agent. The two-sub-row pattern cannot model this cleanly.
- A Module has five artifacts (Module Spec, Module Facade, Implementation Foundation, TODO Plan, Implementation), produced by multiple agents across distinct phases. Replicating the sub-row pattern would push tree depth to five and truncate long module names beyond recognition at a 220 px sidebar `min-width`.
- No existing decision covers how "real code" (the Implementation phase) is visualized at all.
- The previous Draft (rev 1) proposed a manual "Development Tree" initializer button and treated trunk and branch nodes as structurally different, introducing asymmetry that had no architectural justification.

The sidebar must stay compact (current `--pm-sidebar-min-width: 220 px`, default ~280 px) and readable across every navigation state, from Description all the way to an active Implementation session inside a standalone module.

---

## 2. Goal

The sidebar renders project navigation as a single coherent tree where:

- **Every selectable row follows one rule.** Clicking a row populates both panels: the left panel shows that row's agent session(s), the right panel shows that row's artifact(s). No sub-rows. No per-stage special cases.
- **Tabs appear only when count > 1.** A Module with five artifacts renders a five-tab Artifacts panel. A Cluster with two artifacts renders a two-tab panel. A stage with one artifact renders no tab bar — just the content.
- **Artifact and Session panels are independent.** The user can browse one artifact tab while continuing a different agent session in the left panel. The two zones do not force-sync with each other.
- **Development Tree is never manually initialized.** It auto-populates from Diagram Modules data in real time. No buttons, no triggers, no explicit "entering development mode" — as soon as Diagram Modules materializes a new Product Part, Cluster, or Module, that node appears in the sidebar tree.
- **Tree depth stays ≤ 3.** Product Part → Cluster → Module. No sub-step rows under modules — the five module sub-steps live as tabs, not as tree leaves.
- **Documentation and Development are visually separated.** A simple section label groups trunk stages; a divider introduces the auto-populating Development Tree below them.

---

## 3. Non-Goals

This scope does not:

- implement the branch workflow itself (owned by `DevelopmentTree_BranchWorkflow_Architecture.md`);
- define how individual agent sessions are started for each branch node (deferred, see §8.1);
- define the detailed internal layout of the Implementation tab code view (deferred, see §8.2);
- define the refactoring flow for mutations and deletions of already-started Development Tree nodes (deferred to a separate architectural document, see §9.1);
- introduce a separate section that mirrors `doc/SolidWorks-WorkFlow/System/Clusters/Modules/Contracts/` — "Documentation Tree" in this document is only a label over trunk stages, not a literal tree of documentation files;
- change the top tab bar shape (it stays at three buttons: Description, Virtual Simulation, Diagram Modules);
- define production TypeScript classes or CSS class names in the real `packages/ui/project-manager/styles.css` file — this document defines the visual contract; the implementation plan is a later `todo-plan.md`.

---

## 4. Core Decisions

### 4.1. Unified "node = step" pattern

Every selectable row in the sidebar is a **step**. Selecting a step populates both PM panels:

- **Left panel (Sessions zone)** — the agent session(s) belonging to this step. Tab bar appears only when there are two or more sessions.
- **Right panel (Artifacts zone)** — the artifact(s) belonging to this step. Tab bar appears only when there are two or more artifacts.
- **The two zones are independent.** Clicking a tab in one zone does not force the other zone to change. The user can read any artifact tab while continuing a conversation with any session tab for the same node.

This rule applies identically to trunk stages, Product Parts, Clusters, and Modules. No sub-rows anywhere.

### 4.2. Sidebar sections: Documentation Tree and Development Tree

The sidebar is divided into two sections by visual labels:

```
Workspace picker
── Documentation Tree ──
○ Description
○ Virtual Simulation
○ Diagram Modules
── Development Tree ──
▼ <Product Part 1>
  ▼ <Cluster 1>
    ○ <Module 1>
    ...
  ○ <Standalone Module>
▼ <Product Part 2>
  ...
```

"Documentation Tree" is a label above the three trunk stages. "Development Tree" is a divider below them, followed by the auto-populated branch tree.

Neither label nor divider is selectable. They exist only as visual grouping. Neither is rendered until at least one corresponding entry exists (the Development Tree divider only appears once Diagram Modules has produced at least one Product Part).

### 4.3. No duplicated workspace root

The workspace name is shown in the workspace picker at the top of the sidebar. The tree does not render a duplicate workspace row. Trunk stages and branch nodes sit directly under the workspace picker, separated only by the section labels.

### 4.4. Tree depth capped at 3 branch levels

Every branch node is one of:

- **Product Part** (`PP`) — collapsible, depth 1 under the Development Tree divider.
- **Cluster** (`CL`) — collapsible, depth 2 under its Product Part.
- **Module** (`M`) — leaf, depth 3 inside a cluster or depth 2 as a standalone under its Product Part.

Modules are **always leaves**. No branch row goes deeper than a leaf module, and no branch row represents an editable artifact or a sub-step.

### 4.5. No artifact leaves in the tree

`Part Specification`, `Cluster Specification`, `Cluster Facade`, and the five module artifacts are not tree rows. They live as tabs in the right-hand Artifacts panel for the selected node. This is what caps the tree at depth 3 — artifacts are "below the tree" in the main area, not inside it.

### 4.6. Type badges and typography differentiate PP / CL / M

Every branch row has an uppercase type badge placed between the status marker and the label:

- `PP` — accent-green background (`var(--pm-accent-strong)`), dark text.
- `CL` — blue background (`#4f7ec9`), light text.
- `M` — neutral dark background, muted text with a faint border.

Badges are reinforced by per-type typography so hierarchy is visible even when users ignore badges entirely:

- **PP rows** — 13 px, bold (700), primary text color, slightly taller padding.
- **Cluster rows** — 12.5 px, semibold (600), primary text color, medium padding.
- **Module rows** — 12 px, regular (400), muted text color, compact padding.

### 4.7. Open Product Part is wrapped in an accent frame

When a Product Part is expanded, its row and all of its children (clusters, clustered modules, standalone modules) are wrapped in a single rounded-rect frame:

- `border: 1px solid var(--pm-accent-border)`
- `background: rgba(66, 201, 162, 0.04)` (very faint accent tint)
- `border-radius: 12px`

The frame is dynamic: expanding a cluster inside the PP adds rows, and the frame grows vertically to keep hugging them. Only one PP frame exists at a time (strict accordion, §4.11).

### 4.8. Open Cluster draws a connector line group to its modules

When a cluster is expanded inside an open Product Part:

- The cluster row's label and chevron switch to the accent-green color.
- A vertical connector line (`border-left: 1px solid rgba(95, 227, 186, 0.32)`) runs along the left edge of the module list directly under the cluster chevron.
- Each module row draws a short horizontal stub (14 px `::before` pseudo-element) from the vertical line to the module's status dot.
- Module labels inside the open cluster get `var(--pm-text-primary)` color — visually brighter than modules in a closed cluster or standalone modules.

### 4.9. Standalone modules are visually separated from clustered modules

Standalone modules are rendered as direct children of the PP wrapper, under all clusters of the same Product Part. They are:

- not wrapped in any cluster-connector list;
- rendered with the same `M` badge but a slightly muted label color (`#b4c0cf`);
- marked without any `[STD]` inline pill — position inside the PP frame but outside any cluster connector group is sufficient context.

### 4.10. No `kind` marker in the tree

Module `kind` (`service`, `store`, `adapter` from `product-parts/<id>.md`) is agent-side metadata, not user-facing information. The sidebar does not render it.

### 4.11. Strict accordion is the only mode

Opening a Product Part collapses any previously open Product Part. Opening a cluster inside a PP collapses any previously open cluster.

There is **no** "soft accordion" toggle. Strict accordion is not a preference — it is architecturally required because the Project Manager cannot simultaneously render multiple module sessions in the Sessions panel or multiple module artifact sets in the Artifacts panel. Allowing two modules to be expanded at once would create a navigation illusion that the panels cannot back.

### 4.12. Counter format is `done/total`

Every collapsible row shows a right-aligned, tabular-numeric counter in the format `done/total` (e.g., `3/12`). The counter aggregates:

- **Module** counter — number of completed artifacts out of five.
- **Cluster** counter — Cluster Spec (1) + Cluster Facade (1) + all modules (5 each).
- **Product Part** counter — Part Specification (1) + all cluster totals + all standalone module totals.

No placeholder value is needed for empty Product Parts. Because the Development Tree auto-syncs from Diagram Modules (§4.19), every node that exists in the sidebar always has a known structural total — the counter starts at `0/N` where `N` is the structural total and grows as work is done.

### 4.13. Label overflow shows a tooltip on hover

Module, cluster, and Product Part names are often longer than the available label width at depth 3 inside a 220–280 px sidebar. Every row must expose its full name on hover.

- **Prototype** uses the native `title` attribute on the label span — works immediately, but browser-controlled delay (~500–1500 ms) feels sluggish.
- **Production** must ship a custom tooltip component (see §8.3) with configurable delay (150–200 ms recommended), overflow detection (only shows when `scrollWidth > clientWidth`), and PM-themed styling.

### 4.14. Module decomposition: three sessions, five artifacts

A module is designed and implemented across three distinct agent sessions, producing five artifacts:

- **Design session** (one agent) — produces two artifacts:
  - Module Specification
  - Module Facade Contract
- **Planning session** (one agent) — produces two artifacts:
  - Implementation Foundation
  - TODO Plan
- **Execution session** (one agent) — produces one "artifact":
  - Implementation (the actual code in the repository — see §4.16)

This gives each module exactly **5 artifact tabs** in the Artifacts panel and **3 session tabs** in the Sessions panel.

The three-session split reflects three cognitive modes: design ("what this module is and how it is exposed"), planning ("how to build it step by step"), and execution ("do the plan"). Each phase has a different context window profile and different rollover boundaries. Formalizing them as separate sessions is cleaner than forcing one agent to hold all three modes simultaneously.

Product Parts and Clusters use the same `(artifacts, sessions)` pattern but with fewer elements:

- **Product Part** — 1 session (Design), 1 artifact (Part Specification). No tab bars on either side.
- **Cluster** — 1 session (Design), 2 artifacts (Cluster Specification + Cluster Facade Contract). Two tabs in the Artifacts panel, none in Sessions.

The Cluster single-session rule is symmetrical with the Module Design session: one agent writes both the specification and the facade contract because they are two answers to related questions about the same conceptual unit.

### 4.15. TODO Plan is a living artifact

TODO Plan is co-owned by two sessions within the same module:

- **Planning session** creates the initial structure (phases, streams, subtasks, expected commit messages).
- **Execution session** is **required** to update the same file during implementation: flip statuses (`TODO` → `IN_PROGRESS` → `DONE` / `BLOCKED`), fill in git commit hashes after each commit, restructure streams when a subtask grows past three files.

This formalizes the convention already running for `doc/TODO/todo-plan.md` inside CodeAI Hub itself. The TODO Plan tab in the Artifacts panel always reflects live execution state — no separate "Implementation dashboard" artifact is needed, because TODO Plan already is the dashboard.

### 4.16. Implementation tab is a code view, not a document

The Implementation tab in the Artifacts panel is not a markdown viewer. It is a window into the module's actual source files as they exist in the repository. The detailed layout — file tree scope, preview granularity, VS Code integration, git diff surface — is deferred to §8.2.

The contract fixed by this document is only: the Implementation tab shows code state, not design documents. PM does not compete with VS Code as a code editor; it provides visibility into what the Execution agent has produced so the user can spot-check before running the compiled result in the real app.

### 4.17. Tab grouping via phase separators

Both tab bars (Artifacts panel and Sessions panel) use visual separators to group tabs by phase for modules:

```
Artifacts:  [Spec] [Facade] │ [Foundation] [TODO] │ [Implementation]
Sessions:   [Design]        │ [Planning]          │ [Execution]
```

The separator `│` is a thin vertical divider with extra spacing on both sides. Three groups correspond to three phases (Design / Planning / Execution), visually signaling "you are crossing a phase boundary" when the user moves between tabs — without splitting the tree into a Documentation Tree and a Code Tree.

Clusters and Product Parts do not render separators (they have only one phase and ≤ 2 artifacts).

### 4.18. Help pattern

Help is always accessible through a dedicated button in the Artifacts panel top bar (existing `Artifacts | Help` pattern from the Diagram Modules stage).

For branch nodes that have no session started and no artifact written yet, the panels default to showing Help content in both zones — Help is the empty state of any freshly auto-created branch node. The user clicks into a Product Part / Cluster / Module for the first time and sees Help explaining what this type of node is, what artifacts will be produced, what agents will help, and how to start work. Once the user begins work, the normal artifact/session content replaces the empty-state Help, and Help goes back to being a button in the top bar.

There is no separate "Development Tree landing page" — Help is distributed per node as empty-state content, not centralized as a global landing surface.

### 4.19. Auto-sync Development Tree from Diagram Modules

The Development Tree section below the divider is auto-populated from Diagram Modules data in real time.

- **Source of truth:** `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md` plus `product-parts/<part-id>.md` files.
- **Trigger:** any write to those files. As soon as a new Product Part, Cluster, or Module appears in Diagram Modules data, a corresponding node appears in the Development Tree section with status "not started" (counter `0/N`).
- **No manual initialization.** There is no "Development Tree" button in the top tab bar. The top tab bar stays at three buttons (Description, Virtual Simulation, Diagram Modules). The branch tree grows silently as Diagram Modules grows.
- **Additions are silent.** Adding a new module in Diagram Modules never prompts the user — the new module simply appears in the Development Tree as an unimplemented leaf.
- **Ordering follows Diagram Modules data.** Product Parts are rendered in the order they appear in `product-parts.index.md`. Clusters and modules are rendered in the order they appear in each `product-parts/<part-id>.md`. No alternate sorting is applied.
- **Deletions and mutations of already-started elements are out of scope here.** Those are refactoring operations that invoke the separate refactoring flow defined in §9.1.

**Architectural safety contract:** auto-sync is safe by default because of an explicit instruction to the Diagram Modules agent — **new functionality is always introduced through new modules or new clusters**, and mutations of existing elements are reserved for rare exceptional cases. This instruction matches the "closed modules" principle already required across the project ("new functionality = new module"). Because additions dominate in practice, auto-sync handles the overwhelming majority of Diagram Modules changes without ever prompting the user, and the refactoring flow (§9.1) only covers the rare residual cases.

### 4.20. Top tab bar highlighting for branch nodes

When the user selects any branch node in the Development Tree (Product Part, Cluster, or Module), the **Diagram Modules** top tab stays highlighted. Branches conceptually grow out of Diagram Modules, and the DM tab is the user's anchor back to the architecture view.

This preserves the existing behavior in `workspace-tree.tsx` where `activeStage = "diagram_modules"` remains set when a branch node is active, and it aligns with the user's mental model that the Diagram Modules graph is the master schema of the application.

Clicking the Diagram Modules top tab while a branch node is selected returns the view to the Diagram Modules step (graph on the right, DM session on the left), without disturbing the branch selection state in the sidebar — the sidebar still shows the previously selected PP / Cluster / Module as selected, ready for the user to click back into it.

---

## 5. Visual Specifications

All colors, sizes, and spacings below are the contract the production implementation must honor. They are replicated from the prototype CSS, which in turn mirrors `packages/ui/project-manager/styles.css` variables.

### 5.1. Sidebar chrome

- `--pm-sidebar-min-width: 220 px`, `--pm-sidebar-max-width: 420 px`.
- Background `var(--pm-panel)`, right border `1 px solid var(--pm-border-color)`.
- Workspace picker keeps its current look and padding.

### 5.2. Tree row base

- Font-size baseline 13 px; per-type overrides in §4.6.
- `padding: 6px 12px; margin: 0 8px; gap: 10px; border-radius: 10px`.
- Marker slot 24 px square (chevron or status dot, mutually exclusive in the base row API).

### 5.3. Section labels and divider

- `── Documentation Tree ──` and `── Development Tree ──` are rendered as plain text rows with `text-transform: uppercase; font-size: 10px; letter-spacing: 0.15em; color: var(--pm-text-muted); padding: 10px 16px 4px;`.
- They are non-selectable (no click handler, no hover state, no marker slot, no counter).
- The Development Tree divider is not rendered until at least one PP exists in Diagram Modules data.

### 5.4. Product Part frame

- Wrapper element: `<li class="pm-tree__pp-wrapper">` around the PP row and its children list.
- Open state adds `--open` modifier with:
  - `border: 1px solid var(--pm-accent-border);`
  - `background: rgba(66, 201, 162, 0.04);`
  - `border-radius: 12px;`
  - `padding: 2px 0 8px; margin: 4px 8px;`
- The PP row inside an open wrapper drops its own `--selected` border because the frame provides the selection indicator.
- Children list: `<ul class="pm-tree__pp-children">` with `margin: 2px 10px 0 12px` relative to the wrapper.

### 5.5. Cluster connector group

- Wrapper element: `<li class="pm-tree__cluster-wrapper">` inside `pp-children`.
- Open state adds `--open` modifier with:
  - cluster label color → `var(--pm-accent-strong)`;
  - cluster chevron color → `var(--pm-accent-strong)`.
- Children list: `<ul class="pm-tree__cluster-children">` with:
  - `margin: 0 0 2px 33px;` (the `33 px` aligns the border-left with the cluster chevron center);
  - `border-left: 1px solid rgba(95, 227, 186, 0.32);`
- Each module row inside this list adds `padding-left: 18px;` and draws its horizontal stub through `::before`:
  - `position: absolute; top: 50%; left: 0; width: 14px; height: 1px; background: rgba(95, 227, 186, 0.32);`
- Module labels inside the connector list → `var(--pm-text-primary)`.

### 5.6. Standalone module rows

- Plain `<li class="pm-tree__item pm-tree__item--type-m">` as a direct child of `pm-tree__pp-children` (not inside any cluster-children list).
- Label color `#b4c0cf` (between muted and primary).
- No `[STD]` pill, no cluster connector.

### 5.7. Type badges

- `pm-tree__type-badge` base: `padding: 1px 6px; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; line-height: 14px; border-radius: 4px; text-transform: uppercase;`
- `--pp`: `color: #08221c; background: var(--pm-accent-strong);`
- `--cl`: `color: #eaf2ff; background: #4f7ec9;`
- `--m`: `color: var(--pm-text-muted); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);`

### 5.8. Counter

- `pm-tree__counter`: `margin-left: 6px; font-size: 11px; font-variant-numeric: tabular-nums; color: var(--pm-text-muted);`
- Selected row counter color → `var(--pm-accent-strong)`.

### 5.9. Tab phase separators

- Applied only to Module nodes (5 artifact tabs, 3 session tabs).
- Separator element: 1 px wide, 60% tab bar height, `background: var(--pm-border-color)`, positioned with `margin: 0 8px` on both sides.
- Artifacts panel separators: between `Facade` and `Foundation`, and between `TODO` and `Implementation`.
- Sessions panel separators: between `Design` and `Planning`, and between `Planning` and `Execution`.
- Clusters and Product Parts do not render separators.

---

## 6. Interaction Rules

### 6.1. Selection semantics

- Clicking a trunk stage row (Description / Virtual Simulation / Diagram Modules) selects that stage and populates both panels with the stage's artifact and session.
- Clicking a Product Part row selects the PP and expands it (strict accordion). Clicking the chevron toggles expansion without changing selection.
- Clicking a Cluster row selects the cluster and expands it. Same chevron semantics.
- Clicking a Module row selects the module. Modules are leaves — no expansion.
- Panels synchronize independently: clicking an artifact tab in the right panel does not force the session tab in the left panel to change, and vice versa.

### 6.2. Strict accordion (only mode)

- Opening a Product Part closes any other open Product Part and resets the "open cluster" pointer.
- Opening a Cluster inside an open Product Part closes any other open cluster inside the same PP.
- There is no soft-accordion toggle. This is architectural, not a preference (§4.11).

### 6.3. Active-path highlighting

- Open Product Part — rendered inside an accent frame (§4.7).
- Open Cluster — label and chevron switch to accent-green, connector lines appear (§4.8).
- Modules inside an open cluster — primary-text-color labels (§4.8).
- Selected row — the existing `pm-tree__item--selected` rules still apply for the row itself; the frame complements selection, it does not replace it.

### 6.4. Top tab bar synchronization

- Clicking a trunk stage top tab changes the active stage AND selects that stage in the sidebar.
- Selecting any branch node (PP, Cluster, Module) in the sidebar keeps the Diagram Modules top tab highlighted (§4.20).
- Clicking the Diagram Modules top tab while a branch node is selected returns the view to the Diagram Modules step (graph on the right, DM session on the left) without clearing the sidebar branch selection.

### 6.5. Empty-state Help for new branch nodes

- A branch node that has no session started and no artifact written defaults to showing Help in both panels.
- Help content is type-specific: Product Part explains what a Part Specification is and how the Design session will produce it; Cluster explains the two-artifact design session; Module explains the three-session pipeline and the five artifacts.
- Help is always also accessible via a dedicated button in the Artifacts panel top bar for nodes that already have content.
- There is no separate landing page for the Development Tree as a whole.

---

## 7. Main Area Tab Model

This section describes what the Sessions panel (left) and the Artifacts panel (right) render for every selectable node type. Tab bars are present only when count > 1 (§4.1).

### 7.1. Description

- **Sessions:** 1 (Description agent). No tab bar.
- **Artifacts:** 1 (`Final_Description.md`). No tab bar.
- **Help:** button in the Artifacts panel top bar.

### 7.2. Virtual Simulation

- **Sessions:** 1 (VS agent). No tab bar.
- **Artifacts:** 1 (`virtual-simulation.md`). No tab bar.
- **Help:** button in the Artifacts panel top bar.

### 7.3. Diagram Modules

- **Sessions:** 1 (DM agent). No tab bar.
- **Artifacts:** 1 (the rendered graph view). No tab bar. The underlying markdown DSL files (`product-parts.index.md`, `product-parts/*.md`) are not surfaced as separate tabs — the user sees the graph, not the source files.
- **Help:** button in the Artifacts panel top bar.

### 7.4. Product Part

- **Sessions:** 1 (Design agent for this PP). No tab bar.
- **Artifacts:** 1 (`Part Specification`). No tab bar.
- **Help:** button in the Artifacts panel top bar.
- **Panel title:** `<Workspace> / <Product Part name>`.

### 7.5. Cluster

- **Sessions:** 1 (Cluster Design agent). No tab bar.
- **Artifacts:** 2 tabs — `Cluster Spec`, `Cluster Facade`. No phase separator (only one phase).
- **Help:** button in the Artifacts panel top bar.
- **Panel title:** `<Product Part> › <Cluster name>`.

### 7.6. Module (clustered or standalone)

- **Sessions:** 3 tabs — `Design │ Planning │ Execution`. Phase separators between Design and Planning and between Planning and Execution.
- **Artifacts:** 5 tabs — `Module Spec`, `Module Facade` │ `Implementation Foundation`, `TODO Plan` │ `Implementation`. Phase separators after `Facade` and after `TODO Plan`.
- **Help:** button in the Artifacts panel top bar.
- **Panel title for clustered module:** `<Product Part> › <Cluster> › <Module>`. For standalone: `<Product Part> › <Module>`.
- **Tab status dots:** done (accent-green), in progress (amber), todo (muted grey).

### 7.7. Tab status aggregation

- The `done/total` counter on a Module row equals the number of artifact tab status dots in the "done" state (out of five).
- The Cluster counter aggregates Cluster Spec + Cluster Facade + all modules.
- The Product Part counter aggregates Part Specification + all cluster totals + all standalone module totals.

---

## 8. Open Questions

Three questions remain open after this revision. Two of them (§8.1 and §8.2) must be resolved before the implementation `todo-plan.md` can be written; the third (§8.3) is an implementation detail only.

### 8.1. Agent session initialization

How is each agent session (Design / Planning / Execution) started for a branch node? Specifically:

- When the user first selects a new branch node (empty state, Help showing), what triggers the first session?
- Is there a "Start Design" button in the Sessions panel empty state, or does the session start automatically when the user sends the first message, or does Diagram Modules generate session shells ahead of time for every tree node it produces?
- Who creates the Planning session — the user manually after Design is marked `done`, or the Planning agent auto-starts when Design artifacts reach `done` status?
- Same question for Execution relative to Planning.
- What happens if Design is marked `done` and the user later returns to change Spec or Facade — is a new Design session started, is the old one resumed, or is this a refactoring operation (§9.1)?

This is the most significant gap in the current design and affects both the sidebar and the Sessions panel empty-state UX.

### 8.2. Implementation tab detailed view

§4.16 establishes that the Implementation tab is a code view, not a markdown document. The exact layout is deferred. Sub-questions:

- **Scope of files shown** — only files inside the module's directory (from Foundation file-structure), or all files touched during the Execution session (git-based), or both options switchable?
- **Level of detail** — file tree only, file tree plus read-only code preview, or file tree plus live git diff against the commit when Foundation was frozen?
- **VS Code integration** — an embedded viewer inside the tab, an "Open in VS Code" button that exits PM to the IDE, or both in combination?
- **Non-file artifacts** — tests, configs, `package.json`, build output — are they part of the Implementation tab or surfaced elsewhere (a future Build / Tests tab)?
- **Runtime result** — is there a "build is green / red, tests pass / fail" summary inside the Implementation tab, or is that a separate future tab?

### 8.3. Custom tooltip component (implementation-only)

The native `title` attribute used in the prototype has an OS-controlled delay (~500–1500 ms) that feels sluggish. Production must ship a custom tooltip with configurable delay (~150–200 ms), overflow detection (`scrollWidth > clientWidth`), and PM-themed styling. This is deferred to the implementation `todo-plan.md` — the requirement is recorded here, not the code.

---

## 9. Deferred to Separate Documents

### 9.1. Refactoring flow for Diagram Modules mutations and deletions

Auto-sync (§4.19) silently applies only to **additions** in Diagram Modules. Mutations (rename, structural change) and deletions of already-started Development Tree nodes are refactoring operations that must not happen silently. They are deferred to a separate architectural document in `Plans/`.

Non-normative teaser (for continuity only, not a contract): the refactoring flow will go through the DM agent — the user asks the DM agent to restructure, DM adjusts the graph, and the core automatically recomputes the Development Tree. New nodes appear as "not started". Mutated nodes that already have work produce warnings. Deleted nodes with work require explicit confirmation. The exact mechanics, the warning dialog format, and the data preservation rules are all out of scope for this document.

The refactoring flow is simplified in advance by the architectural contract in §4.19: because the DM agent always introduces new functionality through new modules or clusters, the refactoring flow only needs to cover the residual edge cases of mutation and deletion. The common case of adding functionality is fully handled by auto-sync without ever invoking the refactoring flow.

---

## 10. Prototype Reference

A fully interactive mockup of the earlier (rev 1) design lives at:

`doc/tmp/prototypes/development-tree-sidebar.html`

The prototype replicates the PM sidebar 1:1 (colors, sizes, typography, marker sizes, border radii) and renders the real workspace structure from `.codeai-hub/codeai-hub-codex-5-4/diagram_modules/product-parts.index.md`. It is gitignored (`doc/tmp/` is excluded from source control) because it is a working artifact for design discussion, not a shippable deliverable.

**Rev 1 vs rev 2:** The current prototype still reflects rev 1 of this document. Specifically, it:

- still shows the 2-sub-row trunk pattern under trunk stages (artifact + session rows) instead of the unified "one node = one step" pattern of §4.1;
- does not render phase separators in the Artifacts panel tab bar (§4.17);
- does not render a Sessions panel tab bar for modules (§7.6 requires 3 tabs);
- does not display the `── Documentation Tree ──` label above trunk stages (§4.2);
- assumes manual Development Tree initialization via a button, which has since been replaced by the auto-sync contract (§4.19);
- uses the native `title` tooltip, which is acceptable for demonstration but not for production (§4.13).

The prototype should be regenerated from rev 2 specifications before it is used as a visual reference for the implementation `todo-plan.md`. Regeneration is a scope item for the next session, not a blocker for promoting this document to Accepted.

---

## 11. Related Documents

- `Plans/DevelopmentTree_BranchWorkflow_Architecture.md` — the branch workflow this visualization renders (PP Specification, Cluster Design, Module Design, standalone-module path, `Implementation Foundation` gate).
- `System/WorkflowSteps_Overview.md` — trunk + branches shape and the Development Tree preamble.
- `System/SystemArchitecture.md §6` — Diagram Modules boundary, ownership hierarchy, sidecar v2.
- `Contracts/FacadeClassDiagram_DesignAndMaintenance.md` — facade contract rules that Cluster Facade and Module Facade tabs must satisfy.

---

## 12. Verification Target

This planning scope is sufficiently prepared to advance from Draft toward Accepted when the following questions can be answered unambiguously from this document without opening the prototype:

1. What are the three branch row types and how does a user tell them apart at a glance? (§4.4, §4.6)
2. Where do Part Specification, Cluster Spec, Cluster Facade, and the five module artifacts live? (§4.5, §7)
3. How does the sidebar make it obvious which Product Part the user is currently editing? (§4.7)
4. How does the sidebar make it obvious which modules belong to which cluster? (§4.8)
5. How does the sidebar handle module names that are too long for the available label width? (§4.13)
6. What is the maximum tree depth? Why not deeper? (§4.4, §4.5)
7. Why is the `STD` marker removed and how are standalone modules still distinguishable from clustered ones? (§4.9)
8. Why is the workspace name not rendered as a tree root row? (§4.3)
9. Which top tab is highlighted when a branch node is selected, and why? (§4.20)
10. How many agent sessions and how many artifacts does each type of node (trunk stage, PP, Cluster, Module) have? (§4.14, §7)
11. How does the Development Tree get built, and does the user have to trigger anything? (§4.19)
12. What happens when Diagram Modules changes after Development Tree work has already started? (§4.19, §9.1)
13. What is the state of the panels when a branch node is selected but no work has begun yet? (§4.18, §6.5)
14. How are the three module phases (Design / Planning / Execution) visually separated without splitting the tree into two? (§4.17)
15. Which open questions block the implementation `todo-plan.md`? (§8)

**Promotion rule:** advance this document from **Draft** to **Accepted** once §8.1 (agent session initialization) and §8.2 (Implementation tab detailed view) are resolved in a follow-up session. §8.3 (custom tooltip component) remains as an implementation task only and does not block promotion. The rev 2 prototype regeneration is also not a promotion blocker — it is a working artifact for the implementation phase, not part of the architectural contract.
