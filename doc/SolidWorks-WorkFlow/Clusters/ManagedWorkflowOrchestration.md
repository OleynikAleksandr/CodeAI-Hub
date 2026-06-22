# Managed Workflow Orchestration — Cluster (SSOT)

**Status:** Active runtime boundary for managed technical trunk steps.
**Created:** 2026-05-15.
**Updated:** 2026-06-05.
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

User-review acceptance is submitted through a client-rendered inline button on the Core/system `managed-workflow-user-review` dialog card. The button label and placement are UI projection details; the click sends a Core-owned review action scoped to the active review message id. It is not an ordinary provider-visible user message, must be idempotent for the current gate, and must reject stale or already-closed review cards without dispatching a provider turn. Clients must not mark the stage accepted, open materialization/integration, write `### Stream: User Return And Revisions`, or publish a green marker on their own.

The same Core/system card tag is also used for provider-direct preliminary review gates on `Description` and `Virtual Simulation`. Those preliminary steps are not managed technical stage-plan flows: Core must dispatch startup prompts and user revision text directly to the provider, then append the review card after each provider turn. The inline `Подтверждаю` button is the expected acceptance surface; if the user answers the agent's questions instead, Core routes that text to the provider and shows a fresh review card after the next completed turn. Only button acceptance or an equivalent short acceptance command while the gate is open may advance the preliminary step and let Project Manager activate the next step card.

Every Type A, Type B, and Persistent Return managed flow must continue with all clients closed until Core explicitly opens a user review, revision, acceptance, or configuration gate. If a managed step depends on an open Project Manager window to advance before such a user gate, the step contract is invalid and the defect belongs in Core orchestration.

Provider terminal events are not sufficient UI unlock signals for managed workflow turns. On `turn_completed`, Core must persist provider messages, run managed post-turn validation/arbitration, perform any required commit or cleanup effect, and then either open a current review gate or settle the turn before Project Manager input is considered idle. This covers Claude-style pauses where the provider is done but Core-owned validation is still running.

## Stage Marker And Terminal Git Boundary

Core owns the trunk step marker state for every managed technical stage. `Diagram Modules`, `Application Skeleton`, `Quality Gates Baseline`, and future registered managed documentation steps use this contract:

- `idle` / gray until Core starts the continuity step session;
- `in_progress` / yellow from the first provider prompt or equivalent Core session-start effect through review, repair, acceptance, materialization, and integration;
- `completed` / green only after Core reaches the terminal `### Stream: User Return And Revisions` boundary, records the stage in the managed workspace `completedStages` ledger, and passes the terminal clean-Git checkpoint.

For `Application Skeleton`, a successful Core-owned materialization validation is the terminal managed boundary. The marker stays `in_progress` during draft review, acceptance, materialization, validation, and commit, then turns `completed` when Core records the materialization commit, opens persistent user return, and activates `Quality Gates Baseline`. There is no second post-materialization user-review gate because the user already accepted the contract before materialization.

For `Quality Gates Baseline`, integration is not the terminal managed boundary. The marker stays `in_progress` through draft/review, acceptance, accepted-only integration, formal gate verification, and the persistent user-return transition. It turns `completed` only after Core validates `verificationState: "verified"`, recorded command evidence for required gate scripts and hooks, opens the persistent return boundary, writes the completed-stage ledger, and passes the terminal clean-Git checkpoint.

Current review artifacts dominate stale invalid projection. If `Application Skeleton` or `Quality Gates Baseline` has a current Core review gate/progress artifact, the stage must project `in_progress`/yellow even when an older in-memory invalidation event still exists. Invalid/blocked state may surface diagnostics, but it must not repaint an active user-review stage red unless Core has actually closed or rejected that current review gate.

Artifact presence is not completion truth. `aggregateReady`, `reviewReady`, Markdown/JSON sidecars, local Project Manager parser results, or generated root files cannot promote a managed trunk marker to green. Clients render the Core workflow-state snapshot only.

