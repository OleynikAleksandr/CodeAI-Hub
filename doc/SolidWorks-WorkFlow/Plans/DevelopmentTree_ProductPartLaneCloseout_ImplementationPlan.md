# Development Tree Documentation Mode Reorientation Plan

**Status:** active planning source, reoriented 2026-06-14 after v1.2.513 retest.
**Supersedes:** the previous Product Part lane closeout plan that treated early
Product Part worktrees as disposable execution lanes.
**Source decision:** user retest rejected automatic Product Part worktree/session
deletion as incompatible with the SolidWorks-like development-tree model.

## Decision

Documentation artifacts do not need Git worktrees.

Product Part, Cluster, and Module documentation agents should run in the main
workspace and write only node-owned draft artifacts. Core remains the only owner
of managed state, TODO ledgers, indexes, and Git commits.

Git worktrees are reserved for the code stage, where agents may touch broad code
surfaces, run formatters/generators, and need persistent editable node branches.

## Why

The previous v1.2.513 direction removed Product Part worktrees after checkpoint.
That made sense for disposable CI-style lanes, but it is the wrong model for a
SolidWorks-like development tree:

- a development-tree node must remain revisitable;
- the session that produced a node artifact is part of the node history;
- merge/checkpoint into main is a publication step, not the death of the node;
- automatic deletion makes later node rework feel like starting from scratch.

For documentation-only work, worktrees also solve less than they cost. The
agents can safely work in parallel when every agent writes to a disjoint
node-owned artifact path and Core serializes the shared state/commit boundary.

## Documentation Mode Contract

Before code generation starts:

1. Product Part, Cluster, and Module draft sessions run in the main workspace.
2. Agents may write only their assigned artifact paths.
3. Agents must not write `doc/TODO/todo-plan.md`, managed indexes, shared state,
   or cross-node summaries.
4. Core serializes acceptance, managed state updates, index regeneration, and
   Git commits.
5. Core records a ledger mapping each `nodeId` to its owned artifact paths and
   commits.
6. Secondary Product Part briefs must be accepted before the lead Product Part
   `DevelopmentOrderPlan` assignment is allowed.
7. Cluster/Module documentation can run in parallel when dependencies are
   satisfied and target paths are disjoint.

## Code Mode Contract

When implementation code starts:

1. Core creates persistent worktrees for Product Part, Cluster, or Module code
   nodes that need isolated code edits.
2. Those worktrees are not automatically deleted after merge.
3. Merge into main publishes the current node version for build/test.
4. Returning to a code node reuses the persistent node worktree/session.
5. If a node is changed after publication, Core marks dependent downstream
   nodes and the main integration projection dirty until they are reconciled.

## Undo / Clear Model

Clear/Undo is node-scoped, not workspace-scoped.

Core uses its ledger to resolve:

- `nodeId`;
- node-owned artifact paths;
- node-related commits;
- downstream dependencies.

For documentation nodes, Core restores only the node-owned paths to the selected
state and regenerates shared indexes/state. It does not `git reset` the whole
workspace and does not directly restore shared files as part of the node.

For code nodes, Core returns to the persistent worktree/session and handles the
next merge/reconciliation explicitly.

## Immediate Implementation Direction

The next implementation cycle should undo the disposable pre-code lane model:

1. Stop creating Product Part documentation worktrees after `Diagram Modules`.
2. Start Product Part draft sessions in the main workspace with strict target
   paths.
3. Keep the existing lead-gating rule: lead order-plan work waits for accepted
   secondary Product Part briefs.
4. Move future Cluster/Module documentation sessions to the same main-workspace,
   path-scoped model.
5. Keep worktree creation for the later code stage only.

No code-stage worktree lifecycle is implemented by this document.

## Retest Contract

In a FinderWidget-style workspace:

1. Product Part draft sessions can run in parallel in the main workspace.
2. Secondary Product Part artifacts are accepted before the lead order-plan
   assignment starts.
3. No Product Part `.worktrees/.../precode` folders are created for
   documentation-only artifacts.
4. Accepted Product Part artifacts and managed decisions are present in the main
   workspace.
5. Project Manager continues to show completed Product Part nodes from main
   managed state.
6. Clear/Undo on a Product Part restores only that Product Part's owned
   documentation artifacts and marks dependent work dirty.

## Expected Implementation Areas

- Product Part documentation bootstrap/session routing.
- Product Part draft acceptance checkpoint logic.
- Development-tree node ledger for `nodeId -> artifactPaths -> commits`.
- Project Manager projection from main managed state, not pre-code worktree
  existence.
- Focused tests for parallel path-scoped documentation sessions and node-scoped
  Clear/Undo.
