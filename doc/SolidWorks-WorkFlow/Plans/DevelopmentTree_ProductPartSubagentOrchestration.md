# Development Tree Product Part Sub-Agent Orchestration

**Status:** Planning Draft, 2026-06-08.
**Relationship to reference architecture:** this document extends `DevelopmentTree_BranchWorkflow_Architecture.md` for the next implementation scope. It does not replace the reference architecture.

## 1. Problem

Release `1.2.469` makes the lead Product Part workflow reach a logical review boundary: the user can accept `DevelopmentOrderPlan.draft.md/json`, and Core moves the lead Product Part plan into `User Return And Revisions`.

That is correct for the hotfix, but it is not the final Development Tree model. Once `DevelopmentOrderPlan` becomes a Core-readable unlock contract, accepting it must not immediately end lead Product Part coordination. The lead Product Part should remain the visible coordinator until the Product Part is assembled from downstream cluster/module results.

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

The next implementation scope should be intentionally narrow:

1. Update lead order-plan prompt/schema to request `DevelopmentOrderPlan.v2`.
2. Add Core validator for `DevelopmentOrderPlan.v2` shape and node references.
3. Change order-plan acceptance so lead Product Part enters downstream coordination instead of final return.
4. Materialize first-wave unlock state for cluster/standalone module nodes.
5. For FinderWidget, unlock `note-selection-cluster` as the first cluster sub-agent node.
6. Keep actual cluster worktree execution and merge as the next scope if needed, unless the validator/unlock slice remains too small to test.

This keeps the product moving without pretending that Core can design arbitrary products by script. Agents own semantic planning; Core owns deterministic execution and recovery.
