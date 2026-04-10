# Session 028 — Development Tree Sidebar Visualization: Unified Node=Step Pattern + Auto-Sync (Rev 2)

**Date:** 2026-04-09 (CEST, evening)
**Branch:** main
**Version:** 1.1.923 (unchanged — design-only session, no code or release surface touched)
**Execution Scope Status:** ACTIVE

---

# 1. Work Done in This Session

## Work summary

This session continued the Development Tree sidebar visualization scope that Session027 opened. The user started the session by asking to restore context and decide the next step on the rev 1 Draft. Instead of jumping to an implementation `todo-plan.md`, the session turned into a deep design conversation that fundamentally rewrote the architectural model of the document across ~9 iterative rounds of feedback.

The session produced two commits:

- **`23272be45`** — hygiene-commit of `Session027.md` (left untracked at the end of its own session per the standard rule).
- **`80c223a5f`** — complete rewrite of `Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md` from rev 1 (351 lines) to rev 2 (522 lines), incorporating every decision reached during the design discussion.

No source code was touched. No release was produced. Version stays at `1.1.923`. The prototype at `doc/tmp/prototypes/development-tree-sidebar.html` was NOT regenerated during this session — it still reflects the rev 1 model and needs to be rebuilt against rev 2 specifications before it can be used again as a visual reference. This is documented explicitly in §10 of the rewritten architecture doc and is scoped for the next session.

## Key design shifts rev 1 → rev 2

This section captures the argument flow so that rev 2 decisions remain traceable and do not have to be re-derived from scratch in future sessions.

### Shift 1 — The trunk sub-row pattern is two aliases, not two targets

The session started by the user flagging a fundamental question that rev 1 had glossed over: a Module has five artifacts driven by multiple agents, but the existing trunk pattern (two sub-rows per stage: "artifact" + "session") cannot scale to that. I investigated the actual source code in `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts` and discovered that in the current trunk implementation, clicking either sub-row produces the exact same effect: both panels populate with the stage's artifact and session simultaneously. The two sub-rows are two aliases for one navigation action, not two independent targets.

This reframing changed the problem entirely. Instead of asking "how do we extend the 2-sub-row pattern to 5 artifacts", the question became "is the 2-sub-row pattern even necessary anywhere". The user saw this immediately and proposed: remove sub-rows from trunk stages as well, treat every selectable row in the sidebar as a "step" that populates both panels, and let multiple artifacts / multiple sessions become tabs in their respective panels when count > 1.

This became §4.1 of rev 2 ("Unified node = step pattern") and is the foundation for every other decision in the document.

### Shift 2 — Artifact and Session panels are independent, not synced

Once the unified pattern was on the table, the user made a second important refinement: in branch nodes where a Module has 5 artifacts but potentially 3 different agent sessions, the two panels should NOT force-sync with each other. The user explicitly wants to be able to browse one artifact tab while continuing a conversation with a different agent session. This is a divergence from the trunk alias pattern — in trunk, panels are jointly addressed; in branches, they become independent tab surfaces.

This is captured in §4.1 as the "independence" clause.

### Shift 3 — Cluster = 1 agent, 2 artifacts; Module = 3 agents, 5 artifacts

The user confirmed the cluster pattern unilaterally (one design session producing two outputs — Spec + Facade). Then we discussed module decomposition in detail and arrived at a 3-phase split:

- **Design** (Module Spec + Module Facade) — same cognitive mode as Cluster design.
- **Planning** (Implementation Foundation + TODO Plan) — "how to build it step by step" mode. Foundation and TODO are naturally co-written because Foundation defines the scaffold and TODO breaks it into micro-tasks (≤3 files each) that reference the scaffold.
- **Execution** (Implementation code) — "do the plan" mode. Different context profile from Planning (code, tests, commits vs. architectural thinking).

The alternative 2-agent split (Design + "everything else in one go") was considered and rejected because forcing one agent to be both planner and executor conflates two different skill modes and wastes context on thinking history while coding.

This became §4.14 of rev 2.

### Shift 4 — TODO Plan is a living artifact, not a static document

The user proposed that instead of building a separate "Implementation dashboard" artifact, the existing TODO Plan file should be elevated to a living artifact with a formal update contract: the Planning agent creates the initial structure, and the Execution agent is **required** to update the same file during implementation (status flips, commit hashes, stream restructuring when a subtask grows past 3 files).

This is exactly how `doc/TODO/todo-plan.md` already works inside CodeAI Hub itself, so the contract is trivial to enforce — the convention already exists in `CLAUDE.md`. Formalizing it as the contract for per-module TODO Plans collapses the "Implementation dashboard" idea into TODO Plan itself and eliminates a whole artifact type I had been about to propose.

