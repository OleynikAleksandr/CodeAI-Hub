# Development Tree Product Part Sub-Agent Orchestration

**Status:** Implementation scope active, MVP slice implemented through Cluster Contract sub-agent orchestration and Project Manager coordination projection, 2026-06-08.
**Relationship to reference architecture:** this document extends `DevelopmentTree_BranchWorkflow_Architecture.md` for the next implementation scope. It does not replace the reference architecture.

## 1. Problem

Release `1.2.469` made the lead Product Part workflow reach a logical review boundary: the user could accept `DevelopmentOrderPlan.draft.md/json`, and Core moved the lead Product Part plan into `User Return And Revisions`.

That was correct for the hotfix, but it is not the final Development Tree model. Once `DevelopmentOrderPlan` becomes a Core-readable unlock contract, accepting it must not immediately end lead Product Part coordination. The lead Product Part should remain the visible coordinator until the Product Part is assembled from downstream cluster/module results.

The user should not manually supervise every cluster, module, worker, retry, provider turn, or intermediate branch. The user needs one Product Part coordination surface with node-level gates.

## 2. Decision

Use a hybrid model:

- Lead Product Part agent is the visible semantic coordinator for its Product Part.
- Core is the deterministic executor for Git, worktrees, branch state, commits, validation, merge boundaries, and recovery.
- Cluster/module agents are sub-agents with scoped tasks and isolated execution state.
- Project Manager shows one Product Part coordination graph/read-model, not a pile of independent `todo-plan.md` files.

Sub-agent state may exist as Core recovery state, but it is not the primary user surface.

## 3. Lead Product Part Plan Lifecycle

The lead Product Part managed plan should not move to `Phase Return - User Return And Revisions` immediately after `DevelopmentOrderPlan.v2` acceptance.

Instead:

1. Product Part Development Brief is drafted and accepted.
2. Lead Product Part agent drafts `DevelopmentOrderPlan.v2`.
3. User reviews and accepts `DevelopmentOrderPlan.v2`.
4. Core validates the order plan as an unlock contract.
5. Lead Product Part plan enters a downstream coordination phase.
6. Core opens the first allowed cluster/standalone module wave.
7. Lead Product Part agent receives summarized downstream results and performs semantic coordination review.
8. Core performs merge/commit only after the required semantic and mechanical gates pass.
9. `Phase Return - User Return And Revisions` is reached only after the Product Part is assembled or explicitly paused by the user at a supported node-level gate.

## 4. DevelopmentOrderPlan.v2 Contract

The current `codeai-development-order-plan-v1` JSON is a recommendation document. It is not sufficient as a Core unlock contract.

`DevelopmentOrderPlan.v2` must answer:

- which Product Part briefs are required and accepted;
- which Product Part owns each downstream node;
- which cluster or standalone module nodes may open first;
- which nodes remain locked and why;
- which nodes may run in the same wave;
- which nodes must wait for cluster contracts, module contracts, implementation results, or integration gates;
- which Git worktree/branch policy applies to each opened node;
- which artifacts and summaries must be returned to the lead Product Part coordinator.

Minimum machine shape:

```json
{
  "schema": "codeai-development-order-plan-v2",
  "leadProductPartId": "finder-widget",
  "productPartLeadershipOrder": ["finder-widget", "finder-widget-shell"],
  "requiredBriefs": [
    {
      "partId": "finder-widget",
      "status": "accepted"
    }
  ],
  "nodes": [
    {
      "id": "cluster:finder-widget/note-selection-cluster",
      "kind": "cluster",
      "partId": "finder-widget",
      "clusterId": "note-selection-cluster",
      "dependsOn": [],
      "execution": {
        "mode": "subagent-worktree",
        "startPolicy": "core-unlocks-user-startable"
      },
      "expectedArtifacts": [
        "ClusterSpecification.draft.md",
        "ClusterFacadeContract.draft.md",
        "ClusterSpecification.draft.json",
        "ClusterFacadeContract.draft.json"
      ]
    }
  ],
  "waves": [
    {
      "id": "wave-1-cluster-contracts",
      "unlockNodeIds": ["cluster:finder-widget/note-selection-cluster"],
      "parallelGroup": "A",
      "gate": "lead_product_part_coordination_review"
    }
  ],
  "lockedNodes": [
    {
      "nodeId": "module:finder-widget/note-selection-cluster/latest-note-resolver",
      "reason": "waiting_for_cluster_specification_and_facade_contract"
    }
  ]
}
```