At the terminal user-return boundary, Core checks the Git tree before publishing completion. Classified managed residue, including stage-owned artifacts, Core runtime metadata, quality-gate/formatter residue, and managed continuity files, is committed by Core through the managed commit transaction. Core runtime metadata includes the managed workspace ledger, stage todo-plans, continuity chains, `workflow/state.json`, and non-semantic step state such as `description-step.json`; it does not include semantic artifacts such as `Final_Description.md` unless the current step explicitly owns that artifact. Unclassified residue becomes a Core-owned blocker: Core must not write the completed-stage ledger, publish a green marker, or transition to the next stage until the user resolves the dirty tree through a Core command. Provider agents and Project Manager never run managed Git commits directly.

Local runtime telemetry is not a managed artifact. Files under `.codeai-hub/state/`, including task timer state, must be ignored by generated workspaces and must not be committed as workflow history. Before a managed step reaches the terminal clean-Git checkpoint, Core ensures `.gitignore` contains `.codeai-hub/state/`; that `.gitignore` update is classified Core metadata and may be committed by Core together with other terminal residue. The terminal checkpoint is successful only when a follow-up Git status has no committable or unclassified residue.

## Prompt, Artifact, And Repair Authority

Managed Workflow Orchestration owns the executable artifact contract for managed steps. The first provider prompt and every Core-authored repair prompt must include the full text of all required templates, field references, examples, schema fragments, and authoring rules. A prompt that names a template path without embedding the required text is incomplete; provider agents must not have to inspect `.codeai-hub/templates`, parser implementations, Project Manager code, tests, or internal docs to discover the artifact format.

The canonical parser/validator/read-model contract for a managed artifact belongs in Core or a provider-neutral shared contract module consumed by Core. Project Manager, VS Code surfaces, future mobile clients, and Wi-Fi/web clients may render Core-owned parse output and diagnostics, but they must not maintain a second parser truth that can accept/reject artifacts differently from Core. If a UI needs graph nodes, artifact cards, or validation messages, Core must expose the parsed projection or the exact canonical diagnostics that produced it.

All artifact repair entrypoints are Core-owned. A client button such as "Fix with agent" may submit only raw repair intent and user-visible diagnostic context. Core must resolve the failing artifact, create or advance the managed stage-plan microtask with a paired Git Commit line, dispatch the provider-visible repair prompt, validate the next turn through the canonical parser, and commit accepted or safe rejected attempts with real hashes. Direct client-built repair prompts sent to provider sessions bypass the managed lifecycle and are forbidden.

Managed provider capability parity is outcome-based, not identical-tool based. Core prepares the managed stage workspace before each provider turn; CLI providers may receive a narrow shell capability for local filesystem recovery, while native providers may satisfy the same artifact contract through a Core-owned workflow tool that creates parent directories and writes `.codeai-hub/...` artifacts.

## 2. Facade Contract

External code may depend only on `ManagedWorkflowOrchestrationFacade` and exported public contract types.

The facade owns these ingress points:

- managed step start/resume events from `remote-bridge`;
- user messages received while a managed review phase is active;
- provider turn completion/failure events;
- recovery timer/restart/session-restored events;
- workflow-state read-model projection requests.

The facade returns typed decisions/effects. It does not let callers mutate managed state directly.

### Application Skeleton Foundation Gate

Application Skeleton materialization is valid only when the provider has produced a real project foundation, not a folder-only outline. Core validates the accepted map and filesystem evidence before downstream stages may continue:

- all unresolved `openQuestions` are closed before materialization;
- the root package manifest, deterministic package-manager lockfile, required scripts, declared config files, and first-wave entrypoints exist;
- first-wave entrypoints are production paths, never `.codeai-hub` or dependency cache paths;
- product-part, cluster, module, `codePath`, and `materializedPath` checks remain part of the same materialization gate.

Quality Gates Baseline and later implementation stages may depend on this foundation evidence instead of re-negotiating the Application Skeleton environment.

Application Skeleton draft validation distinguishes actionable foundation requirements from descriptive metadata. Core may warn or carry forward descriptive fields such as repository-shape prose/objects, but it must not block the draft solely because a descriptive field has a different representation. Hard blockers stay limited to data that downstream materialization and quality validation need to act on: open questions, package manager/install commands, stack decisions, required scripts/config files, first-wave entrypoints, and real filesystem/materialization evidence.