This became §4.15 of rev 2.

### Shift 5 — Implementation tab is a code view, not a markdown document

The user initially raised concern about visualizing Implementation: "I just don't quite picture how this would be visualized." My first response was to propose a dashboard with progress bars, commit lists, and TODO checklist — but the user reframed this more cleanly: Implementation is not a document, it is the result of work. Documents (Spec, Facade, Foundation, TODO) describe the work; code is the work. Trying to shoehorn code into the markdown-viewer model of the other 4 tabs is wrong.

The correct model is: the Implementation tab is a window into the actual source files in the repository. Details of the exact layout (file tree scope, preview granularity, VS Code integration, git diff surface) are deferred to §8.2 because the user said "how exactly to show it is a separate discussion". But the contract is fixed: PM does not compete with VS Code as an editor; it provides visibility into what the Execution agent has produced so the user can spot-check before running the compiled app.

This became §4.16 and partial §8.2 of rev 2. The user noted that modern users increasingly trust the AI and verify by running the compiled app rather than reading code line by line, which supports the "window into the codebase" model rather than "editor competitor" model.

### Shift 6 — Tree should NOT be split into Doc and Code subtrees

I raised the question of whether the Development Tree should be split into two: a "Documentation Tree" subsection (Spec, Facade, Foundation) and a "Code Tree" subsection (TODO, Implementation). The user had floated this idea briefly when asking about Implementation visualization.

We argued through it and decided NO. Splitting would duplicate the PP / Cluster / Module structure across two trees, forcing the user to navigate two places to see one module's full lifecycle. Instead, the 3-phase boundary is expressed through:

- session boundaries (Design / Planning / Execution sessions are 3 different sessions);
- tab ordering (tabs appear in phase order: Spec, Facade → Foundation, TODO → Implementation);
- visual phase separators (`│`) in both tab bars (Artifacts and Sessions) between phases.

This gives the benefit of a phase split without splitting the tree. Captured as §4.17 "Tab grouping via phase separators" in rev 2.

### Shift 7 — Trunk sub-rows are simple (1 artifact + 1 session each)

After the unified pattern was accepted, I over-explained trunk stages in one of my replies, implying Description / VS / DM needed different treatment or that DM was a "leaf + container" special case. The user corrected me sharply: all three trunk stages are identical — each has exactly 1 artifact and 1 session, and DM's artifact is the rendered graph view, not individual markdown files. There is no special case. PP branches do not nest under DM in the sidebar tree — they live as siblings below a separator (which was already captured in rev 1 §4.3 and I had temporarily forgotten).

This correction tightened §4.2 "Sidebar sections" and §7 "Main Area Tab Model" in rev 2: trunk stages are uniformly described as 1-artifact-1-session rows under the Documentation Tree label, with no special treatment for DM.

### Shift 8 — Development Tree is auto-populated, not manually initialized

This is the largest structural shift of the session. My initial plan had a 4th button "Development Tree" in the top tab bar, which the user would click after completing Diagram Modules to trigger tree generation. The user then radically simplified this by pointing out that the core can simply watch the Diagram Modules data files and auto-populate the Development Tree in real time:

- Source of truth: `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md` + `product-parts/<part-id>.md`.
- Trigger: any write to those files. As soon as a new PP / Cluster / Module appears in DM data, a corresponding node appears in the Development Tree section in the sidebar with status "not started".
- No button in the top tab bar. The top tab bar stays at 3 buttons (Description, Virtual Simulation, Diagram Modules).
- Additions are silent. The user never has to "trigger" anything.
- Mutations and deletions of already-started nodes are deferred to a separate refactoring flow (§9.1).

The user's explicit principle: "everything we can automate without asking the user, we should automate." This matches the general CodeAI Hub philosophy of eliminating friction at UX boundaries.

Critically, the user added an architectural safety contract that makes auto-sync safe by default: **the Diagram Modules agent is instructed that new functionality is always introduced through new modules or new clusters, mutations of existing elements are reserved for rare exceptions**. This matches the "closed modules" principle already required across the project ("new functionality = new module"). Because additions dominate in practice, auto-sync covers the overwhelming majority of DM changes without ever prompting the user, and the refactoring flow (§9.1) only covers the rare residual cases.

This became §4.19 "Auto-sync Development Tree from Diagram Modules" in rev 2 and is the single biggest decision of the session.

### Shift 9 — Top tab bar highlighting for branch nodes

