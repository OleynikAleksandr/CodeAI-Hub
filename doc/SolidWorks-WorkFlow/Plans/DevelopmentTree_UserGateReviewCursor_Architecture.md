# Development Tree User Gate Review Cursor

**Status:** active next-step planning source, opened 2026-06-12.
**Parent strategic line:** `Plans/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md`.
**Scope:** parallel pre-code Development Tree execution with a Core-owned sequential user-review cursor and Project Manager tree attention markers.

## 1. Problem

The Development Tree can run more work in parallel than the user can review in parallel.

After `Diagram Modules` is accepted, Core already knows the Product Parts, clusters, standalone modules, lead Product Part, and leadership order. Product Part briefs, lead order planning, cluster facade contracts, and module specifications are semantic/pre-code work. They do not require the final application codebase to be created yet.

At the same time, the user must not receive several simultaneous review prompts and enabled confirmation buttons. If six Product Part or node artifacts reach review at nearly the same time, the UI must not ask the user to act on all of them at once. The user can read many sessions, but should have exactly one active decision target.

The current marker model has enough base states for ordinary progress:

- gray: not started;
- yellow: running;
- green: completed/accepted.

It lacks a strong "the system needs your action here now" state and lacks a Core-owned rule for choosing which pending review receives the user's active input.

## 2. Decision

Use the existing Documentation Tree / Development Tree sidebar as the primary user-orientation surface. Do not create a separate action inbox for this refactor.

Core owns a single review cursor:

```text
activeUserGate: UserGate | null
queuedUserGates: UserGate[]
```

Only `activeUserGate` accepts user action. Queued gates are visible and readable, but their review controls and chat input are locked until Core promotes that gate to active.

Project Manager renders this Core-owned cursor in the existing tree:

- running nodes remain yellow;
- completed nodes remain green;
- the active user gate gets a pulsing amber/orange marker;
- queued user gates get a non-pulsing amber/orange marker or a muted attention marker;
- blocker/error states remain red and must not be confused with normal user review.

The pulsing marker is the "respond here now" signal. Red remains reserved for failed validation, blocked orchestration, missing artifacts, or unrecoverable runtime errors.

## 3. Parallel Execution Model

The Development Tree process should be split into two lanes after accepted `Diagram Modules`.

### Lane A: Project foundation

This lane remains code-foundation owned:

```text
Application Skeleton
  -> Quality Gates Baseline
  -> verified code-generation readiness
```

`Quality Gates Baseline` still depends on the accepted/materialized Application Skeleton. The refactor does not remove that dependency.

### Lane B: Development Tree pre-code planning

This lane may run in parallel with Lane A:

```text
Product Part Development Briefs
  -> all Product Part briefs accepted
  -> lead DevelopmentOrderPlan.v2
  -> first allowed cluster / standalone module contract waves
  -> cluster facade contracts and module specifications
```

Lane B may produce pre-code artifacts while Lane A is still preparing the application foundation. It must not produce implementation code or code-ready merges until Lane A reaches verified readiness.

Allowed before verified Quality Gates:

- Product Part Development Briefs;
- lead `DevelopmentOrderPlan.v2`;
- Core-readable wave/dependency graph;
- cluster facade contracts;
- module facade contracts;
- module function/specification artifacts;
- implementation TODO plans that describe future code work.

Forbidden before verified Quality Gates:

- writing production implementation code;
- claiming a cluster/module is code-ready;
- merging downstream tree contents to main as implementation;
- running final code integration gates that require the real skeleton/gate surface.

If an early pre-code artifact needs exact file paths that are not yet known before Application Skeleton is accepted, it should use logical/provisional paths and mark them as `pending_skeleton_alignment`. Core can repair or reconcile those paths after Skeleton materialization.

## 4. Product Part Brief Barrier

Core must start every planned Product Part agent for the pre-code lane. The number of Product Parts is arbitrary and comes from accepted `Diagram Modules`.

Every Product Part agent drafts a `ProductPartDevelopmentBrief`.

Only the lead Product Part later receives the `DevelopmentOrderPlan.v2` assignment, and only after Core has recorded user acceptance for every planned Product Part brief.

The barrier is Core-owned:

```text
all planned Product Part briefs accepted?
  no  -> lead order-plan task remains blocked
  yes -> Core dispatches the lead order-plan prompt
```

