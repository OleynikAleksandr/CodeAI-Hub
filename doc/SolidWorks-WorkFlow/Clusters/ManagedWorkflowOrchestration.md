# Managed Workflow Orchestration — Cluster (SSOT)

**Status:** Active runtime boundary for managed technical trunk steps.
**Created:** 2026-05-15.
**Owner:** Core Runtime.
**Code boundary:** `packages/core/src/managed-workflow-orchestration/`.
**Public facade:** `ManagedWorkflowOrchestrationFacade`.

## 1. Purpose

`Managed Workflow Orchestration` is the Core-owned cluster that replaced the retired generated-script/post-turn managed orchestration for technical Documentation Tree stages.

The cluster owns lifecycle decisions for:

- `Diagram Modules`;
- `Application Skeleton`;
- `Quality Gates Baseline`;
- future managed documentation steps registered through the same step-controller contract.

The accepted runtime baseline covers end-to-end managed execution for the three current technical trunk steps. Future managed documentation steps must extend the same controller/facade contract instead of adding client-owned continuation logic or reviving retired generated child-plan behavior.

## Client Projection Boundary

Managed Workflow Orchestration is Core-owned. Project Manager, VS Code UI surfaces, future mobile clients, and any future Wi-Fi/remote clients are replaceable projections over Core state; they are not workflow authority.

Clients may submit raw user intent and render Core-owned snapshots, but they must never own or infer managed workflow truth: stage phase, active microtask, expected commit, prompt/template selection, source-artifact selection, artifact validity, gating decisions, localization target for Core/system messages, provider continuation policy, managed state, or Git commit lifecycle.

Every Type A, Type B, and Persistent Return managed flow must continue with all clients closed until Core explicitly opens a user review, revision, acceptance, or configuration gate. If a managed step depends on an open Project Manager window to advance before such a user gate, the step contract is invalid and the defect belongs in Core orchestration.

## Prompt, Artifact, And Repair Authority

Managed Workflow Orchestration owns the executable artifact contract for managed steps. The first provider prompt and every Core-authored repair prompt must include the full text of all required templates, field references, examples, schema fragments, and authoring rules. A prompt that names a template path without embedding the required text is incomplete; provider agents must not have to inspect `.codeai-hub/templates`, parser implementations, Project Manager code, tests, or internal docs to discover the artifact format.

The canonical parser/validator/read-model contract for a managed artifact belongs in Core or a provider-neutral shared contract module consumed by Core. Project Manager, VS Code surfaces, future mobile clients, and Wi-Fi/web clients may render Core-owned parse output and diagnostics, but they must not maintain a second parser truth that can accept/reject artifacts differently from Core. If a UI needs graph nodes, artifact cards, or validation messages, Core must expose the parsed projection or the exact canonical diagnostics that produced it.

All artifact repair entrypoints are Core-owned. A client button such as "Fix with agent" may submit only raw repair intent and user-visible diagnostic context. Core must resolve the failing artifact, create or advance the managed stage-plan microtask with a paired Git Commit line, dispatch the provider-visible repair prompt, validate the next turn through the canonical parser, and commit accepted or safe rejected attempts with real hashes. Direct client-built repair prompts sent to provider sessions bypass the managed lifecycle and are forbidden.

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

## 7. Accepted Runtime Boundary

The active implementation must provide the complete managed lifecycle:

- technical managed stages route through `ManagedWorkflowOrchestrationFacade`;
- the registered controller for the selected stage is visible in Core workflow-state and client projections;
- the first prompt embeds all required source artifacts, templates, field references, examples, schema fragments, and authoring rules as provider-visible text;
- Core validates every provider output through the canonical parser/validator and writes diagnostics as Core-owned feedback;
- every repair, revision, acceptance, materialization, integration, and persistent-return transition creates or advances a concrete stage-plan microtask with a paired `Git Commit:` item;
- managed Git hygiene keeps the workspace clean at stage boundaries, including pre-stage cleanup and ignored/generated OS file handling;
- completed upstream stage LEDs remain green after downstream blockers, while active downstream stages render in progress from Core state;
- no old accept-contract, generated child-plan, hidden post-turn dispatch, direct PM repair prompt, or pseudo-hash behavior returns.

The historical preview-only release boundary is retired and must not be used as active guidance.

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