Minor but necessary sub-decision: when a user selects any branch node (PP, Cluster, Module) in the sidebar, which of the 3 top tabs should be highlighted? The user chose (a): Diagram Modules stays highlighted because "DM is the master schema of the application". This matches the existing behavior in `workspace-tree.tsx` where `activeStage = "diagram_modules"` is preserved when a branch node is active, and it gives the user a natural anchor back to the architecture view.

Captured as §4.20 of rev 2.

### Shift 10 — Help is distributed, not centralized

I had proposed a "Development Tree landing page" that would show in both panels after generation, explaining what the user is looking at. The user corrected this: Help is already accessible as a button in the Artifacts panel top bar (existing `Artifacts | Help` pattern from DM), so there is no need for a separate landing surface. Help becomes the empty-state default for any branch node that has no session started and no artifact written yet — the user clicks a PP / Cluster / Module for the first time and sees type-specific Help in both panels until they begin work.

With auto-sync (Shift 8), the "generation event" that would have needed a landing Help page doesn't exist anymore. Help is distributed per node as empty-state content, not centralized.

Captured as §4.18 of rev 2 and §6.5 (empty-state rule).

### Shift 11 — Soft accordion is removed entirely, not deferred

Rev 1 had "soft accordion" as a deferred optional toggle (the user could choose to have multiple PPs expanded at once). The user removed this entirely after remembering what it meant: soft accordion is architecturally incompatible with the unified panels model, because PM cannot simultaneously render multiple module sessions in the Sessions panel or multiple module artifact sets in the Artifacts panel. Allowing multiple modules to be expanded at once would create a navigation illusion that the panels cannot back.

Strict accordion is now the only mode and the decision is final. Captured as §4.11 of rev 2.

## Architectural decisions closed in this session

- §8.1 Documentation Tree label (simple label above trunk stages, not a literal documentation filesystem tree). ✅ CLOSED.
- §8.3 Soft accordion toggle. ✅ REJECTED PERMANENTLY (not deferred).
- §8.4 Empty PP counters. ✅ CLOSED through auto-sync (empty PPs do not exist as a state; all PPs have full structure from DM at all times).
- §8.5 Product Part ordering. ✅ CLOSED (follows `product-parts.index.md` order).
- Development Tree initialization model (new major decision). ✅ CLOSED: auto-sync from DM, no manual button.
- Trunk sub-row pattern. ✅ REMOVED from trunk as well as branches (unified `node = step` rule).
- Module decomposition. ✅ CLOSED: 3 sessions (Design / Planning / Execution), 5 artifacts.
- TODO Plan ownership. ✅ CLOSED: living artifact co-owned by Planning (creates) + Execution (updates).
- Implementation tab type. ✅ CLOSED: code view, not a markdown document.
- Tree split Doc / Code. ✅ REJECTED: use phase separators in tab bars instead.
- Top tab bar highlighting for branch nodes. ✅ CLOSED: DM tab stays highlighted.

## Questions still open at end of session (documented in rev 2 §8 and §9)

- **§8.1 Agent session initialization** — how exactly Design / Planning / Execution sessions are started for each branch node. Blocking next steps.
- **§8.2 Implementation tab detailed view** — file tree scope, preview granularity, VS Code integration, git diff surface. Blocking next steps.
- **§8.3 Custom tooltip component** — implementation detail only, non-blocking for promotion to Accepted.
- **§9.1 Refactoring flow for DM mutations and deletions** — deferred to a separate architectural document. Further simplified by the "new functionality = new module" contract on the DM agent, so the refactoring flow only needs to cover rare residual cases.

## Git commits

(VERY IMPORTANT: при `Execution Scope Status: ACTIVE` следующая сессия обязана просмотреть каждый коммит через `git show --stat <hash>` и `git show <hash>`.)

- `23272be45 docs(session): capture Session027 development tree sidebar visualization design report`
- `80c223a5f docs(plans): rewrite Development Tree sidebar visualization architecture (rev 2)`

**Two commits total this session**, both docs-only. Both gates green. The interactive prototype `doc/tmp/prototypes/development-tree-sidebar.html` was intentionally NOT updated during this session because the design conversation was about architectural decisions, not visual mockups — the prototype will be regenerated from rev 2 specs in a follow-up session before implementation starts.

## Release / artifacts

- **No release build.** Scope was design-only — no source code, no VSIX surface, no release manifest touched. Shipped release remains `codeai-hub-1.1.923.vsix` from Session025.
- **Prototype artifact** still lives at `doc/tmp/prototypes/development-tree-sidebar.html` (gitignored; 70 KB). Reflects rev 1 only — regeneration needed before implementation.
- **Architecture document** at `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md` has been rewritten in place: rev 1 → rev 2, 351 → 522 lines, Status still Draft.

---

