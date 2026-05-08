# Development Tree Phase 1: User-Started Documentation

**Status:** active planning draft  
**Created:** 2026-05-08  
**Parent:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Orchestration_Architecture.md`  
**Scope:** first Development Tree phase after `Quality Gates Baseline`, before implementation planning and code generation.

## 1. Goal

Phase 1 changes Development Tree behavior from automatic fan-out to user-started documentation work.

After Quality Gates acceptance, Core must not automatically create every Development Tree session and every draft artifact. Core should create only the Development Tree read model and show startable node cards. The user decides which Product Part, Cluster, standalone Module, or Module node to start, and may run several documentation sessions in parallel by explicit choice.

This keeps the canonical workspace clean, matches the user's review capacity, and prepares accepted contracts for later implementation wave planning.

## 2. Non-Goals

Phase 1 does not implement production code.

Phase 1 does not run Implementation Planner.

Phase 1 does not create isolated implementation worktrees, proposal sandboxes, or merge queues.

Phase 1 does not automatically create all Cluster/Module sessions after Quality Gates.

## 3. Post-Quality-Gates Behavior

When `Application Skeleton` and `Quality Gates Baseline` are accepted, Core should:

1. Read accepted Diagram Modules, Application Skeleton map, and Quality Gates contract.
2. Build the Development Tree index/read model.
3. Show Product Part / Cluster / Module nodes in the sidebar.
4. Mark branch nodes as `not_started`.
5. Do not create branch sessions.
6. Do not create node draft artifacts.
7. Do not send first prompts to Development Tree agents.

Session and draft creation happens only after the user presses Start on a node card.

## 4. Node Types

Phase 1 supports these node types:

- Product Part overview node: optional lightweight documentation/session boundary; no production code ownership.
- Cluster node: owns Cluster specification and Cluster contract documentation.
- Standalone Module node: owns Module specification and Module facade contract documentation under a Product Part.
- Module node under Cluster: owns Module specification and Module facade contract documentation under the Cluster.

Product Part is not treated as the main implementation unit. It is a navigation, review, and delivery boundary. Cluster and Module are the main documentation/contract work units.

## 5. Start Card

Each startable Development Tree node should expose a Start card similar to trunk workflow stage cards.

The card should include:

- node identity: Product Part, Cluster, or Module name;
- node type and parent path;
- expected artifacts that will be created;
- current status (`not_started`, `drafting`, `needs_user_review`, `accepted`, `blocked`);
- provider selector;
- model selector for the selected provider;
- reasoning/thinking selector when supported by the provider;
- Start button.

The card should not immediately start a session when the tree is materialized. Start is a user action.

## 6. Provider And Model Binding

The Start card must support per-node provider/model overrides.

Default behavior:

- initial provider/model/reasoning values come from Settings;
- changing provider updates the available model list;
- changing model/reasoning affects only the node session being started;
- Core stores the effective provider/model/reasoning binding in the node session record;
- later Settings changes do not mutate an existing node session binding.

Global Settings should not be overwritten automatically.

Optional UX:

- a checkbox or explicit action can save the selected provider/model/reasoning as the future default;
- this must be separate from starting the node session;
- if implemented, the UI must make clear whether the choice applies to this session only or to future sessions.

Recommended first implementation:

- support per-node session binding;
- do not write back to global Settings from the card;
- leave "save as default" as an explicit follow-up capability.

## 7. Node Start Lifecycle

When the user starts a node, Core should:

1. Verify canonical workspace Git is clean.
2. Verify the node is startable and not already accepted.
3. Create or reuse a node task record.
4. Create only that node's draft artifact files.
5. Create a session for the selected provider/model/reasoning binding.
6. Send a first prompt scoped to that node.
7. Mark the node `drafting`.

If Git is dirty, Core should block start and explain the dirty paths.

If another active node owns overlapping draft paths, Core should block start or ask the user to finish/resolve the active node first.

## 8. Node Draft Artifacts

Cluster node artifacts:

- Cluster specification draft;
- Cluster contract draft;
- optional machine-readable contract summary when needed for planner validation.

Module node artifacts:

- Module specification draft;
- Module facade contract draft;
- optional machine-readable contract summary when needed for planner validation.

Product Part overview artifacts:

- Product Part overview/spec draft, if the user starts it;
- no code plan and no implementation ownership by default.

Draft files should be created only for the started node. Sibling nodes remain `not_started`.

## 9. Node-Scoped Commit And Acceptance

Each active documentation node needs its own node task record with:

- node id;
- session id;
- provider/model/reasoning binding;
- owned draft artifact paths;
- read-only context paths;
- expected commit message;
- current status;
- acceptance evidence.

The agent may only edit owned draft artifact paths.

Before the node reports ready:

- owned draft artifacts must exist;
- required fields/sections must be present;
- machine-readable contract summary must be valid when required;
- artifacts must be committed through the managed node command;
- Git must be clean after commit.

Core validates the node after commit. If validation fails, Core sends diagnostic feedback into the same node session.

User acceptance is separate from agent completion. A node is `accepted` only after Core validation and explicit user acceptance.

## 10. Parallel Documentation Sessions

The user may start multiple documentation nodes, but Phase 1 should not encourage starting the entire tree at once.

Parallel start is allowed only when:

- Git is clean before each start;
- node draft paths do not overlap;
- node task records are independent;
- each node has its own session binding;
- Core can send feedback to the owning session.

Default UI should guide the user toward small batches:

- one Product Part area at a time;
- one Cluster at a time;
- selected Modules inside an accepted Cluster;
- explicit multi-start only when the user chooses it.

## 11. Transition To Phase 2

`Plan Implementation` becomes available when the required contracts for the selected scope are accepted.

The Implementation Planner should read accepted contracts and structural indexes, not all prose documentation.

If contracts are incomplete, Phase 2 must report contract gaps rather than guessing from draft prose.

## 12. Implementation Work Items For This Phase

Likely future execution streams:

1. Disable automatic Development Tree session/draft fan-out after Quality Gates.
2. Materialize Development Tree index/read model with branch nodes in `not_started`.
3. Add node Start cards to the UI.
4. Add provider/model/reasoning selection to node Start cards.
5. Persist per-node session binding without changing global Settings.
6. Create node task records and node-scoped draft artifact materialization.
7. Add node-scoped Core acceptance feedback.
8. Add guards for dirty Git and overlapping node scopes.

## 13. Open Decisions

- Exact node task record storage path.
- Whether Product Part overview is mandatory before Cluster/Module starts.
- Whether the first implementation includes "save as default" from the Start card.
- Whether multi-start is exposed in the first version or kept as one-node-at-a-time UI.
- Exact node-scoped commit command name and contract.
