# Managed Documentation Commit Ownership

## Status

Accepted for all managed workflow stages before code implementation starts.

**2026-05-13 accepted lifecycle reference:** release `1.2.249` closes the managed orchestration retrofit for `Diagram Modules`, `Application Skeleton`, and `Quality Gates Baseline`. Quality Gates Baseline now follows the same durable shape as Application Skeleton: Core-gated draft, user-led review, Core-owned acceptance commit, Core-led integration, and a persistent post-completion user-return phase. Core owns: `docs: draft quality gates contract` (Phase 1), `docs: revise quality gates contract - revision N` (Phase 2 review), `docs: accept quality gates contract` (Phase 2 acceptance), `docs: repair quality gates <phase> attempt N` (any phase repair), `feat: integrate quality gates baseline` (Phase 3, including split integration tasks), and `docs: revise quality gates user return revision N` (Phase 4 post-completion). Agents never run Git directly for any of these messages.

This document does not decide the implementation/code-generation phase. Code commits may reuse the same principle later, but only after a separate design decision for worktrees, branches, ownership manifests, tests, and merge gates.

## Decision

In managed documentation workflow, agents do not own Git transactions.

Agents own only the content of their assigned artifacts. Core owns validation, staging, commit, plan advancement, feedback, and downstream unlock.

This applies from `Diagram Modules` onward for documentation and contract stages, including:

- `Diagram Modules`;
- `Application Skeleton`;
- `Quality Gates Baseline`;
- Development Tree documentation nodes, including Product Part, Cluster, standalone Module, and Module specification/contract drafts;
- any later pre-code documentation or planning stage that writes managed artifacts in the shared workspace.

## Rationale

Managed workflow stability must not depend on provider shell capability.

Some providers can write files but cannot run shell commands such as `npm run plan:commit`. Even when a provider has shell tools, prompt instructions are a weaker guardrail than deterministic Core validation. Core already owns the active task, expected commit message, plan hash recording, downstream gating, and acceptance feedback, so the commit is part of the same state transition.

The stable ownership split is:

- Agent: create or revise owned documentation artifacts.
- Core: validate artifacts, validate dirty Git ownership, create repair/revision task pairs before provider-visible feedback, stage only allowed paths, commit through the managed plan transaction, re-check clean Git, update plan state, and unlock the next step.

## Core Commit Transaction

Core may create a managed documentation commit only when all of these conditions are true:

1. The active child plan is valid and has no debt.
2. The current stage validator is green for the relevant artifacts.
3. `git status --short --untracked-files=all` contains only files owned by the active stage.
4. Core stages only the active stage allowlist, never the whole working tree.
5. The staged file set is rechecked against the same allowlist before commit.
6. The commit message matches the current child plan expected commit.
7. After commit, Core re-runs plan status, stage validation, and Git clean checks.
8. Downstream stages unlock only after the post-commit checks pass.

If any condition fails, Core must not commit the target as accepted. Before it sends feedback to the owning agent session, it must create the next repair microtask and paired `Git Commit:` item in the active child plan. The next agent attempt is then committed either as accepted owned changes or as tracked failed-attempt evidence.

The implemented runtime path is provider-event driven. Core starts managed documentation acceptance only from the post-turn pipeline after the provider emits a terminal event and Core has flushed already received assistant/dialog messages. A green `Diagram Modules`, `Application Skeleton`, or `Quality Gates Baseline` validator may trigger the managed documentation commit transaction inside that post-turn boundary. After a successful transaction, Core reads the child plan, Git state, and stage progress again and uses that post-commit snapshot for unlock, continuation, and feedback decisions.

Read-model paths are explicitly side-effect free. `workflow-state`, PM sidebar/status/card refreshes, artifact panes, and polling observers can return snapshots and diagnostics, but they must not send provider-visible repair/continuation messages and must not run managed commits.

`Diagram Modules` has an additional subturn invariant: Core validates and commits exactly one active `expectedArtifact` at a time. `product-parts.index.md` is accepted before any `product-parts/<part-id>.md` turn starts. Each Product Part turn is accepted, repaired, or held pending independently; pending is a continuation state, not an error. Repair feedback must name the current `expectedArtifactPath`, validator, snapshot head, checked time, and exact diagnostics. Core sends the next Product Part instruction only after the previous artifact is accepted and the managed commit is complete.

`Application Skeleton` and `Quality Gates Baseline` follow the same managed-task shape even when their provider work is physically smaller than Diagram Modules. The first accepted draft artifact is its own microtask and commit. User acceptance is its own Core-owned state transition and commit. Any later materialized or integrated target group is a separate Core-owned task/commit boundary, derived from accepted runtime artifacts instead of hardcoded product names. Core must not advance or unlock a downstream stage from an aggregate provider turn until the active child-plan task has been validated, committed, and re-read from the clean post-commit state.

