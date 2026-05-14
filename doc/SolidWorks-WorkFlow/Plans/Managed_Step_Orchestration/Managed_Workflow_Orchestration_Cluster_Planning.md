# Managed Workflow Orchestration Cluster Planning

**Status:** draft planning source.
**Created:** 2026-05-14.
**Owner:** Oleksandr + Codex.
**Scope:** redesign the Core-managed documentation step orchestration before more point fixes are attempted.

## 1. Why This Planning Exists

The current managed workflow implementation has reached the point where isolated fixes are no longer reliable.

Observed failures repeat across providers and steps:

- Core writes synthetic commit markers such as `included-in-commit` before a real Git commit exists.
- A managed step can look visually complete while `workspace.plan.md`, the child plan, and Git history still say it is incomplete.
- Quality Gates can reach `integrated: true` without the Phase 4 user-return anchor being created.
- Provider-visible feedback can mix actionable rejection with wait-only instructions.
- User acceptance phrases can be lost, routed to the provider, or treated differently per step.
- Session restore can open a start card instead of the existing workflow session.
- Recovery behavior is distributed across post-turn handlers, generated shell scripts, read-model code, and provider dispatch.

The common cause is architectural: managed step orchestration is not implemented as one explicit state machine. It is currently spread across generated `plan-cli.mjs`, plan mutators, progress readers, post-turn arbitration, acceptance runners, feedback builders, provider dispatch, continuity restore, and UI read-model projection.

The new scope must start from the module/cluster architecture, then define phases and transition scenarios, and only after that rewrite implementation.

## 2. Current As-Is Shape

Today the logical "Core orchestrator" is not one workflow module.

Main code areas:

- `packages/core/src/orchestrator/core-orchestrator.ts` starts the Core service but does not own managed workflow semantics.
- `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts` starts workflow sessions and ensures managed workspace lifecycle.
- `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.ts` installs generated workspace scripts and hooks.
- `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts` generates `scripts/plan-orchestrator/plan-cli.mjs`.
- `packages/core/src/managed-workspace/managed-*-plan-mutator.ts` injects step-specific task pairs and phase anchors.
- `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts` runs post-turn arbitration.
- `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts` tries Core-owned commits.
- `packages/core/src/remote-bridge/handlers/*-progress.ts` derives stage phase/progress from artifacts and workspace files.
- `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts` sends provider-visible feedback.
- `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` routes user messages and typed acceptance.

Current data sources:

- `session.stage`;
- `doc/TODO/workspace.plan.md`;
- `doc/TODO/stages/<stage>/todo-plan.md`;
- `.codeai-hub/<workspaceSlug>/<stage>/**` artifacts;
- Git status and Git history;
- continuity chain;
- provider terminal events;
- UI workflow-state snapshot.

Current risk:

No single module owns the complete transition from:

`provider turn completed` -> `validate` -> `commit` -> `advance child plan` -> `update workspace ledger` -> `send next prompt or open user phase`.

## 3. Target Cluster

Introduce a dedicated Core Runtime cluster:

`Managed Workflow Orchestration`

This cluster owns managed documentation steps from `Diagram Modules` onward and exposes one canonical ingress/egress for state transitions.

Target modules:

1. `ManagedWorkflowOrchestrationFacade`
   - public entry point for managed step orchestration;
   - receives typed events from session/runtime boundaries;
   - returns typed decisions and effects;
   - hides implementation modules from `remote-bridge`.

2. `ManagedWorkflowStepRegistry`
   - canonical registry of managed steps;
   - maps `stageId` to step controller, artifact contract, phase table, owned paths, prompts, validators, and recovery policy;
   - prevents local drift between Diagram Modules, Application Skeleton, and Quality Gates.

3. `ManagedWorkflowStateMachine`
   - pure transition engine;
   - input: current snapshot + event;
   - output: next state + effect list;
   - no file writes, no provider calls, no Git commands.

4. `ManagedWorkflowSnapshotReader`
   - builds one canonical snapshot from plan, workspace ledger, artifacts, Git, continuity, session state, and provider turn state;
   - detects impossible mixed states, for example `integrated: true` with no integration commit.

5. `ManagedWorkflowEffectExecutor`
   - executes state-machine effects in deterministic order;
   - calls plan mutation, Git transaction, provider message gateway, UI event emitter, and continuity services;
   - records every completed effect.

6. `ManagedWorkflowCommitTransaction`
   - owns atomic Git commit semantics;
   - never mutates child plan to `DONE` until the real Git commit succeeds;
   - never writes pseudo-hashes to `lastRecordedCommit`;
   - rolls back or marks blocked when commit fails.