The exact field names may evolve during implementation, but the contract must remain machine-readable and validator-owned by Core.

### 4.1. Top-down contract seeds

Development Tree orchestration is top-down. A lower-level agent must not invent the public boundary of its node from scratch.

Responsibility is split this way:

- Product Part agent defines the downstream node contract seeds: expected consumer, required inputs, required outputs, status/error vocabulary, sequencing assumptions, and blocking open questions for each Cluster or Standalone Module node.
- Cluster agent receives its Product Part contract seed and turns it into a concrete pre-code Cluster Facade Contract plus module boundary contracts for the modules it owns.
- Standalone Module agent receives its Product Part contract seed and turns it into a concrete pre-code Module Facade Contract and Function Specification.
- Cluster Module agent receives its Cluster-owned module boundary contract and turns it into a concrete Module Specification, Function Specification, and Implementation TODO Plan.

Lower agents may refine names, DTO shape, edge cases, and algorithmic details. They may not silently change the semantic boundary. If the seed is insufficient or inconsistent, the agent must produce a blocking question or revision request instead of filling the gap with speculation.

The `DevelopmentOrderPlan.v2` machine contract should evolve from a pure wave/unlock graph into an unlock graph plus `contractSeeds` for downstream nodes. A seed does not need to be final code, but it must be specific enough to constrain the next agent:

```json
{
  "nodeId": "cluster:finder-widget/note-selection-cluster",
  "consumer": "finder-widget-shell",
  "requiredInputs": ["local notes folder context"],
  "requiredOutputs": ["normalized note-selection result"],
  "requiredStatuses": ["data-found", "no-data", "access-error", "invalid-input"],
  "requiredOwnedModules": ["latest-note-resolver", "note-payload-builder"],
  "blockingQuestions": ["snippet policy must be resolved before implementation"]
}
```

## 5. First FinderWidget Downstream Step

For the current FinderWidget tree, the first downstream node should be cluster-level:

```text
Product Part: finder-widget
  Cluster: note-selection-cluster
```

The first sub-agent should create:

- `Cluster Specification`;
- `Cluster Facade Contract`;
- machine-readable JSON companions for Core validation.

The cluster contract is not an abstract design note. It is a pre-code artifact. It must describe the future code surface concretely enough that module agents and implementation agents can work without re-inventing the boundary:

- facade class name;
- facade file path;
- public method signatures;
- input DTOs;
- output DTOs and discriminated result union;
- error/status model;
- owned module call order;
- module boundary contracts for `latest-note-resolver` and `note-payload-builder`;
- blocking and non-blocking open questions.

The first wave should not open `latest-note-resolver` or `note-payload-builder` directly. Those modules need the cluster contract first, otherwise module agents may invent incompatible input/output contracts.

`empty-state-resolver` should remain locked unless `DevelopmentOrderPlan.v2` explicitly proves that it can be designed independently of the payload/status contract produced by the cluster path.

## 6. Plan Ownership

### Visible coordination plan

The lead Product Part plan is the user-facing coordination axis. It records:

- accepted Product Part brief;
- accepted `DevelopmentOrderPlan.v2`;
- active downstream wave;
- opened sub-agent nodes;
- branch/worktree references;
- current node-level gate;
- semantic review outcome;
- merge outcome;
- next unlocked wave;
- final Product Part return/pause state.

### Technical sub-agent state

Each cluster/module sub-agent may still have Core-owned technical state for recovery:

- session id;
- provider/native session reference;
- worktree path;
- branch name;
- current task;
- expected commit;
- artifact paths;
- validation status;
- merge readiness;
- blocker/retry metadata.

This technical state should be aggregated into the lead Product Part read-model. The user should not need to inspect every sub-agent state file during normal work.

## 7. Git And Worktree Model

