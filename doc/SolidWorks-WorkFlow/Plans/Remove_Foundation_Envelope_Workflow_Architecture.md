# Remove Foundation Envelope Workflow Architecture

**Status:** Draft for review (2026-04-07)
**Created:** 2026-04-07
**Updated:** 2026-04-07
**Owner:** Oleksandr + Codex
**Scope:** Remove `Foundation Envelope` from the active CodeAI Hub workflow entirely, retarget trunk completion to `Diagram Modules`, start branch design directly from `Product Part Specification`, and clean all active code/docs/runtime surfaces that still model `foundation_envelope` as a supported stage.

---

## 1. Problem

`Foundation Envelope` was introduced as a light bridge step between `Diagram Modules` and branch-level design.

After shipping the visual release and reviewing the real user-facing result, the step is now considered a product and architecture mistake:

- for the user it adds confusion instead of clarity;
- for downstream design work it adds almost no actionable information beyond what is already visible in `Diagram Modules`;
- for implementation planning it delays branch entry with an extra stage that does not define file structure, facades, contracts, or code-ready boundaries;
- for Project Manager visualization it introduced a second diagram grammar that re-maps levels incorrectly and weakens the meaning of `Product Part / Cluster / Module`.

In practice the current step duplicates the upstream `Diagram Modules` baseline in a more abstract and less useful form, while also expanding the active surface area of the product:

- separate stage id and gating rules;
- separate canonical artifact path and flow sidecar;
- separate PM tree/session/artifact/help routing;
- separate prompt/template contract;
- separate watcher/runtime/continuity handling;
- separate localization strings and regression coverage.

That cost is no longer justified.

Therefore the correct action is not to repair `Foundation Envelope`, but to remove it as an active workflow step and reconnect branch design directly to `Diagram Modules`.

---

## 2. Product Goal

After this scope is implemented, the active workflow must become:

1. `Description`
2. `Virtual Simulation`
3. `Diagram Modules`
4. `Product Part Specification`
5. `Cluster Design`
6. `Module Design`
7. `Required contracts for the selected implementation wave`
8. `Implementation Foundation`
9. `TODO Plan`
10. `Implementation`

The step is considered successfully removed only when all of the following are true:

1. `Diagram Modules` is the last trunk step in active SSOT and product behavior.
2. Branch entry starts directly from `Product Part Specification`.
3. No active code path still models `foundation_envelope` as a supported workflow stage.
4. No active PM route, toolbar item, tree node, prompt pack, artifact contract, watcher, continuity path, or localization surface refers to `Foundation Envelope`.
5. Existing workspace files under `.codeai-hub/<workspaceSlug>/foundation_envelope/` are treated as legacy leftovers and do not participate in active gating, startup, restore, or workflow status computation.
6. Active planning and SSOT documents no longer treat `Foundation Envelope` as part of the supported workflow.

---

## 3. Non-Goals

This scope must not:

- redesign `Diagram Modules`;
- implement the future branch workflow itself;
- change the `Product Part -> Cluster -> Module` semantics already accepted in `Diagram Modules`;
- rewrite git history or falsify archived session reports;
- invent a new replacement trunk step that reintroduces the same abstraction under a different name;
- auto-delete legacy `foundation_envelope` files from every user workspace.

Important historical rule:

- active SSOT and active product behavior must stop mentioning `Foundation Envelope`;
- archived plans, archived TODOs, and past session reports may remain as historical evidence, but they must not be listed as active truth or active navigation for the current workflow;
- historical documents may be updated when needed to remove dead links, obsolete active-path references, or misleading navigation that keeps the removed step alive procedurally.

---

## 4. Core Decisions

### 4.1. `Diagram Modules` becomes the end of trunk

The trunk no longer extends past `Diagram Modules`.

There is no supported step 4 called `Foundation Envelope`.

This means:

- the canonical active workflow ends the user-facing trunk at `Diagram Modules`;
- downstream work begins from the branch tree immediately after `Diagram Modules`;
- active SSOT must stop describing any extra bridge stage between the diagram and branch specifications.

### 4.2. Branch workflow starts directly from `Product Part Specification`

The first branch artifact after `Diagram Modules` is `Product Part Specification`.

The accepted `Diagram Modules` output already provides the actionable branch root:

- the list of `Product Part`;
- the ownership decomposition of each part into `Cluster` and `Module`;
- the structure required for selecting the next design branch.

