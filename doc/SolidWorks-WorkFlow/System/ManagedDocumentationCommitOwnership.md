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

## Ownership Allowlist Principle

Each managed stage must have an explicit owned-path allowlist.

Examples:

- `Diagram Modules`: `.codeai-hub/<workspaceSlug>/diagram_modules/**`
- `Application Skeleton`: `.codeai-hub/<workspaceSlug>/application_skeleton/**` and the skeleton materialized production paths declared by the accepted map.
- `Quality Gates Baseline`: `.codeai-hub/<workspaceSlug>/quality_gates/**`, gate scripts, lifecycle hook files, and package manifest files explicitly required by the quality-gates contract.
- Development Tree documentation node: only that node's draft/specification/contract paths and the Core-owned node lifecycle metadata required for that node.

Any dirty file outside the active stage allowlist is a hard blocker.

## Agent Prompt Rule

Managed documentation agents must not be required to run `npm run plan:commit`.

Their prompt may ask them to finish with a content-level readiness statement, but the durable acceptance statement belongs to Core after the commit transaction succeeds.

Provider-specific shell capability can be useful for diagnostics, but it is not part of the managed documentation lifecycle contract.

## User Workflow

The user should see the result as a stable state machine:

1. User starts a managed documentation card.
2. The agent creates or revises artifacts.
3. Core validates and commits accepted owned changes.
4. Core either unlocks the next step or sends actionable feedback.

The user should not need to manually run `npm run plan:commit` for managed documentation stages.