Cluster/module sub-agent work should run outside the main workspace in dedicated Git worktrees/branches.

Core responsibilities:

- create worktree/branch from the accepted Product Part/order-plan base commit;
- dispatch the sub-agent session with inline context;
- validate generated artifacts;
- record sub-agent commits inside the worktree;
- report summary and artifact references to the lead Product Part coordinator;
- perform merge only after required semantic/user/Core gates pass;
- keep rollback as normal Git rollback at node boundaries.

Lead Product Part agent responsibilities:

- decide whether the sub-agent result semantically fits the Product Part plan;
- request a correction if the result is incomplete or inconsistent;
- recommend merge only after semantic acceptance.

The lead Product Part agent does not perform raw Git operations. Core executes Git operations.

## 8. User Gates And Rollback

The user should see node-level gates, not internal worker noise.

Supported user-level gates:

- accept/revise Product Part brief;
- accept/revise `DevelopmentOrderPlan.v2`;
- accept/revise cluster contract result;
- accept/revise module contract/specification result;
- accept/revise module implementation result;
- accept/revise Product Part integration result.

Rollback/Clear Undo should be node-level:

- clearing a cluster result removes its worktree/session/result and reopens that cluster node from the current accepted parent state;
- clearing a module result removes that module worktree/session/result and reopens the module from the current accepted cluster/module contract state;
- internal retries and worker corrections remain automated and hidden unless they produce a semantic blocker.

## 9. Project Manager Projection

Project Manager should show one Product Part coordination graph:

```text
finder-widget
  DevelopmentOrderPlan.v2: accepted
  Wave 1: Cluster Contracts
    note-selection-cluster: running | review | accepted | merge-ready | merged | needs-revision
  Wave 2: Module Contracts
    latest-note-resolver: locked until cluster contract accepted
    note-payload-builder: locked until latest-note-resolver contract/result accepted
  Final: Product Part Assembly
    status: locked until downstream nodes merged
```

The graph may link to sub-agent details, but the default surface remains Product Part-level.

## 10. MVP Implementation Boundary

The implemented MVP scope is intentionally narrow:

1. Lead order-plan prompt/schema requests `DevelopmentOrderPlan.v2`.
2. Core validates `DevelopmentOrderPlan.v2` shape, node references, dependencies, first-wave unlockability, and locked nodes.
3. Order-plan acceptance keeps the lead Product Part in downstream coordination instead of final return.
4. Core materializes first-wave unlock state for cluster/standalone module nodes.
5. Core bootstraps first-wave Cluster Contract sub-agents in deterministic Git worktrees/branches.
6. Cluster Contract sub-agents create `ClusterSpecification` and `ClusterFacadeContract` markdown/json artifacts, stop at review, and accept revision text as provider feedback.
7. Acceptance writes review-result and merge-boundary evidence, merges accepted cluster artifacts back to the main workspace, marks the cluster `merged`, and keeps dependent modules `locked`.
8. Project Manager renders the resulting Product Part coordination graph from Core's `developmentTree` snapshot.

This keeps the product moving without pretending that Core can design arbitrary products by script. Agents own semantic planning; Core owns deterministic execution and recovery.

## 11. Pre-code artifact ladder

Every Development Tree node below Product Part must move from contract to code through explicit pre-code artifacts:

1. `FacadeContract` defines the exact future facade code surface: class, file path, public methods, DTOs, result union, errors, and dependency boundary.
2. `FunctionSpecification` defines the concrete algorithms/functions needed behind that facade: function names, inputs, outputs, preconditions, processing steps, edge cases, failure handling, and test cases.
3. `ImplementationTodoPlan` turns the accepted contract and function specification into microtasks with file targets, tests, gates, and paired Git Commit items.

For Cluster nodes, the Cluster agent owns this ladder for the cluster facade and additionally defines module boundary contracts for each owned module. For Standalone Module and Module nodes, the module agent owns the ladder for its own facade/functions/implementation plan.

Core validation should reject artifacts that remain at essay level. A valid contract must be close enough to code that the next agent can identify the exact future files, classes, methods, DTOs, and function specifications it must produce.