Therefore branch entry no longer depends on any intermediate application-envelope artifact.

### 4.3. No mandatory replacement for `Application Root / Shared Zones / Integration Seams`

The removed step must not be silently replaced with another mandatory global artifact.

If some future implementation wave needs cross-part decisions, they must be captured where they are actually needed:

- in `Product Part Specification`, when the concern is local to one branch root;
- in `Cluster Design` or `Module Design`, when the concern becomes concrete at that level;
- in explicit wave-level contracts, when the concern crosses multiple parts and is necessary for the selected implementation wave;
- in `Implementation Foundation`, when the concern is about real technology materialization rather than abstract assembly prose.

This keeps the workflow branch-driven instead of forcing every project through a second global abstraction pass.

### 4.4. All active `foundation_envelope` runtime surfaces must be removed

Removal is complete only when the following active surfaces are cleaned:

- workflow stage ids, labels, ordering, and gating;
- artifact routing, validation, allowlists, and watchers;
- PM toolbar/tree/session/artifact/help routing;
- prompt/template registration and contract endpoints;
- continuity/startup/restore handling;
- localization and empty-state copy;
- targeted regression tests that still assert `foundation_envelope` as a live stage.

### 4.5. Legacy workspace artifacts become inert

Existing files such as:

- `.codeai-hub/<workspaceSlug>/foundation_envelope/foundation-envelope.md`
- `.codeai-hub/<workspaceSlug>/foundation_envelope/foundation-envelope.flow.json`

may still exist in workspaces created during release `1.1.905`, but after this scope:

- they are no longer canonical outputs of any active stage;
- they must not affect workflow readiness or OUTDATED propagation;
- they must not appear in PM as supported artifacts;
- they may remain on disk until the user removes them manually or a future dedicated cleanup scope handles them.

### 4.6. Active planning docs must be retargeted

The current active branch-level planning docs still assume that branch design starts after `Foundation Envelope`.

They must be updated so that:

- `DevelopmentTree_BranchWorkflow_Architecture.md` starts the branch tree after `Diagram Modules`;
- `Implementation_Foundation_Architecture.md` depends on approved branch artifacts selected from `Diagram Modules`, not on a removed envelope step;
- `Foundation_Envelope_Architecture.md` stops being an active plan and becomes archive-only or removable history after the removal scope is complete.

### 4.7. Repository cleanup must remove dead FE fragments, not only visible stage entrypoints

This scope is not finished when the user-facing stage disappears.

It must also remove dead repository fragments that would otherwise keep `Foundation Envelope` half-alive:

- FE-only source files and helpers with no surviving callers;
- FE-specific tests that no longer validate any supported behavior;
- FE-only localization keys and labels;
- stale imports, unions, enums, route branches, artifact helpers, and compatibility shims;
- docs links that still point future work toward FE as if it were a supported prerequisite.

The target state is a clean codebase where a future agent does not need to wonder whether `foundation_envelope` is still a dormant supported concept.

### 4.8. Historical docs must remain truthful but must stop leaking dead navigation

Because release `1.1.905` already shipped with `Foundation Envelope`, history cannot simply be erased.

However, leaving dead references in place is also unacceptable if they:

- point to removed active plans as if they were still current;
- instruct future sessions to read FE docs as mandatory context;
- preserve stale file paths that no longer exist;
- keep FE visible as a current prerequisite for branch entry.

Therefore historical cleanup must apply the following rule:

- preserve the fact that FE existed and was later removed;
- remove or rewrite navigation that treats it as a live current step;
- add retirement/archive framing where needed so future readers are not misled.

---

## 5. Target Architecture After Removal

### 5.1. Active pipeline

```text
Description
  -> Virtual Simulation
  -> Diagram Modules
      -> Product Part Specification
          -> Cluster Design
              -> Module Design
                  -> Required contracts for the selected implementation wave
                      -> Implementation Foundation
                          -> TODO Plan
                              -> Implementation
```

### 5.2. Trunk output contract

`Diagram Modules` remains the final trunk SSOT and keeps the same canonical outputs:

- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/<part-id>.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.flow.json`

These artifacts are now sufficient to:

- review product structure with the user;
- choose the next `Product Part` branch;
- start branch-level design without any additional global bridge artifact.

### 5.3. Branch entry contract

The first downstream branch step reads:

- `product-parts.index.md`
- the selected `product-parts/<part-id>.md`
- upstream `Description` and `Virtual Simulation` artifacts when needed for traceability

and materializes `Product Part Specification` directly.

No `foundation-envelope.md` precondition remains.

### 5.4. OUTDATED propagation after removal

The active propagation chain becomes:

- `Final_Description.md` change -> `Virtual Simulation = OUTDATED`
- `Final_Description.md` or `virtual-simulation.md` change -> `Diagram Modules = OUTDATED`
- `Diagram Modules` canonical artifact change -> downstream branch artifacts for the affected `Product Part` become `OUTDATED`

There is no separate `Foundation Envelope = OUTDATED` state anymore.

---

## 6. Cleanup Surface

### 6.1. Active SSOT/docs

At minimum this scope must retarget:

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
- `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/Implementation_Foundation_Architecture.md`

And must close the active FE-specific planning path:

- `doc/SolidWorks-WorkFlow/Plans/Foundation_Envelope_Architecture.md`

### 6.2. Core/runtime/product code

At minimum this scope must clean:

- workflow state/gating and stage ordering;
- artifact validation/path routing for `foundation_envelope`;
- prompt/contract endpoint registration;
- continuity/stage hydration logic;
- PM tree/toolbar/panel/session routing;
- FE-specific React components and helpers.

### 6.3. Tests

The scope must remove or retarget tests that currently encode `foundation_envelope` as a supported active stage.

No test should survive that keeps the removed stage alive accidentally through compat assumptions.

### 6.4. Historical documents and archive references

The scope must also inspect:

- archived TODO plans that still route readers through FE as if it were current;
- session reports whose “next session” instructions or live-path references point to now-retired FE planning paths;
- archive notes and docs-index references that still expose FE as active navigation.

The goal is not to erase history.

The goal is to ensure the repository no longer contains misleading live navigation or dead references around the removed step.

---

## 7. Risks

### 7.1. Hidden live references

`foundation_envelope` was recently integrated across PM, core, routing, continuity, prompts, localization, and release docs.

Risk:

- one forgotten enum branch, watcher path, or startup route can keep the removed stage partially alive.

Mitigation:

- cleanup must proceed by surfaces, not by ad-hoc search-and-replace;
- targeted regression coverage must confirm the new workflow shape explicitly.

### 7.2. Historical references vs active truth

Because the feature shipped in `1.1.905`, the repository now contains historical records about it.

Risk:

- active navigation may accidentally keep pointing to removed FE planning docs as if they were still live.

Mitigation:

- preserve archives as history only;
- remove FE from active SSOT and active plan listings;
- archive or retire the active FE planning doc during closeout.

### 7.3. Branch docs still anchored to the removed step

Branch workflow documents currently rely on FE wording.

Risk:

- active planning could remain semantically correct but procedurally blocked by stale prerequisites.

Mitigation:

- retarget branch docs in the same scope, not later.

### 7.4. Partial cleanup leaves dormant dead code and dead links behind

Risk:

- the visible stage disappears, but dead helpers/tests/docs remain scattered across the repo;
- future cleanup or branch-design work wastes time rediscovering whether FE is still supported.

Mitigation:

- include an explicit dead-fragment sweep after main runtime/UI removal;
- include historical-document cleanup before release packaging;
- verify the repository by targeted search for `Foundation Envelope`, `foundation-envelope`, and `foundation_envelope` after implementation.

---

## 8. Acceptance Criteria

This removal scope is complete only when:

1. Active SSOT no longer lists `Foundation Envelope` as a supported workflow step.
2. `Diagram Modules` is documented as the end of trunk.
3. Branch workflow docs start directly from `Product Part Specification`.
4. No active runtime enum/state machine/gating logic includes `foundation_envelope`.
5. No active PM route, panel, or tree surface exposes `Foundation Envelope`.
6. No active prompt/template/contract endpoint for `foundation_envelope` remains.
7. Legacy FE artifacts in old workspaces do not affect active product behavior.
8. FE-specific active planning docs are archived/retired, and active docs navigation no longer points to them as current scope.
9. FE-only dead helpers/tests/localization/source files are removed or retargeted; no dormant code fragments remain.
10. Historical docs no longer contain dead navigation or misleading “current step” references to FE.
