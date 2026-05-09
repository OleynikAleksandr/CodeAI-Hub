# Managed Documentation Commit Ownership

## Status

Accepted for all managed workflow stages before code implementation starts.

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
- Core: validate artifacts, validate dirty Git ownership, stage only allowed paths, commit through the managed plan transaction, re-check clean Git, update plan state, and unlock the next step.

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

If any condition fails, Core must not commit. It sends feedback to the owning agent session with the concrete blocker.

The implemented runtime path is provider-event driven. Core starts managed documentation acceptance only from the post-turn pipeline after the provider emits a terminal event and Core has flushed already received assistant/dialog messages. A green `Diagram Modules`, `Application Skeleton`, or `Quality Gates Baseline` validator may trigger the managed documentation commit transaction inside that post-turn boundary. After a successful transaction, Core reads the child plan, Git state, and stage progress again and uses that post-commit snapshot for unlock, continuation, and feedback decisions.

Read-model paths are explicitly side-effect free. `workflow-state`, PM sidebar/status/card refreshes, artifact panes, and polling observers can return snapshots and diagnostics, but they must not send provider-visible repair/continuation messages and must not run managed commits.

`Diagram Modules` has an additional subturn invariant: Core validates and commits exactly one active `expectedArtifact` at a time. `product-parts.index.md` is accepted before any `product-parts/<part-id>.md` turn starts. Each Product Part turn is accepted, repaired, or held pending independently; pending is a continuation state, not an error. Repair feedback must name the current `expectedArtifactPath`, validator, snapshot head, checked time, and exact diagnostics. Core sends the next Product Part instruction only after the previous artifact is accepted and the managed commit is complete.

`Application Skeleton` and `Quality Gates Baseline` follow the same managed-task shape even when their provider work is physically smaller than Diagram Modules. The first accepted draft artifact is its own microtask and commit. Any later materialized or integrated target group is a separate Core-owned task/commit boundary, derived from accepted runtime artifacts instead of hardcoded product names. Core must not advance or unlock a downstream stage from an aggregate provider turn until the active child-plan task has been validated, committed, and re-read from the clean post-commit state.

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
- `Quality Gates Baseline`: `.codeai-hub/<workspaceSlug>/quality_gates/**`, gate scripts, lifecycle hook files, and package manifest files explicitly required by the quality-gates contract.
- Development Tree documentation node: only that node's draft/specification/contract paths and the Core-owned node lifecycle metadata required for that node.

Any dirty file outside the active stage allowlist is a hard blocker.

Out-of-owner dirty files are reported as Core acceptance feedback, not as a shell instruction for the provider. The repair request must name the dirty paths and keep the next stage blocked until the user or owning workflow resolves the unrelated changes.

## Agent Prompt Rule

Managed documentation agents must not be required to run `npm run plan:commit`.

Their prompt may ask them to finish with a content-level readiness statement, but the durable acceptance statement belongs to Core after the commit transaction succeeds.

Core-owned prompts for managed stages are context bundles, not link lists. When Core has the source text, it embeds that text in the initial, repair, continuation, and rollover prompt. Provider-visible links to input artifacts are allowed only for explicitly marked fallback cases such as truncated or stale bundles. Output target paths remain visible because agents need them to write the active artifact.

For `Diagram Modules`, Core owns the automatic Phase 1 conversation until all Product Parts declared in `product-parts.index.md` have been accepted and committed one at a time. After that, Core stops automatic continuation and opens the user-owned review phase; every later user correction is a separate Core-tracked microtask and commit boundary.

Provider-specific shell capability can be useful for diagnostics, but it is not part of the managed documentation lifecycle contract.

## User Workflow

The user should see the result as a stable state machine:

1. User starts a managed documentation card.
2. The agent creates or revises artifacts.
3. Core validates and commits accepted owned changes.
4. Core either unlocks the next step, sends the next Core-owned continuation turn, or sends actionable repair feedback.

The user should not need to manually run `npm run plan:commit` for managed documentation stages.
