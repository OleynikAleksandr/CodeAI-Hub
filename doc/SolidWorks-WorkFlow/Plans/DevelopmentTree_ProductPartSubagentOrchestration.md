# Development Tree Product Part Sub-Agent Orchestration

**Status:** Implementation scope active, MVP slice implemented through Cluster Contract sub-agent orchestration, Project Manager coordination projection, boundary-accepted cluster checkpoints, Product Part review-session projection, and Product Part Brief Barrier dispatch, 2026-06-11.
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
2. Core waits until every planned Product Part has a user-accepted Development Brief.
3. Core dispatches the lead-only `DevelopmentOrderPlan.v2` assignment into the lead Product Part session with every accepted Product Part brief embedded inline.
4. User reviews and accepts `DevelopmentOrderPlan.v2`.
5. Core validates the order plan as an unlock contract.
6. Lead Product Part plan enters a downstream coordination phase.
7. Core opens the first allowed cluster/standalone module wave.
8. Lead Product Part agent receives summarized downstream results and performs semantic coordination review.
9. Core performs merge/commit only after the required semantic and mechanical gates pass.
10. `Phase Return - User Return And Revisions` is reached only after the Product Part is assembled or explicitly paused by the user at a supported node-level gate.

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
    },
    {
      "partId": "finder-widget-shell",
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
        "ClusterFacadeContract.draft.md",
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
      "reason": "waiting_for_cluster_facade_boundary_and_code_ready_state"
    }
  ]
}
```

The exact field names may evolve during implementation, but the contract must remain machine-readable and validator-owned by Core.

Core, not the lead agent, owns accepted-brief truth. The lead prompt includes the full accepted markdown for every planned Product Part. `requiredBriefs` in the JSON must mirror that Core-supplied set; the agent must not invent missing briefs or mark a not-yet-accepted brief as accepted.

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

- `Cluster Facade Contract`;
- machine-readable JSON companions for Core validation.

The cluster contract is not an abstract design note. It is the pre-code cluster boundary. It must describe the future code surface concretely enough that module agents and implementation agents can work without re-inventing the boundary:

- facade class name;
- facade file path;
- public method signatures;
- input DTOs;
- output DTOs and discriminated result union;
- error/status model;
- owned module call order;
- module boundary contracts for `latest-note-resolver` and `note-payload-builder`;
- blocking and non-blocking open questions.

Legacy `ClusterSpecification` drafts may still exist during the transition, but they are not the primary cluster-level artifact. Specifications belong to modules; the cluster-level boundary is the facade.

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
- boundary acceptance / code-ready / merge outcome;
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

## 8. Stop-Gate Policy For Product Part Sub-Agents

Product Part, Cluster and Module sub-agent orchestration follows the no-stop dual-outcome policy of the broader Development Tree workflow: every Core settlement ends either as an agent repair/continuation dispatch or as a button gate with a concrete user action. An informational message that stops development without an attached action is a defect.

Core never stops the user for technical residue that Core created or can preserve:

- created worktrees, attached runtime roots, local runtime ignores, continuity ledgers and managed plan files are Core-owned state;
- dirty Git in the relevant main workspace or sub-agent worktree is always auto-committed at the node boundary with two-basket classification: workflow-owned paths join the managed step commit, everything else is preserved in a separate `chore: preserve workspace changes` commit;
- stale projected session ids, missing live stream attachment, and worktree dialog root mismatches are Core/Project Manager integration defects and must be repaired by reconciliation, not by user refresh rituals;
- corrupted or missing managed plan state in a sub-agent worktree is repaired deterministically or via an agent repair dispatch, never surfaced as a crash or a hanging dialog.

Validation pressure matches the consumer:

- Core-readable unlock fields (node identity, facade identity, method boundary, input/output type names, result union, owned module boundaries) are repaired through bounded agent dispatches (3 attempts per artifact);
- on exhaustion, agent-readable prose is accepted with a recorded warning, while missing Core-required fields raise a button gate (retry / continue as is / roll back node);
- agent-readable prose, explanatory sections, and non-critical formatting are warnings or revision prompts and never block the workflow;
- if a lower agent cannot refine a boundary because the parent seed is insufficient, it asks a blocking semantic question through its session instead of inventing a contract.

Valid button gates for sub-agent flows:

- accept/revise gates on node artifacts (the planned review gates);
- Clear/Undo or refactoring that would delete a node/worktree not supported by accepted upstream artifacts;
- provider authentication/availability failures with no local recovery path (retry / switch provider / re-authenticate);
- repair-limit exhaustion on Core-required machine fields.

A merge that would apply unverified work or fail quality gates is not a user stop: the failure summary is dispatched to the responsible agent for repair, and the merge stays closed until the gates pass.

Project Manager must render these states truthfully. `Agent is working` belongs only to an active provider/native turn. Review gates, warnings, repair-ready states and Core bookkeeping messages must release user input and show the available action.

## 9. User Gates And Rollback

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

## 10. Project Manager Projection

Project Manager should show one Product Part coordination graph:

```text
finder-widget
  DevelopmentOrderPlan.v2: accepted
  Wave 1: Cluster Contracts
    note-selection-cluster: running | review | boundary_accepted | worktree_active | code_ready | merged | needs-revision
  Wave 2: Module Contracts
    latest-note-resolver: locked until cluster facade boundary/code-ready gate permits module work
    note-payload-builder: locked until latest-note-resolver contract/result accepted
  Final: Product Part Assembly
    status: locked until downstream nodes are code-ready and merged