When the barrier opens, the lead prompt must contain the full text of every accepted Product Part brief inline. Paths are provenance only; the lead agent must not be required to discover or read the brief files.

The user-review cursor makes this understandable in the UI:

- secondary Product Part brief review gates can become active one by one;
- the lead Product Part order-plan node stays blocked or pending while those review gates are unresolved;
- once all briefs are accepted, Core promotes or dispatches the lead order-plan task.

## 5. User Review Cursor Rules

Core chooses the active review gate deterministically.

Recommended ordering:

1. dependency-unblocking gates before dependent gates;
2. Product Part brief gates before lead `DevelopmentOrderPlan.v2`;
3. earlier completed provider turns before later completed provider turns;
4. tree order as the final tie-breaker.

Only the active gate has enabled user actions:

- review buttons;
- revision/feedback input;
- accept/reject controls;
- managed repair entrypoints.

Queued gates are read-only:

- the user may open the node;
- the user may read session history and artifacts;
- the user sees why input is locked;
- no acceptance/revision action is accepted until Core promotes the gate.

This is parallel orchestration with sequential user decisions.

## 6. Auto-Open Behavior

When `activeUserGate` changes, Project Manager should automatically open the corresponding node, session, and artifact panel once.

Rules:

- auto-open happens only on promotion to active, not on every snapshot refresh;
- if the user navigates away, the pulsing marker remains available for manual return;
- queued gates must not steal focus;
- reconnecting Project Manager clients read the same Core-owned cursor and render the same active/queued state;
- closing Project Manager must not stop Core from running until the next user gate.

## 7. Snapshot Contract

Core should expose enough state for clients to render the tree without owning workflow truth.

Minimum read-model fields:

```json
{
  "activeUserGate": {
    "id": "product-part:f1/brief-review",
    "nodeId": "product-part:f1",
    "reason": "review_required",
    "artifactPaths": [],
    "sessionId": "..."
  },
  "queuedUserGates": [
    {
      "id": "product-part:f2/brief-review",
      "nodeId": "product-part:f2",
      "reason": "waiting_for_user_review_cursor"
    }
  ],
  "nodes": [
    {
      "id": "product-part:f2",
      "status": "awaiting_user_review_queued",
      "inputLocked": true,
      "inputLockReason": "Another user gate is active."
    }
  ]
}
```

The exact TypeScript shape can differ, but the ownership boundary must not: Core decides active/queued status; Project Manager renders it.

## 8. First Implementation Slice

The first code refactor should be small and verifiable:

1. Add Core-owned user-gate cursor state to the Development Tree snapshot/read model.
2. Make Project Manager render active and queued user-review markers in the existing tree.
3. Auto-open only the active gate session/artifacts on cursor promotion.
4. Lock queued gate input/actions while allowing read-only session/artifact viewing.
5. Wire Product Part brief review gates so secondary briefs are presented sequentially and the lead order-plan task visibly waits for all accepted briefs.

This slice does not need to move Product Part startup earlier than Quality Gates yet. Moving the entire pre-code lane to begin after `Diagram Modules` can be a later slice once the cursor is reliable.

## 9. Acceptance Criteria

- Multiple Development Tree agents may run concurrently.
- If multiple review gates become ready, exactly one gate is active for user input.
- The active gate is visible in the sidebar with a pulsing amber/orange marker.
- Queued gates are visible but read-only.
- Selecting a queued gate shows its session/artifacts and a Core-provided lock reason.
- Accepting/rejecting/revising the active gate promotes the next queued gate without requiring a full Project Manager restart.
- Lead `DevelopmentOrderPlan.v2` does not start until every Product Part brief is accepted.
- The implementation remains Core-owned and works if Project Manager is closed until the next user gate.

## 10. Out Of Scope

- Building a separate action inbox/dashboard.
- Letting Project Manager choose the active review gate.
- Allowing multiple enabled user acceptance buttons at the same time.
- Generating production implementation code before Application Skeleton and Quality Gates are ready.
- Treating a doc-only cluster boundary as a final merge.

## 11. Open Questions

- Should queued gates use a static amber marker or a softer gray/amber marker?
- Should Core persist the last auto-opened gate per client, or only expose the global cursor and let each client suppress repeated auto-open locally?
- Should pre-code cluster/module contract waves start immediately after accepted lead `DevelopmentOrderPlan.v2` even if Application Skeleton is still running, or should the first release of this refactor limit itself to Product Part brief/order-plan gating?
