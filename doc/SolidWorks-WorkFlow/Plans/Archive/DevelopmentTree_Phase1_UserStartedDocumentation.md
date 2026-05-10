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

## 5. Universal Start Card Contract

Every workflow step or branch node that starts an agent session should expose the same provider/model/reasoning Start card contract. This applies to existing trunk/documentation steps and to new Development Tree nodes.

Development Tree nodes should use the same card pattern as trunk workflow stage cards, not a separate reduced control surface.

The card should include:

- step or node identity: workflow step, Product Part, Cluster, or Module name;
- node type and parent path;
- expected artifacts that will be created;
- current status (`not_started`, `drafting`, `needs_user_review`, `accepted`, `blocked`);
- provider selector;
- model selector for the selected provider;
- reasoning/thinking selector when supported by the provider;
- Start button.

For Development Tree nodes, the card should not immediately start a session when the tree is materialized. Start is a user action.

## 6. Provider, Model, Reasoning, And Settings Binding

Every Start card must support provider/model/reasoning selection.

Default behavior:

- initial provider/model/reasoning values come from Settings;
- changing provider updates the available model list;
- changing model/reasoning writes the selected default model/reasoning for that provider back to the Settings file;
- the newly started session also receives the selected effective provider/model/reasoning binding;
- Core stores the effective binding in the step or node session record for audit/recovery.

The Start action is therefore both a session start and an explicit default update for the selected provider. If the user chooses a different model for a provider on any start card, that provider's default model in Settings must change.

Required Settings behavior:

- write through the same Core-owned Settings lifecycle used by the Settings UI;
- update only the selected provider's default model/reasoning fields;
- preserve other provider defaults and unrelated Settings fields;
- broadcast the settings/session update through the existing Settings/session transports;
- ensure the session Status Panel shows the effective model from the created session binding.

## 7. Node Start Lifecycle

When the user starts a node, Core should:

1. Verify canonical workspace Git is clean.
2. Verify the node is startable and not already accepted.
3. Create or reuse a node task record.
4. Create only that node's draft artifact files.
5. Persist the selected provider/model/reasoning as the provider default in Settings.
6. Create a session for the selected provider/model/reasoning binding.
7. Send a first prompt scoped to that node.
8. Mark the node `drafting`.

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
4. Extend all workflow Start cards, existing trunk and Development Tree, with provider/model/reasoning selection.
5. Persist Start card provider/model/reasoning selection into Settings as the selected provider default and into the created session binding.
6. Create node task records and node-scoped draft artifact materialization.
7. Add node-scoped Core acceptance feedback.
8. Add guards for dirty Git and overlapping node scopes.

## 13. Open Decisions

- Exact node task record storage path.
- Whether Product Part overview is mandatory before Cluster/Module starts.
- Whether Settings write-back happens on selection change or only on Start.
- Whether multi-start is exposed in the first version or kept as one-node-at-a-time UI.
- Exact node-scoped commit command name and contract.

## 14. Verification Evidence

2026-05-08 implementation verification:

- `npm run typecheck:webview` passed.
- `npm run build --workspace=@codeai-hub/core` passed.
- `npx tsx --test` passed for start-card Settings write-back, Development Tree read model/parser, no-auto-fanout workflow-state behavior, and managed-stage acceptance feedback suites: 22 tests passed.