7. `ManagedWorkflowPlanStore`
   - reads/writes child plans and workspace ledger;
   - replaces generated-script scenario logic;
   - stores only real Git hashes or explicit non-commit dispositions.

8. `ManagedWorkflowProviderGateway`
   - provider-neutral dispatch of Core messages to Claude/Codex/Gemini sessions;
   - guarantees Core messages are visible in session history/audit as designed;
   - normalizes provider turn completion and failure events.

9. `ManagedWorkflowUserIntentClassifier`
   - classifies user messages inside user-owned review phases;
   - distinguishes acceptance, revision request, question/discussion, and unrelated text;
   - supports natural confirmations such as `подтверждаю`, `окей`, `да`, `давай дальше`, `все хорошо`, `принимаю`, `согласен`, and English equivalents without scattering regexes through dispatch code.

10. `ManagedWorkflowRecoveryArbiter`
    - decides what to do when orchestration appears stuck;
    - handles network interruption, provider failure, missing terminal event, stale binding, rollover failure, partial commit state, user ambiguity, and invalid provider output;
    - emits typed recovery decisions, not direct ad hoc mutations.

11. `ManagedWorkflowReadModelProjector`
    - projects canonical state to PM/sidebar/artifact panes;
    - read-only;
    - cannot send provider messages or run commits.

12. `ManagedWorkflowAuditLog`
    - records typed Core decisions, effects, blockers, recovery actions, and provider-visible messages;
    - makes every retry/rejection/recovery reconstructable from durable evidence.

## 4. Target Runtime Flow

All managed step decisions follow one path:

```text
event received
  -> build canonical snapshot
  -> classify event
  -> run pure state-machine transition
  -> execute ordered effects
  -> re-read snapshot
  -> project read model
  -> emit exactly one next visible decision
```

Important rule:

Plan advancement and workspace ledger updates happen only after the effect they describe is complete.

Examples:

- A task becomes `DONE` only after its real commit succeeds.
- A `Git Commit:` item receives a real hash only after `git rev-parse HEAD`.
- `lastRecordedCommit` must be a real Git hash, `TBD`, or `null`; never `included-in-commit`.
- Phase 4 user-return anchors are inserted only after the final accepted materialization/integration commit.
- A blocked Core-owned commit does not create provider repair work unless the provider can actually fix the cause.

## 5. Managed Step Controllers

Each managed step becomes a module behind a common interface.

### 5.1 Diagram Modules Step Controller

Owns:

- product-parts index;
- per Product Part artifacts;
- product-part sequence;
- repair task injection;
- final user-return phase.

Required phases:

1. Product Part index draft.
2. Product Part artifact generation loop.
3. Persistent user-return revisions.

Special behavior:

- one active expected Product Part at a time;
- no downstream step unlock until all planned Product Parts are accepted and committed;
- final accepted Product Part opens the user-return anchor.

### 5.2 Application Skeleton Step Controller

Owns:

- draft contract;
- user-led contract review;
- acceptance transition;
- filesystem materialization;
- post-completion user-return revisions.

Required phases:

1. Core-gated draft contract.
2. User-led review.
3. Accepted-only materialization.
4. Persistent user-return revisions.

Special behavior:

- user acceptance must be a Core command, not a provider message;
- materialization prompt starts only after acceptance commit;
- Phase 4 opens only after materialization commit.

### 5.3 Quality Gates Step Controller

Owns:

- draft contract;
- user-led contract review;
- acceptance transition;
- Quality Gates integration;
- lifecycle hook wiring;
- post-completion user-return revisions.

Required phases:

1. Core-gated draft contract.
2. User-led review.
3. Accepted-only integration.
4. Persistent user-return revisions.

Special behavior:

- `.husky/pre-commit` and `.husky/pre-push` are agent-owned content during Phase 3 integration, but Core owns validation and commit;
- `integrated: true` is not enough to complete the step; the integration commit and workspace ledger must exist;
- Phase 4 must open after any final validated `feat: integrate quality gates baseline` commit, including split integration repair commits.

## 6. Event Model

All transitions should be driven by typed events.

Core events:

