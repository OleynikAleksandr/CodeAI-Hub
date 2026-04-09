# Session 027 — Development Tree Sidebar Visualization Prototype

**Date:** 2026-04-09 17:30 (CEST)
**Branch:** main
**Version:** 1.1.923 (unchanged — no code or release surface touched this session)
**Execution Scope Status:** ACTIVE

---

# 1. Work Done in This Session

## Work summary

This session had two distinct phases.

**Phase 0** closed out the React Flow residual cleanup execution cycle left active by Session026. The user decided the follow-up docs pass deferred in Session026 would wait; they asked to mark the cycle `COMPLETED` and move on to a different topic.

**Phase 1** was an interactive design conversation around how the branch-level Development Tree (Product Part → Cluster → Module) should be visualized in the Standalone Project Manager left sidebar after trunk finishes at Diagram Modules. The session produced an interactive HTML prototype iterated across ~6 rounds of feedback, plus an architecture planning document that captures every decision taken during those iterations.

No source code was touched. No release was produced. Version stays at `1.1.923` from Session025.

## Phase 0 — Session026 React Flow residual cleanup cycle closeout

### Stream 0 — Archive active todo-plan, hygiene-commit Session026 report

- Unzipped `TODO/Archive.zip`, moved `doc/TODO/todo-plan.md` (the populated React Flow Residual References Cleanup plan from Session026, all three streams `DONE`) into the archive as `Archive/todo-plan-phase1-react-flow-residual-cleanup.md`, re-zipped the archive cleanly, removed the temporary `Archive/` directory. Verified archive listing shows 22 entries (1 directory + 21 `.md` files).
- Verified no nested `Archive/Archive.zip` debt was reintroduced by the re-zip procedure (Session026 cleaned up the Session025-era version of that debt; this session kept the archive clean by running the exact sequence from `Archive.README.md § "How to archive a new completed todo-plan later"`).
- Replaced `doc/TODO/todo-plan.md` with a short placeholder noting that no execution cycle is active and pointing future sessions to `Docs_Index.md` for scope discovery.
- Confirmed no planning-doc cleanup was needed in `Plans/` for this cycle: Session026 Phase 1 was scoped directly into its `todo-plan.md` without a dedicated `Plans/` intake, so nothing had to be promoted, archived or deleted from `Plans/` as part of closing it out.
- Hygiene-committed `Session026.md` which had been left untracked at the end of Session026 per the standard session-report rule (the next session commits the prior session's report, same pattern as Session026 commit `32b46ba6f` which hygiene-committed Session025.md). The report remains an accurate snapshot of Session026 even though Session027 has since closed the cycle — it reflects the state at the end of Session026 itself.

## Phase 1 — Interactive prototype for Development Tree sidebar visualization

This was the main work of the session. The user asked for a "заготовка внешняя" (external mockup) rather than touching the real `workspace-tree.tsx`, so the entire design exploration lives in a self-contained HTML prototype at `doc/tmp/prototypes/development-tree-sidebar.html` (gitignored — `tmp/` is in `.gitignore`, so the file exists on disk but is not tracked).

### Stream 1 — Initial prototype shell

- Read `packages/ui/project-manager/styles.css` to extract the exact PM sidebar visual contract: `--pm-sidebar-min-width: 220px`, `--pm-sidebar-max-width: 420px`, `pm-tree__item` font-size 13 px with 6×12 padding and 10 px gap, `--pm-tree-marker-size: 24px`, selected border `rgba(66, 201, 162, 0.45)`, status dots for active/todo/blocked/outdated/draft states. Critical invariant: in the current CSS each row shows EITHER a toggle chevron OR a status dot, never both (`workspace-tree.tsx:287`).
- Created `doc/tmp/prototypes/development-tree-sidebar.html` as a self-contained mockup replicating those variables and classes 1:1. First version used fake workspace data (Core Orchestrator, Project Manager, Claude/Codex/Gemini modules) to drive a first "Variant A" layout with PP→Cluster→Module + standalone, plus runtime tumblers for accordion mode, separator row, standalone layout and N/M counters.
- Added a tumbler + inline `svc` / `store` / `adp` kind marker for modules so the reviewer could see how type metadata from `product-parts/<id>.md` would look next to the label.

### Stream 2 — Replace fake data with real Local Core Runtime

- User asked the prototype to use the real workspace structure from `.codeai-hub/codeai-hub-codex-5-4/diagram_modules/product-parts.index.md` and `product-parts/local-core-runtime.md`, pointing to the `Diagram Modules` screenshot of Local Core Runtime for visual reference (3 clusters × multiple modules + 1 standalone module, `Purpose: локальный координатор workflow`).
- Replaced the 5 fake Product Parts with the 4 real ones from the index: `vs-code-extension`, `project-manager`, `local-core-runtime`, `ai-provider-integrations`.
- Populated `local-core-runtime` with its real branch structure from the document:
  - Cluster `workflow-orchestration` → `workflow-step-runner` (service), `stage-transition-policy` (service), `workflow-state-store` (store).
  - Cluster `project-session-context` → `project-session-store` (store), `session-restoration-service` (service).
  - Cluster `artifact-lifecycle` → `artifact-context-loader` (adapter), `artifact-release-coordinator` (service), `project-workspace-artifact-store` (store).
  - Standalone `provider-session-bridge` (adapter).
- Set mock progress so `workflow-orchestration` cluster spec/facade are done, `workflow-step-runner` has 3 of its 5 module artifacts done, `workflow-state-store` has 2 — enough to exercise every interesting visual state (done / in-progress / todo) in one screen.
- Left the other 3 Product Parts as collapsed placeholders with counter `0/1` — their branch workflow has not started yet and they don't have a `product-parts/<id>.md`.

### Stream 3 — Full PM shell around the sidebar

- User pointed out the prototype was only showing the sidebar and asked for the complete Project Manager layout so the sidebar could be evaluated in its real surrounding context. Provided screenshots of Virtual Simulation and Diagram Modules stages showing: macOS window chrome, top tab bar (`Description / Virtual Simulation / Diagram Modules`), split center (Sessions panel | Artifacts panel), bottom status bar (`Context CodeAI-Hub codex 5.4` ↔ `Workflow Tree MVP`).
- Extended the prototype: added a rounded-rect window-chrome wrapper with the three macOS dots and the title `CodeAI Hub Project Manager`.
- Split the main column into three rows: stage tabs on top (clickable, with `--active` matching current selection), a two-column split for Sessions | Artifacts in the middle, and the status bar at the bottom.
- Built a mock Sessions panel: panel header with a `Sessions` title, a session tab `Diagram Modules Codex ×`, a session-id row with mock quota bars (`Session 10% (Resets Apr 9 at 1:06pm)` / `Weekly 49% (Resets Apr 11 at 9:16am)` — real numbers lifted from the user's screenshots), a scrollable feed of mock Codex messages (different for each trunk stage, reproducing the tone of the screenshots), an input box with the placeholder `Type your request or drag files with Shift held…` and a send button, a hint line, and a model bar `Модели: Gpt 5.4 (xhigh) | Токены: 110,328 (57%)`.
- Built a mock Artifacts panel: dynamic title, `Detach` button visible only when the Diagram Modules stage is active (matching the screenshot where Detach only appears on Diagram Modules), a `Artifacts | Help` pill toggle, and a dynamic body that renders different content per selection.
- Wired the stage tabs so clicking a trunk tab (Description/VS/DM) switches both the Sessions feed and the Artifacts panel content to that stage; clicking any branch node in the sidebar keeps the stage tab on `Diagram Modules` (branches live under Diagram Modules conceptually).

### Stream 4 — Row type differentiation and artifact-leaf pruning

- User complained that once `Local Core Runtime` was expanded the tree became a "каша из точечек и треугольничков" — every row looked identical, there was no way to tell at a glance which row was a Product Part, which was a cluster and which was a module. The user asked for either legible labels or short abbreviations (`PP` / `C` / `M`).
- Realized a second problem: the prototype was also rendering three "artifact leaf" rows per open cluster (`Part Specification` under each PP, plus `Cluster Specification` and `Cluster Facade` under each open cluster). These rows were depth-3 leaves that visually blended with real modules and doubled the row count at depth 3. But the same artifacts were already rendered as Artifacts-panel tabs when the corresponding PP or Cluster was selected — so the tree leaves were pure duplication.
- Made two coordinated changes:
  1. Removed `Part Specification`, `Cluster Specification`, `Cluster Facade` tree leaves entirely. `findNode` and `renderArtifactsBody` no longer handle those kinds. Part Specification now becomes a single tab in the Artifacts panel when a PP is selected, mirroring how Cluster selection already produced a 2-tab view and Module selection produced a 5-tab view.
  2. Introduced short type badges `PP` / `CL` / `M` between the marker slot and the label on every branch row, plus per-type CSS modifier classes that change the label font-weight, font-size, color and row padding (PP: 13 px bold primary; Cluster: 12.5 px semibold primary; Module: 12 px regular muted). This made the three row types distinguishable both by badge (for explicit reading) and by typography (for ambient scan).
- Maximum branch depth dropped from 5 to 3 (workspace picker removed entirely in a later stream; PP → Cluster → Module). Every row in a 280 px sidebar had enough space to show at least 15–18 label characters.

### Stream 5 — PP frame, cluster connectors, standalone handling, STD removal, workspace root removal

User looked at the result and gave a dense set of four corrections in a single turn, which were implemented together:

1. **PP frame.** The user asked that the existing `--selected` accent rounded-rect border around the Diagram Modules row be turned into a frame that wraps not just the PP row but ALL of its expanded children. The frame had to be dynamic: expanding a cluster inside the PP should grow the frame vertically, always hugging all descendants.
2. **Cluster connector lines.** A separate screenshot showed the cluster "Artifact Lifecycle" with its modules underneath, and the user pointed out it was still unclear which modules belonged to which cluster. Asked for a vertical line descending from the cluster chevron + horizontal stubs to each module, plus a label-color change on the modules inside an open cluster so they read as part of the cluster above.
3. **Remove `STD` marker.** The earlier `[STD]` pill on standalone modules was no longer needed — standalone modules could be distinguished by their position inside the PP frame (below all clusters, not inside any cluster-connector group) and by a slightly muted label color.
4. **Remove duplicated workspace root.** The tree had a `CodeAI-Hub codex 5.4` row at the top which duplicated the workspace picker above it, stealing one level of depth and horizontal space from every row. The user asked to delete that row; the workspace picker alone carries the workspace name.

Implementation required restructuring the tree from a flat `<ul>` to a nested one. The new structure is:

```
<ul #tree-root>
  <li .trunk-row> Description </li>
  <li .trunk-row> Virtual Simulation </li>
  <li .trunk-row> Diagram Modules </li>
  <li .pm-tree__separator> Development Tree </li>
  <li .pm-tree__pp-wrapper [--open]>
    <div .pm-tree__item> PP row </div>
    <ul .pm-tree__pp-children>         (only when open)
      <li .pm-tree__cluster-wrapper [--open]>
        <div .pm-tree__item> cluster row </div>
        <ul .pm-tree__cluster-children> (only when open)
          <li .pm-tree__item> module </li>
          ...
        </ul>
      </li>
      ...
      <li .pm-tree__item> standalone module </li>
    </ul>
  </li>
  ...
</ul>
```

To support this without breaking HTML semantics, `makeRow` got an optional `tag` parameter — the cluster and PP rows are rendered as `<div>` inside their wrapper `<li>`, while leaf rows stay `<li>`.

New CSS classes added to the prototype (all specified in the architecture doc):

- `.pm-tree__pp-wrapper` / `--open` — the frame around Product Part + children. `border: 1px solid var(--pm-accent-border); background: rgba(66, 201, 162, 0.04); border-radius: 12px;`.
- `.pm-tree__pp-children` — children list inside the wrapper with left margin aligning clusters under the PP label.
- `.pm-tree__cluster-wrapper` / `--open` — cluster row group; open modifier flips the cluster label and chevron to `var(--pm-accent-strong)`.
- `.pm-tree__cluster-children` — module list with `border-left: 1px solid rgba(95, 227, 186, 0.32)` and `margin-left: 33px` so the border aligns under the cluster chevron. Each `> .pm-tree__item` has a `::before` horizontal stub `width: 14px; height: 1px;` from the vertical line to the module row.
- Module labels inside `pm-tree__cluster-children` get `color: var(--pm-text-primary)`; standalone module labels inside `pm-tree__pp-children` get `#b4c0cf` — brighter than muted but not as vivid as the clustered modules.

The `Standalone layout` tumbler was deleted from the control strip along with its listener because `STD`/band were no longer used. The "Separator row", "Accordion mode" and "Show N/M counters" tumblers remained.

### Stream 6 — Tooltip on hover, remove module kind

Final tightening pass before finishing the prototype:

- User confirmed the tree was now readable but said long labels like `Project Workspace Artifact Store` still got truncated with "…" at depth 3 and asked for a hover tooltip that reveals the full name. Added a native `title={label}` attribute to every `pm-tree__label` span — works immediately with zero extra JS, but the user pointed out the OS-controlled delay (~500–1500 ms) feels sluggish. Agreed that production implementation must ship a custom tooltip component with ~150–200 ms delay, overflow detection (`scrollWidth > clientWidth`), PM-themed styling and a portal-rendered layer. Recorded as requirement §4.11 in the architecture doc and as open question §8.2.
- User also asked to remove the "Show module kind" tumbler entirely. Decision: `service` / `store` / `adapter` is agent metadata, not user-facing information — neither the tree nor the Artifacts panel subtitle will show it. Removed the checkbox from the control strip, the `ctl-module-kind` listener, the kind marker rendering in `makeRow` (the element was a no-op with `state.showModuleKind = false` but clutter in the code), and the `Module kind: …` line from the Artifacts panel subtitle when a module is selected. `kind` still lives in the prototype's mock data model because `partTotals`/`clusterTotals` don't read it, but no UI surfaces it.

### Stream 7 — Architecture document + Session report

User asked to formalize every decision from Phase 1 into an architecture planning document under `Plans/`, add a pointer from `Docs_Index.md`, and produce a detailed Session report — explicitly deferring any `todo-plan.md` because the prototype discussion is not finished yet. Created `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md` with:

- Problem / Goal / Non-Goals sections;
- 11 Core Decisions covering tree depth, artifact-tab model, type badges, PP frame, cluster connectors, standalone handling, accordion mode, counter format, tooltip requirement, removal of kind marker, removal of duplicated workspace root;
- Visual Specifications section with exact CSS values for every new class;
- Interaction Rules section for selection semantics and accordion behavior;
- Main Area Tab Model section for PP / Cluster / Module tab layouts;
- 5 Open Questions (Documentation Tree, custom tooltip delay, soft accordion toggle, empty-PP counter formatting, PP ordering);
- Prototype Reference pointing to `doc/tmp/prototypes/development-tree-sidebar.html` with an explicit note that the file is gitignored as a working design artifact;
- Related Documents cross-links;
- Verification Target with nine questions the document must answer unambiguously.

Updated `Docs_Index.md § Plans` with a bullet right after `DevelopmentTree_BranchWorkflow_Architecture.md` pointing to the new visualization doc.

## Important discussions captured in the architecture doc

The following points were argued through during the session and are all recorded in the architecture doc so they do not have to be re-argued:

- **Why no artifact leaves in the tree.** Exposing Part Spec / Cluster Spec / Cluster Facade / 5 Module artifacts as tree rows produced depth-5 tree that did not fit into a 220 px sidebar. The same artifacts are already addressable as tabs in the Artifacts panel (matching the existing `Diagram Modules` pattern where the heavy work happens in the right-hand panel, not as tree leaves). This keeps tree depth at 3 and prevents label truncation past recognition.
- **Why module is a leaf, not expandable.** The earlier exploration had modules as expandable rows with 5 artifact leaves underneath. That gave depth 5 in the worst case and truncated `Module Specification` (20 chars) at depth 4. Making the module a leaf and moving the 5 artifacts into main-area tabs capped depth at 3 and kept labels readable.
- **Why `PP` / `CL` / `M` and not full words.** `PART` / `CLUSTER` / `MODULE` would have consumed 4–7 characters of label width at every depth level. The user accepted `PP` / `CL` / `M` after seeing the result.
- **Why PP frame instead of per-row highlighting.** Coloring PP rows alone didn't make it obvious which Product Part the descendants belonged to — the visual group was implicit. A single rounded-rect frame wrapping the PP row AND all its expanded children made the group explicit without touching the rows inside it.
- **Why cluster connector lines.** Without connectors, modules inside an open cluster looked like siblings of that cluster rather than children — especially since they sit at depth 3 next to standalone modules at depth 2. The vertical `border-left` plus horizontal `::before` stubs establish the parent→child link at the pixel level.
- **Why no `kind` marker in the tree.** Service/store/adapter is metadata for the agent's downstream work (facade contract generation, implementation foundation scaffold), not for the human navigating the sidebar. Showing it would add visual noise without giving the user actionable information. If it ever needs to surface to humans, it goes into the Artifacts panel subtitle, not the tree.
- **Why duplicate workspace root removal was non-negotiable.** The workspace name already lives in the workspace picker above the tree. Rendering it again as a tree root cost one full depth level of horizontal space and one full row of vertical space for zero information gain.
- **Why tooltip must be custom in production.** Native `title` has OS-controlled delay (~500–1500 ms) that is noticeably slow. The prototype uses it because it is one line of code and still demonstrates the correct behavior. Production needs a custom component with configurable delay, overflow detection and PM-themed styling.

## Git commits

(VERY IMPORTANT: при `Execution Scope Status: ACTIVE` следующая сессия обязана просмотреть каждый коммит через `git show --stat <hash>` и `git show <hash>`.)

- `2067e819b docs(archive): close Session026 React Flow residual cleanup cycle into TODO/Archive.zip`
- `368f026f9 docs(session): capture Session026 continuation report for React Flow residual cleanup cycle`
- `2ff9f4ebf docs(plans): add Development Tree sidebar visualization architecture draft`

**Three commits total this session**, all gates green on each. The interactive prototype `doc/tmp/prototypes/development-tree-sidebar.html` was intentionally not committed because `doc/tmp/` matches `tmp/` in `.gitignore` and the file is a working design artifact rather than a shippable deliverable. The architecture document in `Plans/` is the source of truth; the prototype only makes the design clickable.

## Release / artifacts

- **No release build.** Scope was design-only — no source code, no VSIX surface, no release manifest touched. Shipped release remains `codeai-hub-1.1.923.vsix` from Session025.
- **Prototype artifact** lives at `doc/tmp/prototypes/development-tree-sidebar.html` (gitignored; 70 KB self-contained HTML/CSS/JS).
- **Architecture document** lives at `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md` (352 lines, Draft status).

---

# 2. Instructions for Next Session

**Recovery Owner:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md`

**Why no `todo-plan.md`:** The user explicitly said at the end of the session: "TODO Plans пока не делаем, потому что будем дальше обсуждать шаблон, прототип". The design discussion is not finalized yet; the prototype is the current shared workspace, the architecture doc is a Draft. The implementation `todo-plan.md` will only be written once the Draft is promoted to Accepted and the remaining Open Questions (§8 of the architecture doc) are resolved.

## Plans for next session

- Read `doc/Sessions/Session027.md` (this file) plus all three commits of this session via `git show --stat <hash>` and `git show <hash>`.
- Read `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md` in full — this is the single source of truth for the decisions taken during the session. Pay particular attention to §4 (Core Decisions) and §8 (Open Questions).
- Read the sibling workflow document `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md` — the visualization is downstream of the workflow; both docs must stay aligned.
- Open `doc/tmp/prototypes/development-tree-sidebar.html` in a browser (or the Claude Code preview panel) to reproduce the visual state. The file is gitignored and lives on disk only. If it is missing — it can be regenerated from the architecture document specs, or the user can ask the session author for a copy.
- Resume the prototype discussion with the user. Likely topics (not exhaustive):
  - Whether the Documentation Tree belongs in the sidebar at all and, if yes, how (§8.1).
  - Whether to add a soft accordion mode toggle (§8.3).
  - How to render empty Product Parts (§8.4).
  - Product Part ordering rule (§8.5).
  - Refinements to the PP frame color/opacity or connector line visibility if the user looks at the prototype again and sees something to tune.
- After the prototype and architecture doc are finalized, promote the doc from Draft to Accepted and write a new `doc/TODO/todo-plan.md` with an implementation plan targeting:
  - `src/client/project-manager/components/layout/workspace-tree.tsx` and its siblings (currently 394 lines, close to the 500-line guard — the implementation will probably need a new micro-class `workspace-tree-branch-nodes.ts` or similar);
  - `packages/ui/project-manager/styles.css` for the new `pm-tree__pp-wrapper`, `pm-tree__cluster-wrapper`, `pm-tree__cluster-children`, `pm-tree__type-badge--*` classes and the type-specific typography overrides;
  - A new custom tooltip component for the overflow-aware label tooltip (§4.11 of the architecture doc);
  - Main Area tab rendering for PP / Cluster / Module selections (new tab model in the Artifacts panel).

## Known-clean state

- `git status` clean at session end (three commits landed, no untracked changes except `doc/Sessions/Session027.md` which remains untracked per standard rule and will be hygiene-committed next session).
- `doc/TODO/todo-plan.md` is a placeholder pointing to `Docs_Index.md` — no active execution cycle backed by it.
- `doc/TODO/Archive.zip` contains 21 historical `todo-plan` snapshots + 1 directory entry (22 ZIP entries total); last addition is `todo-plan-phase1-react-flow-residual-cleanup.md` from Session026 closeout.
- `doc/SolidWorks-WorkFlow/Plans/` active: `DevelopmentTree_BranchWorkflow_Architecture.md`, `DevelopmentTree_Sidebar_Visualization_Architecture.md` (new Draft), `Implementation_Foundation_Architecture.md`, `MultiProvider_Orchestration_Scenarios.md`.
- `doc/tmp/prototypes/development-tree-sidebar.html` exists on disk at 70 KB (gitignored).
- No code, no CSS, no `package.json` versions, no manifests, no release artifacts were touched.