The boundary is strict: Application Skeleton owns stack/package/workspace decisions and the first installable project foundation, while Quality Gates Baseline owns research, selection, and integration of quality tooling after that foundation is available. Quality Gates must not be used as a repair layer for an incomplete Application Skeleton foundation.

Quality Gates starts from the materialized project foundation, not from a fixed product example. The agent/Core loop must research current tooling for the detected stack, classify proposed gates as required, advisory, deferred, or rejected, and only materialize accepted required gates that are executable for the current workspace. Required gates cannot remain placeholders: Core must validate concrete command evidence, lifecycle hook/adapter evidence, unresolved-item disposition, and formal verification evidence before Development Tree unlock.

Validated Application Skeleton materialization completes the managed stage. After Core commits a valid materialization attempt, Core publishes the terminal persistent return boundary and unlocks/activates `Quality Gates Baseline` automatically. If validation fails with actionable scaffold or contract diagnostics, Core keeps the input gate closed and dispatches a repair prompt to the agent; draft and materialization repair task ids both count toward the shared managed repair limit, and after three failed repair attempts Core opens a user review gate instead of continuing the agent loop. Only unrecoverable Core boundary failures are surfaced to the user as blockers.

Quality Gates integration has an additional artifact consistency gate. In the integration phase, `quality-gates.json` is the machine-readable source of truth and `quality-gates.md` is a user-facing review artifact. Core must reject an integrated Quality Gates result when any required gate remains marked `not_integrated` in JSON, when required package scripts or lifecycle hook calls are missing, or when declared `integratedPaths` do not exist in the workspace. Draft/proposal phases may describe planned or not-yet-integrated gates, and integration only requires Markdown to remain present and headed as `# Quality Gates Baseline`; machine state is validated from JSON, package scripts, hooks, and filesystem evidence.

Quality Gates formal verification is the post-integration completion gate. After the integration commit, Core opens a dedicated verification phase instead of persistent return. The agent must resolve hook `npm run` commands against `package.json`, build one ordered verification plan, execute or formally check the expected gate commands (`qg:before-module-execution`, `qg:before-commit`, `qg:before-push`, `qg:all`, `sh .husky/pre-commit`, `sh .husky/pre-push`) sequentially in one workspace, and treat dependency restore/install/clean/delete commands plus hooks or aggregates that may invoke them as exclusive workspace mutation commands. It must record `verificationState: "verified"` plus `verificationEvidence.executionMode: "sequential"` and ordered per-command evidence (`sequence`, `command`, `status: "passed"`, `exitCode: 0`) in `quality-gates.json`. Core validates that evidence before persistent return opens or Development Tree becomes startable.

Quality Gates draft/review phases are pre-acceptance and must not leave integration residue. Before Core records a draft/review managed commit, it restores or cleans prohibited integration paths (`package.json`, package-manager lockfiles, `.husky/pre-commit`, `.husky/pre-push`, and `scripts/quality-gates/**`). Those files become valid managed output only after the user accepts the draft contract and Core enters the integration phase.

The generated project foundation must also separate tracked managed artifacts from local runtime state. `.gitignore` must cover install output, build output, and `.codeai-hub/state/` so Project Manager/Core telemetry cannot dirty Git after a step has completed.

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
- Quality Gates integration validates artifact consistency across JSON, package scripts, lifecycle hooks, and declared integration paths before formal verification opens; Markdown remains a user-facing review artifact and is not terminal integration state;
- Quality Gates formal verification validates `verificationState: "verified"` plus sequential command evidence (`verificationEvidence.executionMode: "sequential"` and ordered command entries) before persistent return opens or Development Tree bootstrap becomes startable;
- every repair, revision, acceptance, materialization, integration, and persistent-return transition creates or advances a concrete stage-plan microtask with a paired `Git Commit:` item;
- managed Git hygiene keeps the workspace clean at stage boundaries, including pre-stage cleanup, terminal dirty-tree classification, `.codeai-hub/state/` ignore enforcement, Core commits for classified residue, and blockers for unclassified residue;
- completed upstream stage LEDs remain green after downstream blockers, while active downstream stages render in progress from Core state and only terminal `User Return And Revisions` completion can publish a green managed marker;
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