# 2. Instructions for Next Session

**Recovery Owner:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md` (rev 2, Draft)

**Why no `todo-plan.md`:** the design conversation is not finalized yet. Two significant scope items (§8.1 agent session initialization and §8.2 Implementation tab detailed view) remain open and must be resolved before the implementation `todo-plan.md` can be written. The rev 2 document is a coherent architectural contract for everything that was decided, but it is still explicitly labeled Draft and will only advance to Accepted after §8.1 and §8.2 are closed.

## Plans for next session

- Read `doc/Sessions/Session028.md` (this file) plus both commits of this session via `git show --stat <hash>` and `git show <hash>`. Both commits are docs-only and should be fast to review.
- Read `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md` **in full**. This is the single source of truth for all decisions taken through Session028. Pay particular attention to:
  - §4.1 (unified node = step pattern — the foundation);
  - §4.14 (module decomposition: 3 sessions, 5 artifacts);
  - §4.15 (TODO Plan as living artifact);
  - §4.16 (Implementation tab as code view);
  - §4.19 (auto-sync contract + "new functionality = new module" architectural safety);
  - §8 (3 open questions);
  - §9.1 (refactoring flow teaser).
- Read sibling workflow document `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md` — especially the parts about how Cluster design and Module design sessions are specified. That document is upstream of the sidebar visualization and may need updates to match rev 2's 3-session module decomposition.
- Resume the design discussion with the user, focused on closing **§8.1 Agent session initialization** and **§8.2 Implementation tab detailed view** in that order. §8.1 is the biggest remaining gap and should probably come first because it affects the Sessions panel empty-state UX and may cascade into `DevelopmentTree_BranchWorkflow_Architecture.md`.
- After §8.1 and §8.2 are closed, ask the user whether to:
  1. Regenerate the HTML prototype at `doc/tmp/prototypes/development-tree-sidebar.html` from rev 2 specifications (visual verification before committing to code), OR
  2. Skip prototype regeneration and go directly to writing the implementation `todo-plan.md` (faster, but no intermediate visual checkpoint), OR
  3. Do both in parallel (prototype first for visual sanity check, then todo-plan).
- When writing the implementation `todo-plan.md`, the scope will likely include:
  - `src/client/project-manager/components/layout/workspace-tree.tsx` and its siblings (currently 394 lines, close to the 500-line guard — the implementation will probably need a new micro-class like `workspace-tree-branch-nodes.ts` extensions or a new cluster/module renderer file);
  - `packages/ui/project-manager/styles.css` for the new `pm-tree__pp-wrapper`, `pm-tree__cluster-wrapper`, `pm-tree__cluster-children`, `pm-tree__type-badge--*` classes plus section labels and tab phase separators;
  - Core-side auto-sync watcher that reads `product-parts.index.md` / `product-parts/*.md` and pushes Development Tree state into workflow state, so the PM sidebar reflects DM changes in real time;
  - New Artifacts panel tab model supporting 2-tab (Cluster) and 5-tab (Module) layouts with phase separators;
  - New Sessions panel tab model supporting 3-tab layout for modules with phase separators;
  - Help empty-state rendering for branch nodes with no work started;
  - Custom tooltip component for overflow labels (§4.13 / §8.3);
  - Implementation tab content (whatever is decided in §8.2).
- Session029 should NOT regenerate the prototype or start writing `todo-plan.md` until §8.1 and §8.2 are explicitly closed with the user.

## Known-clean state

- `git status` clean at session end (two commits landed, no untracked changes except `doc/Sessions/Session028.md` which remains untracked per standard rule and will be hygiene-committed by Session029).
- `doc/TODO/todo-plan.md` is still a placeholder pointing to `Docs_Index.md` — no active execution cycle backed by it (this session was still design/planning, not execution).
- `doc/TODO/Archive.zip` unchanged since Session027 (22 entries: 1 directory + 21 `.md` files).
- `doc/SolidWorks-WorkFlow/Plans/` active: `DevelopmentTree_BranchWorkflow_Architecture.md`, `DevelopmentTree_Sidebar_Visualization_Architecture.md` (**rev 2 Draft**, just rewritten), `Implementation_Foundation_Architecture.md`, `MultiProvider_Orchestration_Scenarios.md`.
- `doc/tmp/prototypes/development-tree-sidebar.html` still reflects rev 1 of the architecture doc — needs regeneration but is not a blocker for the architectural conversation.
- No code, no CSS, no `package.json` versions, no manifests, no release artifacts were touched.
- Architecture gates (pre-commit) passed on both commits: architecture check, lint, knip, formatting all green. Duplication and links checks (pre-push) not triggered yet.