`Quality Gates Baseline` mirrors `Application Skeleton`: contract draft, user review, acceptance commit, integration commit, and post-completion user-return revisions. The integration prompt can be sent only after the acceptance commit exists. After accepted integration, Core opens a standing user-return revision phase for later gate changes; this phase is not the handoff to Development Tree. If the integration requires more than one managed commit, any validated `quality-gates.phase3.integration.taskN` commit with message `feat: integrate quality gates baseline` may close Phase 3 and open the idle Phase 4 user-return anchor; Core must not create a generic next Phase 3 continuation after final validation.

Repairable acceptance failures are provider-actionable work. Core may reject a managed stage, but it must not combine concrete fix requirements with wait-only instructions such as "do not update" or "wait for Core" when the owning agent can repair owned artifacts. Before such feedback is sent, Core creates the matching repair task pair and either commits the repaired owned diff or tracked failed-attempt evidence.

Every managed rejection is part of Git history. If the agent's repair attempt changes valid owned artifacts, Core commits those changes under the active repair task. If the attempt produces no acceptable artifact diff, Core writes tracked attempt evidence with the target, validation errors, observed dirty owned paths, agent outcome, and next repair direction, then commits that evidence. Repeated failed attempts must not exist only in provider jsonl, ignored runtime folders, or UI transcript.

The transaction is intentionally narrow:

- it resolves the active child plan and expected commit from the managed workspace state;
- it reads dirty Git state with untracked files included;
- it stages only active-stage owned paths;
- it rejects any staged path outside the same owned-path allowlist;
- it invokes `npm run plan:commit -- "<expected commit>"` itself;
- it requires a clean Git tree after the commit before downstream unlock.

Provider sessions are not part of this transaction. They may produce files and report content readiness, but they do not run the plan commit, do not advance the child plan, and do not prove acceptance by shell output.

## Ownership Allowlist Principle

Each managed stage must have an explicit owned-path allowlist.

Examples:

- `Diagram Modules`: `.codeai-hub/<workspaceSlug>/diagram_modules/**`
- `Application Skeleton`: `.codeai-hub/<workspaceSlug>/application_skeleton/**` and the skeleton materialized production paths declared by the accepted map.
- `Quality Gates Baseline`: draft/review owns `.codeai-hub/<workspaceSlug>/quality_gates/**`; integration additionally owns only gate scripts, package manifest files, tool configs, and Core hook-registry output explicitly required by the accepted quality-gates contract.
- Development Tree documentation node: only that node's draft/specification/contract paths and the Core-owned node lifecycle metadata required for that node.

Any dirty file outside the active stage allowlist is a hard blocker.

Out-of-owner dirty files are reported as Core acceptance feedback, not as a shell instruction for the provider. The repair request must name the dirty paths and keep the next stage blocked until the user or owning workflow resolves the unrelated changes.

## Agent Prompt Rule

Managed documentation agents must not be required to run `npm run plan:commit`.

Their prompt may ask them to finish with a content-level readiness statement, but the durable acceptance statement belongs to Core after the commit transaction succeeds. Managed-stage prompts must not ask providers to stage files, run Git commands, run plan commands, or describe a provider-side "before committing" step. Words like "staged artifact" remain valid only as workflow terminology; they must not become an instruction to run `git add`.

Core-owned prompts for managed stages are context bundles, not link lists. When Core has the source text, it embeds that text in the initial, repair, continuation, and rollover prompt. Provider-visible links to input artifacts are allowed only for explicitly marked fallback cases such as truncated or stale bundles. Output target paths remain visible because agents need them to write the active artifact.

Every managed-stage provider prompt must include an explicit managed context preflight. The provider may write artifacts only when the prompt contains a Core-owned `## Managed Workflow Context Bundle` with a Plan Status line such as `activeStage: "diagram_modules"`, `activeStage: "application_skeleton"`, or `activeStage: "quality_gates"` for the current step. If that bundle or active-stage line is absent, the provider must stop before writing files and report a Core preflight failure instead of reading plan files, running `npm run plan:status`, staging files, or committing.

For `Diagram Modules`, Core owns the automatic Phase 1 conversation until all Product Parts declared in `product-parts.index.md` have been accepted and committed one at a time. After that, Core stops automatic continuation and opens the user-owned review phase; every later user correction is a separate Core-tracked microtask and commit boundary.

For `Application Skeleton` and `Quality Gates Baseline`, Core owns the same post-completion user-return boundary after materialization/integration acceptance. User-return turns that request changes create concrete `revisionN` task pairs and commits; discussion-only turns remain in session history.

Provider-specific shell capability can be useful for diagnostics, but it is not part of the managed documentation lifecycle contract.

## User Workflow

The user should see the result as a stable state machine:

1. User starts a managed documentation card.
2. The agent creates or revises artifacts.
3. Core validates and commits accepted owned changes.
4. Core either unlocks the next step, sends the next Core-owned continuation turn, or sends actionable repair feedback.

The user should not need to manually run `npm run plan:commit` for managed documentation stages.