```

The graph may link to sub-agent details, but the default surface remains Product Part-level.

## 11. Projected Sub-Agent Dialog Routing Lessons

The 2026-06-09 cluster-contract regression exposed a concrete class of bugs that must be treated as architectural, not cosmetic UI defects.

Observed symptoms:

- selecting `note-selection-cluster` in Project Manager showed only an old reasoning message while the worktree JSONL already contained later agent and Core/System messages;
- toggling the left sidebar away and back made the missing messages appear because a full history reload happened on reselection;
- the `Подтверждаю` review button was visible after reselection, but clicking it could leave the input blocked with the normal free-text placeholder instead of a managed review wait state.

Root causes:

- Project Manager selected the cluster node from the main workspace graph, but the actual cluster session lived in a separate worktree runtime.
- `dialog:list` could resolve the projected entry and return `worktreePath`, but the client kept using the original main-workspace dialog intent for live history refresh.
- `dialog:history` and some follow-up commands therefore read the main workspace runtime instead of the worktree JSONL.
- the review confirmation path used a direct runtime session message for the visible cluster dialog instead of `dialog:send`, so Core did not always resolve the correct worktree-backed continuity chain.
- the UI did not apply a local managed-review lock after the button click, so the visible input state contradicted the actual blocked Core transition.

Required invariants for every cluster/module projected dialog:

1. Once Core resolves a projected dialog, the client must replace its active and pending dialog intent with the resolved intent that includes `worktreePath`.
2. Every `dialog:list`, `dialog:history`, `dialog:open` and `dialog:send` command for a projected node must carry the explicit `workspacePath` of the worktree.
3. Core may accept that requested `workspacePath` only when it equals the selected workspace root or is under the allowed sibling worktree root `<workspace>.worktrees/...`.
4. `dialog:history` must read provider-neutral JSONL from the resolved worktree root, not from the main workspace projection.
5. `Подтверждаю` and later managed review actions must be sent through `dialog:send` with `turnOptions.managedReviewAction`; direct `session:message` is only valid for non-projected runtime sessions.
6. After a managed review click, Project Manager may optimistically show a local `managed_core_gated` lock, but Core/System messages remain the source of truth for releasing or advancing the gate.

Regression checks for future fixes:

- keep the cluster node selected without toggling the sidebar; new agent and Core/System messages must stream into the visible dialog from the worktree JSONL;
- click `Подтверждаю`; the input must switch into a managed wait/locked state and then advance or unlock after Core handles the review decision;
- inspect the command path: `dialog:list/history/send` must include `workspacePath` for projected cluster/module nodes;
- verify that Core rejects arbitrary `workspacePath` values outside the selected root and the corresponding `.worktrees` root;
- run targeted client/source tests for pending intent replacement and managed review lock behavior, plus Core dialog-send tests proving that `turnOptions` survive worktree-root session resolution.

This regression is a warning for all future sub-agent surfaces: the left tree projection identity and the right dialog runtime identity are different objects. The projection can be owned by the main Product Part graph, but the chat history, provider continuity, review button, and native session binding belong to the node worktree.

### 11.1. Core-owned runtime attachments

The follow-up 2026-06-10 retest showed that routing explicit `dialog:history` requests to a worktree is not enough. The backend can complete the cluster session and write the final JSONL, while Project Manager remains visually stuck because live WebSocket delivery is still scoped only to the main workspace.

The correct rule is not "user opens a projected dialog, then Core starts watching the worktree". Core creates the worktree, so Core must attach that worktree runtime root to the main workspace observation graph immediately when the downstream node is bootstrapped.

Required model:

- the main workspace remains the Project Manager scope and owns the Product Part coordination graph;
- every Core-created cluster/module worktree becomes an attached runtime root of that main workspace;
- live session events, dialog messages, turn-state events, managed input gates, and review handoff messages from attached runtime roots are delivered to Project Manager as part of the main Development Tree observation stream;
- selecting a node in the left tree only chooses which already-observed dialog/session to render; it must not be the action that starts observation;
- Clear/Undo of a cluster/module node removes its worktree and detaches that runtime root;
- reconnect/restart must rebuild attachments from current Development Tree/worktree truth, not from prior UI selection state.

This must scale to any number of Core-created worktrees. Project Manager should not subscribe to arbitrary folders and should not scan all possible directories. Core owns the set of attached runtime roots because Core is the only layer allowed to create, clear, and reconcile those worktrees.

Regression signal: if a cluster/module dialog updates only after sidebar toggling, the explicit history path may be correct, but the Core-owned runtime attachment stream is missing or filtered out.

## 12. MVP Implementation Boundary

The implemented MVP scope is intentionally narrow:

1. Lead order-plan prompt/schema requests `DevelopmentOrderPlan.v2`.
2. Core validates `DevelopmentOrderPlan.v2` shape, node references, dependencies, first-wave unlockability, and locked nodes.
3. Order-plan acceptance keeps the lead Product Part in downstream coordination instead of final return.
4. Core materializes first-wave unlock state for cluster/standalone module nodes.
5. Core bootstraps first-wave Cluster Contract sub-agents in deterministic Git worktrees/branches.
6. Cluster Contract sub-agents create cluster facade boundary markdown/json artifacts, stop at review, and accept revision text as provider feedback.
7. Acceptance writes review-result and boundary-accepted evidence, does not copy draft cluster docs into main, does not mark the cluster `merged`, and keeps the worktree active for future facade/module code work.
8. Product Part review-session projection exposes non-lead Product Part sessions in Project Manager, and managed startup persists the primary unified history before provider/translation side effects.
9. Product Part Brief Barrier blocks the lead `DevelopmentOrderPlan` assignment until every planned Product Part brief is accepted, then dispatches the unlocked continuation into the lead Product Part session.
10. Project Manager renders the resulting Product Part coordination graph from Core's `developmentTree` snapshot.

This keeps the product moving without pretending that Core can design arbitrary products by script. Agents own semantic planning; Core owns deterministic execution and recovery.

## 13. Pre-code artifact ladder

Every Development Tree node below Product Part must move from contract to code through explicit pre-code artifacts:

1. `FacadeContract` defines the exact future facade code surface: class, file path, public methods, DTOs, result union, errors, and dependency boundary.
2. `FunctionSpecification` defines the concrete algorithms/functions needed behind that facade: function names, inputs, outputs, preconditions, processing steps, edge cases, failure handling, and test cases.
3. `ImplementationTodoPlan` turns the accepted contract and function specification into microtasks with file targets, tests, gates, and paired Git Commit items.

For Cluster nodes, the Cluster agent owns this ladder for the cluster facade and additionally defines module boundary contracts for each owned module. For Standalone Module and Module nodes, the module agent owns the ladder for its own facade/functions/implementation plan.

Core validation should reject artifacts that remain at essay level. A valid contract must be close enough to code that the next agent can identify the exact future files, classes, methods, DTOs, and function specifications it must produce.