- `STEP_STARTED`;
- `PROVIDER_TURN_STARTED`;
- `PROVIDER_TURN_COMPLETED`;
- `PROVIDER_TURN_FAILED`;
- `USER_MESSAGE_RECEIVED`;
- `USER_INTENT_ACCEPTED`;
- `USER_INTENT_REVISION_REQUESTED`;
- `USER_INTENT_DISCUSSION`;
- `VALIDATION_PASSED`;
- `VALIDATION_FAILED`;
- `COMMIT_REQUESTED`;
- `COMMIT_SUCCEEDED`;
- `COMMIT_BLOCKED`;
- `COMMIT_FAILED`;
- `ROLLOVER_REQUIRED`;
- `ROLLOVER_COMPLETED`;
- `SESSION_RESTORED`;
- `RECOVERY_TIMER_ELAPSED`;
- `WORKSPACE_DIRTY_CHANGED`.

Events must include:

- workspace slug/root;
- stage id;
- session id/dialog id when relevant;
- provider id when relevant;
- current phase;
- current task id;
- correlation id;
- timestamp.

## 7. Phase Scenario Matrix

Every phase must explicitly define behavior for these scenarios.

### 7.1 Agent Turn Completed

Cases:

- artifacts valid;
- artifacts invalid but repairable by provider;
- artifacts invalid because Core-owned boundary is blocked;
- no relevant artifact diff;
- artifact diff outside owned scope;
- provider changed files from another stage;
- provider marked lifecycle flags too early.

Expected outputs:

- commit accepted artifacts;
- inject repair task before provider-visible repair feedback;
- block for user/Core if provider cannot act;
- write failed-attempt evidence if needed;
- no generic wait-only provider instruction for actionable provider errors.

### 7.2 User Message Received In Review Phase

Cases:

- clear acceptance;
- natural acceptance phrase;
- correction/revision request;
- question/discussion;
- ambiguous message;
- negated acceptance.

Expected outputs:

- acceptance command;
- revision task pair;
- discussion turn to provider only if phase permits discussion;
- clarification prompt to user;
- no accidental provider dispatch for acceptance commands.

### 7.3 Commit Boundary

Cases:

- clean commit success;
- dirty files outside active stage allowlist;
- staged files outside active microtask;
- commit hook failure;
- plan mutation failure;
- ledger commit failure;
- no staged changes;
- partial plan mutation already exists.

Expected outputs:

- atomic success with real hash;
- blocked state with exact blocker owner;
- rollback partial markers;
- no `included-in-commit` persistence;
- no next task or Phase 4 before commit success.

### 7.4 Provider Or Network Failure

Cases:

- stream interruption;
- no terminal event;
- stale provider binding;
- provider session missing after restart;
- rollover materialization missing;
- Core message not visible in session log;
- provider resumes with wrong context.

Expected outputs:

- retry same provider turn if safe;
- rebind/resume provider session;
- create rollover continuation envelope;
- surface user-visible blocked state when automatic recovery is unsafe;
- durable audit record.

### 7.5 Post-Completion User Return

Cases:

- user opens completed step;
- user asks for revision;
- user asks a question only;
- user confirms no changes;
- user revision affects downstream stages.

Expected outputs:

- user-return anchor stays open;
- concrete `revisionN` task pair only when actual revision work is requested;
- discussion does not create fake commits;
- downstream OUTDATED propagation is explicit and durable.

## 8. Recovery Arbiter

`ManagedWorkflowRecoveryArbiter` is a required module, not a later enhancement.

It receives the canonical snapshot and decides whether the system is in:

- normal wait for user;
- normal wait for provider;
- normal Core commit in progress;
- recoverable provider/session failure;
- recoverable partial Core transaction;
- user-actionable blocker;
- unrecoverable panic stop.

Example typed decisions:

```ts
type ManagedWorkflowRecoveryDecision =
  | { kind: "wait_user"; reason: string }
  | { kind: "wait_provider"; reason: string }
  | { kind: "retry_provider_turn"; reason: string }
  | { kind: "resume_or_rebind_session"; sessionId: string }
  | { kind: "recover_rollover"; targetSessionId: string }
  | { kind: "rollback_partial_plan_mutation"; diagnostics: string[] }
  | { kind: "finalize_pending_commit"; expectedCommit: string }
  | { kind: "open_repair_task"; diagnostics: string[] }
  | { kind: "block_for_user"; blockers: string[] }
  | { kind: "panic_stop"; diagnostics: string[] };
```

Recovery arbiter must never silently mutate plans. It returns a decision; the effect executor performs the action and records it.

## 9. Provider Factor

Provider differences must be isolated below the orchestration state machine.

The state machine should not know that the provider is Claude, Codex, or Gemini except through normalized capabilities:

- supports shell tools;
- can write files;
- streams terminal events reliably;
- supports resume by provider session id;
- requires post-stop resume;
- has small context / rollover sensitivity;
- emits multi-segment assistant messages;
- supports hidden/internal messages.

