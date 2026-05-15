# Managed Workflow Orchestration — Cluster (SSOT)

**Status:** Active design/runtime boundary for the replacement cluster.
**Created:** 2026-05-15.
**Owner:** Core Runtime.
**Code boundary:** `packages/core/src/managed-workflow-orchestration/`.
**Public facade:** `ManagedWorkflowOrchestrationFacade`.

## 1. Purpose

`Managed Workflow Orchestration` is the Core-owned cluster that will replace the retired generated-script/post-turn managed orchestration for technical Documentation Tree stages.

The cluster owns lifecycle decisions for:

- `Diagram Modules`;
- `Application Skeleton`;
- `Quality Gates Baseline`;
- future managed documentation steps registered through the same step-controller contract.

The first implementation release exposes a runtime-visible preview boundary only. End-to-end execution of the three managed steps is added later one step at a time.

## 2. Facade Contract

External code may depend only on `ManagedWorkflowOrchestrationFacade` and exported public contract types.

The facade owns these ingress points:

- managed step start/resume events from `remote-bridge`;
- user messages received while a managed review phase is active;
- provider turn completion/failure events;
- recovery timer/restart/session-restored events;
- workflow-state read-model projection requests.

The facade returns typed decisions/effects. It does not let callers mutate managed state directly.

Forbidden external access:

- importing step controller internals from `remote-bridge`;
- updating managed phase/task/hash state from Project Manager read paths;
- sending provider continuation/repair/acceptance messages outside the provider gateway;
- writing Git commits or pseudo-hashes outside the commit transaction boundary.

## 3. Internal Modules

The cluster is composed of closed modules behind the facade:

1. `ManagedWorkflowStepRegistry`
   - maps `stageId` to a step controller;
   - supports registering additional managed steps without new runtime dispatch branches;
   - exposes phase metadata, validators, owned paths, prompts, and recovery policy.

2. `ManagedWorkflowStateMachine`
   - pure transition engine;
   - input: canonical snapshot + typed event;
   - output: decision + effect list;
   - no file writes, provider calls, Git commands, UI updates, or clock reads.

3. `ManagedWorkflowSnapshotReader`
   - builds a canonical snapshot from store, artifacts, Git, continuity, session state, and provider turn state;
   - detects impossible mixed states before effects execute.

4. `ManagedWorkflowEffectExecutor`
   - runs state-machine effects in deterministic order;
   - delegates to plan store, commit transaction, provider gateway, audit log, session feed, and read-model emitters.

5. `ManagedWorkflowPlanStore`
   - owns persisted managed workflow state selected for the replacement cluster;
   - must not revive retired generated child-plan scenario logic;
   - stores real Git hashes or explicit non-commit dispositions only.

6. `ManagedWorkflowCommitTransaction`
   - owns Git commit semantics for managed attempts;
   - never writes `included-in-commit`;
   - never marks a commit outcome complete before a real commit hash exists.

7. `ManagedWorkflowProviderGateway`
   - provider-neutral Core message dispatch boundary;
   - keeps Claude/Codex/Gemini differences below the state machine;
   - guarantees intended Core messages are visible in audit/session feed.

8. `ManagedWorkflowUserIntentClassifier`
   - classifies user messages in Type B review phases;
   - recognizes natural acceptance/revision/discussion intent from the current managed context.

9. `ManagedWorkflowRecoveryArbiter`
   - decides wait/retry/rebind/recover/block/panic outcomes for stuck states;
   - returns decisions only; it does not mutate state directly.

10. `ManagedWorkflowReadModelProjector`
    - projects canonical state to Project Manager snapshots;
    - read-only and side-effect free.

11. `ManagedWorkflowAuditLog`
    - records Core decisions, effects, blockers, recovery actions, and provider-visible messages.

## 4. Step Controller Contract

Each managed step is a module implementing the same controller contract:

```text
stageId
displayName
phaseTable
ownedArtifactPaths
ownedMaterializationPaths
validators
prompt builders
recovery policy
read-model projection hints
```

Controllers must not:

- call providers;
- run Git;
- mutate UI state;
- mutate persisted state directly.

They describe step-specific facts to the generic state machine and effect executor.

Adding a future managed step should require:

1. implementing a new controller module;
2. registering it in `ManagedWorkflowStepRegistry`;
3. adding tests for its phase table and owned paths;
4. updating documentation.

It must not require new ad hoc branches in `remote-bridge` runtime dispatch.

## 5. Phase Types

The cluster supports reusable phase types defined in the planning package:

- **Type A — Core-Gated Agent Work:** Core prompts provider, provider produces artifacts/materialization, Core validates and commits safe attempts.
- **Type B — User-Led Review:** Core hands control to the user, classifies acceptance/revision/discussion, and calls the provider only for requested revisions.
- **Persistent Return Open Boundary:** Core declares a completed step revisitable later; detailed future return/revision workflow is separate.

## 6. Runtime Ownership

Runtime ownership rules:

- Project Manager is a read-model consumer and command surface.
- Provider adapters transport turns and report events; they do not decide workflow acceptance.
- Core state machine decides the next managed transition.
- Commit transaction owns managed Git boundaries.
- Provider gateway owns provider-visible Core messages.
- Read-model projector cannot run commits, send provider messages, or advance phases.

## 7. First Release Boundary

The first implementation release must show a visual control point:

- technical managed stages route through `ManagedWorkflowOrchestrationFacade`;
- the registered controller for the selected stage is visible in Project Manager state/surface;
- the user sees a Core-authored message that the new cluster boundary is active and step-specific execution is intentionally waiting for the next release;
- no old accept-contract, continuation, repair, post-turn commit, generated child-plan, or pseudo-hash behavior returns.

This is a valid intermediate release even though the three managed steps are not yet end-to-end.

## 8. Hard Invariants

1. One canonical facade is the only external cluster entrypoint.
2. Step-specific behavior is registered through controllers, not scattered runtime branches.
3. `lastRecordedCommit` and managed commit records may contain only real Git hashes or explicit non-commit dispositions.
4. `included-in-commit` is forbidden.
5. User acceptance is a Core decision, not a provider message.
6. Core-owned blockers are not sent as provider repair instructions.
7. Project Manager read paths stay side-effect free.
8. Provider differences are isolated in the provider gateway/adapters.
9. Recovery decisions are typed and audited.
10. New managed steps can be added without changing the state machine contract.
