# Development Tree Downstream Execution Refactor

**Status:** active planning capture, opened 2026-06-10.
**Relationship to current directives:** this document sits next to `DevelopmentTree_BranchWorkflow_Architecture.md` and `DevelopmentTree_ProductPartSubagentOrchestration.md`. It does not replace them yet. It records refactor topics discovered during FinderWidget v1.2.487 retesting before they are sliced into a future `doc/TODO/todo-plan.md`.

## 1. Problem

FinderWidget retesting exposed that the current Development Tree MVP can start a first cluster-contract sub-agent in a worktree, accept its draft artifacts, and copy those draft artifacts back to the main workspace. That behavior is too weak for the intended downstream execution model.

The current implementation uses the word `merged` for a doc-only cluster contract transfer. That is misleading. A downstream cluster tree should not be considered merge-ready for the main workspace until it has produced code artifacts and passed the relevant gates. Copying `ClusterFacadeContract.draft.*` back to the main workspace is at most a planning/review checkpoint, not integration.

The same retest showed that `DevelopmentOrderPlan.v2` is not yet used as a real executable wave graph. The lead Product Part starts first because it should decide which downstream nodes are parallelizable and which nodes are ordered followers. If Core only starts the first cluster contract and then stops, the lead Product Part order plan is not yet delivering its main architectural value.

## 2. Decision Direction

The downstream model should move from "cluster-contract document branch" to "cluster execution tree".

Main workspace ownership:

- accepted trunk workflow artifacts;
- Product Part Development Briefs;
- accepted lead `DevelopmentOrderPlan.v2`;
- high-level Product Part coordination state.

Downstream cluster worktree ownership:

- the cluster facade boundary;
- the future cluster facade class;
- module specifications for modules owned by the cluster;
- module facade contracts/classes when they can be safely produced in the same cluster worktree;
- local commits, sessions, validation evidence, and node-level review state.

The main workspace must not receive downstream cluster artifacts as a final merge until the cluster worktree has produced the code boundary required for the next integration step. A doc-only copy may be allowed only if it is explicitly named as a review snapshot or planning checkpoint, never as `merged`.

## 3. Cluster Boundary Shape

A cluster should not have a separate long-form "Cluster Specification" as a primary artifact. The cluster-level boundary is the facade.

Expected cluster-level artifacts:

- `ClusterFacadeContract.draft.{md,json}` while the boundary is still under review;
- the actual cluster facade class once the boundary is accepted for code generation;
- validation evidence proving that the facade boundary and generated code match.

Expected module-level artifacts:

- module specifications;
- module facade contracts/classes where needed;
- module implementation plans and code in later execution phases.

Specifications belong to modules. The cluster should coordinate modules through its facade and through explicit module boundary contracts, not through a parallel cluster specification document that can drift from the facade.

## 4. Why Lead Product Part Runs First

The lead Product Part is not first because it should do all downstream work itself. It is first because it creates the Core-readable execution map:

- which nodes may start in the same wave;
- which nodes must wait for accepted upstream boundaries;
- which nodes belong to another Product Part but depend on this Product Part;
- which downstream trees need worktrees;
- which merge/review gates must be satisfied before mainline integration.

Core must consume this graph as execution input, not as advisory prose. The future wave runner should evaluate the accepted `DevelopmentOrderPlan.v2`, Core-owned Product Part acceptance state, node dependencies, worktree state, and review results before starting each wave.

The lead agent may propose the graph, but Core owns truth:

- Product Part brief acceptance must be read from Core-managed review state, not trusted from agent-written `requiredBriefs`;
- only Core starts downstream worktrees;
- only Core advances node status;
- only Core decides when a downstream tree is merge-ready.

## 5. Cluster Worktree And Module Parallelism

The first implementation does not need to split every module into its own worktree. A cluster worktree may be the initial execution surface for the cluster facade and all owned module specifications/facades. This keeps context coherent and prevents premature orchestration complexity.

Parallel module work should be a second-level optimization:

1. Core opens the cluster worktree from the accepted main workspace boundary.
2. The cluster worktree establishes the cluster facade and module boundary contracts.
3. If module work can proceed independently, Core may fork module worktrees from the cluster worktree state.
4. Module worktrees merge back into the cluster worktree.
5. The cluster worktree merges back to main only after the cluster code boundary and gates are complete.

This keeps parallelism available without forcing every early design artifact to become a separate main-workspace branch.

## 6. Refactor Stages To Slice Later

This document will collect several refactor topics. The first known stages are:

1. Stop pre-creating empty `doc/TODO/stages/development-tree/...` directories for unopened cluster/module nodes. `doc/TODO` should contain real managed plans only.
2. Rename or split the current doc-only cluster contract transfer so it is not reported as a final merge.
3. Replace `ClusterSpecification` with a facade-centered cluster boundary model.
4. Add a Core-owned wave runner that executes accepted `DevelopmentOrderPlan.v2` beyond the first cluster-contract wave.
5. Add downstream node executors for standalone modules, cluster module specifications, cluster facade code, and later implementation work.
6. Add merge-ready gates that require code artifacts and validation evidence before downstream work returns to the main workspace.

## 7. Open Questions

- Should the accepted cluster facade contract be copied to main as a visible review snapshot, or should it remain only inside the cluster worktree until code exists?
- What is the minimum code artifact that makes a cluster worktree merge-ready: facade class stub, facade plus module facade stubs, or fully implemented cluster slice?
- Should standalone modules run in their own worktrees immediately, or can they be handled inside the lead Product Part / cluster coordination tree until parallelism is needed?
- How should Project Manager name intermediate states so users can distinguish `review_snapshot`, `boundary_accepted`, `code_ready`, and `merged_to_main`?