Provider-specific behavior belongs in:

- provider adapters;
- provider gateway normalization;
- session continuity/rebind logic;
- prompt envelope compatibility.

Managed step logic should consume only normalized events:

- provider turn completed;
- provider turn failed;
- provider output persisted;
- provider session stale;
- rollover required;
- rollover completed.

## 10. Hard Invariants

These invariants must be enforced by code and tests.

1. `lastRecordedCommit` is never `included-in-commit`.
2. `Git Commit` hash is either `TBD`, a real Git hash, or an explicit non-commit disposition such as `not-created-user-accepted-without-review-revision`.
3. A commit task becomes `DONE` only after the real commit exists.
4. Plan mutation that describes a commit happens after commit success, or is rolled back on failure.
5. No provider-visible repair message is sent before the matching repair task pair exists.
6. Core-owned blockers are not sent as provider repair instructions.
7. User acceptance commands are not sent to the provider.
8. User revision requests create revision task pairs before provider work.
9. Phase 4 user-return anchor opens only after final materialization/integration commit.
10. UI/read-model code must not run commits, send provider messages, or mutate plans.
11. Every Core message to the provider is visible in the managed audit log and, when intended, in the session feed.
12. Session restore must prefer history-backed continuity over a new start card.
13. Repeated content-readiness notes cannot create repeated empty `taskN` items without a commit.
14. Dirty files outside active stage allowlist block the Core transaction without advancing the child plan.
15. Rollover cannot drop the current managed context, user acceptance command, or active task.

## 11. Implementation Strategy

Do not delete everything at once.

Recommended migration order:

1. Freeze new point fixes except emergency blockers.
2. Add the planning and state-machine design documents.
3. Introduce pure types: stage, phase, event, snapshot, decision, effect.
4. Implement `ManagedWorkflowSnapshotReader`.
5. Implement `ManagedWorkflowStateMachine` with no side effects.
6. Implement `ManagedWorkflowCommitTransaction` atomicity and remove `included-in-commit` persistence.
7. Move Application Skeleton onto the new state machine first as the reference step.
8. Move Quality Gates onto the same state machine.
9. Move Diagram Modules onto the same state machine.
10. Replace generated `plan-cli.mjs` scenario logic with `ManagedWorkflowPlanStore`.
11. Add `ManagedWorkflowRecoveryArbiter`.
12. Replace scattered provider feedback/continuation dispatch with `ManagedWorkflowProviderGateway`.
13. Convert PM workflow-state paths to read-only projection.
14. Remove legacy duplicated mutators after parity tests pass.

## 12. Required Regression Matrix

Minimum scenario tests:

- user accepts immediately;
- user writes `окей` instead of `подтверждаю`;
- user gives one revision then accepts;
- user gives two revisions then accepts;
- provider creates valid draft;
- provider creates invalid draft;
- provider sets accepted/integrated too early;
- provider writes files outside stage scope;
- Core commit blocked by unrelated dirty file;
- Git commit fails after staging;
- plan mutation fails;
- ledger commit fails;
- repeated content-ready after blocked commit;
- `included-in-commit` cannot persist;
- Phase 4 opens after Application Skeleton materialization;
- Phase 4 opens after Quality Gates integration;
- Diagram Modules final part opens user-return;
- Core message appears in session/audit;
- rollover before user acceptance;
- rollover after user acceptance before integration prompt;
- rollover during provider integration;
- restart opens existing session, not start card;
- Claude, Codex, and Gemini provider paths produce the same managed decisions.

## 13. Open Design Decisions

1. Should review-anchor tasks use `SKIPPED` instead of synthetic non-commit hashes?
2. Should `doc/TODO/stages/<stage>/todo-plan.md` remain the execution state, or should a structured `.json` state become the machine source and Markdown become projection?
3. Should managed workspace scripts continue to exist in user workspaces, or should Core own all orchestration without generated scenario scripts?
4. How much user intent classification should be rule-based versus model-assisted?
5. Should recovery decisions be stored in `workspace.plan.md`, a separate audit log, or both?
6. How should downstream OUTDATED propagation be represented after post-completion user-return revisions?

## 14. Proposed Acceptance Criteria For This Planning Scope

This planning scope is accepted when:

- the target cluster/modules are agreed;
- the state/event/effect model is agreed;
- each managed step has a phase scenario table;
- recovery arbiter responsibilities are agreed;
- the implementation migration plan is sliced into microtasks;
- no code rewrite starts before the state machine contract is reviewed.

