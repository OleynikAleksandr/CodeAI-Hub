# Project Manager Workspace Startup Reset Architecture

**Status:** Archived after implementation complete (2026-04-07)
**Created:** 2026-04-07
**Owner:** Oleksandr + Codex
**Scope:** Define a temporary canonical startup rule for Project Manager when a workspace is opened, switched, or restored. Until the product has a real "current working focus" model and downstream invalidation for upstream edits, workspace startup must stop inferring a stage from continuity/runtime recency and must always open `Description`.

---

## 1. Problem

Current Project Manager startup mixes three different questions that are not equivalent:

1. Which workflow step is the furthest completed step?
2. Which step had the most recent continuity/runtime activity?
3. Which step is the current working focus for the user right now?

The current codebase does not have one canonical model for question (3). Instead, startup behavior is assembled from several partial signals:

- `workflow/state.json lastActive`
- continuity chain timestamps
- continuity index timestamps
- canonical artifact availability
- runtime session fallback in the Session panel

This creates split truth during workspace switch and cold restore:

- Toolbar can highlight one stage.
- The right panel can open another stage artifact.
- The left Session panel can show several sessions from several stages.

The result is a race-driven UI, not a deterministic startup contract.

---

## 2. Product Constraint

Today the user can manually return to any earlier workflow step and keep editing it. That means:

- "most recently touched stage" is not a safe proxy for "startup stage";
- "furthest completed stage" is not a safe proxy for "current working focus";
- continuity/runtime metadata is not a safe proxy for semantic workflow intent.

In the future, once the product supports a real upstream-edit model, editing an earlier step should invalidate or block downstream steps. At that point the system can introduce a canonical `current working focus` model.

That mechanism does not exist yet.

Until it exists, startup must prefer determinism over guesswork.

---

## 3. Temporary Product Decision

### 3.1. Workspace startup rule

For the current product phase, any workspace open/switch/reconnect/cold-start restore must always start in:

- stage: `description`

This is a temporary but explicit contract.

### 3.2. Left panel rule

The Session panel must show only the `Description` scope on startup:

- if a Description dialog/session exists, open it;
- otherwise show the Description pre-session/help state;
- do not expose sessions from `virtual_simulation`, `diagram_modules`, or `foundation_envelope` during automatic startup restore.

### 3.3. Right panel rule

The artifact panel must open:

1. `Final_Description.md`, if it exists;
2. otherwise `questionnaire.md`.

No startup rule may auto-open `virtual-simulation.md`, `product-parts.index.md`, or `foundation-envelope.md`.

### 3.4. Explicit user navigation remains unchanged

After startup, explicit user actions stay canonical:

- toolbar click;
- tree click on stage/artifact/session.

If the user clicks another stage, Project Manager should keep using the existing explicit routing behavior.

---

## 4. Non-Goals

This scope does not try to solve the final "working focus" product model.

It does not:

- introduce a canonical `current working focus` persistence contract;
- infer startup stage from "latest touched" stage;
- infer startup stage from "furthest completed" stage;
- implement downstream invalidation/blocking after an upstream edit;
- redesign continuity storage or remove continuity timestamps from dialog/history flows;
- change explicit toolbar/tree routing semantics outside startup restore.

---

## 5. Core Architecture Decisions

### 5.1. Startup truth is intentionally simple

Startup truth for workspace open is not computed from recency.

For this temporary scope:

- startup stage is hard-fixed to `description`;
- continuity timestamps become startup-irrelevant;
- `workflow-state.lastActive` becomes informational/reference-only for startup until the future focus model exists.

### 5.2. Continuity keeps its own role

Continuity metadata still has valid uses:

- dialog restore;
- latest session lookup inside one stage;
- provider/runtime recovery;
- continuity diagnostics.

But continuity recency must not choose the startup workflow stage.

### 5.3. One startup route only

Workspace startup must go through one deterministic route:

1. set `activeStage=description`;
2. open Description artifact (`Final_Description.md` or `questionnaire.md`);
3. open Description dialog/session if available;
4. if no Description dialog/session exists, stay in Description help/pre-session state.

Startup must not let Toolbar, left Session panel, and right artifact panel restore independently.

### 5.4. Runtime fallback must not leak other stages

If Description dialog restore is not ready yet, the runtime Session panel fallback must not show all workspace sessions.

Startup fallback must remain Description-scoped or empty.

### 5.5. False startup heuristics must be removed, not kept dormant

This scope must not merely add a stronger rule on top of old startup heuristics.

If a recency-based algorithm is no longer valid for workspace startup, it must be:

- deleted; or
- narrowed to a clearly local purpose that is still valid.

Examples of invalid startup heuristics for this scope:

- "pick the stage with the newest continuity timestamp";
- "pick the stage with the most recently touched runtime session";
- "show all workspace sessions when startup dialog restore is not ready".

The codebase must not keep these algorithms alive as hidden fallback startup selectors.

---

## 6. Implementation Boundary

### 6.1. Core changes

Core startup repair and workflow-state startup derivation must stop using continuity recency as a stage selector.

Affected logic area:

- workspace activation / repaired startup metadata
- workflow-state canonical startup response for PM

### 6.2. PM routing changes

Project Manager workspace switch must stop auto-selecting a stage from `lastActive`.

Instead, it must dispatch the same shared stage route as a user click, but with a fixed startup stage:

- `description`

### 6.3. PM session panel changes

The Session panel fallback must become startup-safe:

- no cross-stage session tabs on workspace open;
- no accidental focus on the most recent non-Description runtime session;
- no mismatch between left panel and toolbar/right panel during cold restore.

### 6.4. Code cleanup is part of the scope

This refactor must also remove false algorithms that the temporary contract no longer allows.

The target state is not:

- "new startup rule plus old heuristic still present behind a fallback branch".

The target state is:

- "one valid startup rule, with obsolete startup heuristics removed from the decision path".

---

## 7. Acceptance Criteria

1. Switching to any workspace always highlights `Description`.
2. On startup, the right panel always opens `Final_Description.md` if present, otherwise `questionnaire.md`.
3. On startup, the left panel shows only Description session state or Description help.
4. `Virtual Simulation`, `Diagram Modules`, and `Foundation Envelope` never appear automatically on startup only because their continuity/runtime metadata was updated later.
5. Explicit toolbar/tree navigation to later stages still works exactly as before.
6. Reconnect/cold-start restore follows the same startup rule as manual workspace switch.

---

## 8. Deferred Follow-Up

After this temporary reset is stable, the product can open a dedicated follow-up scope for:

- canonical `current working focus`;
- upstream-edit invalidation/blocking of downstream steps;
- a final answer to "furthest completed step" vs "currently edited step";
- revisiting whether startup should remain `Description` or should restore `current working focus`.

Until then, the safe contract is:

- `workspace open => Description`
