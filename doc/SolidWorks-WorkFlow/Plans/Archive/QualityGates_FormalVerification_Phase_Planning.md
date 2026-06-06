# Quality Gates Formal Verification Phase Planning

**Status:** Active planning source
**Created:** 2026-06-05
**Owner:** Codex / Core Orchestrator

## Scope

Add a Core-owned formal verification phase to `Quality Gates Baseline` between accepted gate integration and persistent user return.

This scope is separate from the active Development Tree branch workflow architecture. Do not edit `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md` in this cycle.

## Problem

The Quality Gates agent can currently integrate package scripts and Husky hooks, pass the declared `qg:*` commands, and still leave a real hook broken. The observed example was a hook command such as `npm run plan:validate` in `.husky/pre-commit` / `.husky/pre-push` while the generated workspace had no `plan:validate` script.

That failure is not caught if Core only validates required gate runner evidence and the agent only runs aggregate `qg:*` commands. The enforcement surface itself must be validated.

## Desired Lifecycle

Current lifecycle:

1. Phase 1 - Quality Gates draft / research.
2. Phase 2 - User review.
3. Phase 3 - Accepted-only integration.
4. Phase 4 - Persistent Quality Gates User Return.

Target lifecycle:

1. Phase 1 - Quality Gates draft / research.
2. Phase 2 - User review.
3. Phase 3 - Accepted-only integration.
4. Phase 4 - Formal Quality Gates Verification.
5. Phase 5 - Persistent Quality Gates User Return.

Phase 4 is a provider turn opened by Core after integration validation. The agent receives a focused continuation prompt, runs the required verification matrix, records evidence in the Quality Gates artifacts, and stops for Core validation. Core independently validates the same enforcement surface before opening Phase 5.

## Formal Verification Matrix

The Phase 4 verification must cover both gate bundles and real enforcement files.

Required checks:

- static hook command resolution: every `npm run <script>` referenced from `.husky/pre-commit` and `.husky/pre-push` exists in root `package.json.scripts`;
- `npm run qg:before-module-execution`;
- `npm run qg:before-commit`;
- `npm run qg:before-push`;
- `sh .husky/pre-commit`;
- `sh .husky/pre-push`;
- if `qg:all` exists, run `npm run qg:all` or explain why the explicit matrix is used instead;
- verify that no required gate is still listed as `plannedRequiredAfterIntegration`;
- verify that declared integrated paths still exist after the command runs.

The real hook executions are mandatory because `qg:before-commit` can pass while `.husky/pre-commit` contains an extra broken command before or after the aggregate gate.

## Artifact Contract Changes

Extend `quality-gates.json` with verification state. Exact field names can be refined during implementation, but the contract should express:

- `verificationState`: `not_started | running | verified | failed`;
- `verificationEvidence`: array of command evidence records;
- each evidence record contains command, result, timestamp, exit code, and a short sanitized summary;
- verified state is only valid after Core has independently confirmed the matrix.

`quality-gates.md` should get a user-facing `Integration Verification Evidence` section with the same command list in readable form.

Development Tree unlock must require accepted integration plus verified enforcement. New Quality Gates completions must not unlock branch code work on `integrated: true` alone.

## Core Validator Requirements

Core must not trust the Markdown evidence by itself.

Core validation for Phase 4 must:

- parse root `package.json`;
- parse `.husky/pre-commit` and `.husky/pre-push`;
- reject any hook `npm run <script>` that is not present in `package.json.scripts`;
- run the formal verification matrix or a deterministic Core-owned equivalent;
- capture command result metadata without leaking secrets or huge logs;
- reject stale evidence if `package.json`, `.husky/*`, `scripts/quality-gates/**`, `quality-gates.config.json`, or accepted gate artifacts changed after evidence collection;
- keep the stage in a repair loop if verification fails;
- open persistent user return only after verification passes.

## Prompt Requirements

The Phase 3 integration prompt must stop saying that successful integration is terminal. It should say that integration is followed by Core-owned formal verification.

The new Phase 4 prompt must tell the agent:

- do not add new gates or change the accepted baseline unless verification fails for a concrete reason;
- run the exact verification matrix;
- update only `quality-gates.md`, `quality-gates.json`, and verification-related gate infrastructure if a repair is needed;
- do not run Git commands or edit managed plan files;
- stop for Core validation after recording evidence.

Repair prompts for Phase 4 must include the failed commands and static hook-resolution diagnostics.

## Implementation Notes

Likely code areas:

- `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model.ts`
- `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.ts`
- `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts`
- `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts`
- `packages/core/src/remote-bridge/handlers/quality-gates-progress.ts`
- Quality Gates tests near the touched modules.

Keep each microtask to no more than three files. If implementation shows a task needs more, split the task before editing.

## Acceptance Criteria

- New generated `doc/TODO/stages/quality-gates/todo-plan.md` contains Phase 4 Formal Quality Gates Verification and Phase 5 Persistent Quality Gates User Return.
- Core sends a dedicated Phase 4 continuation prompt after valid Phase 3 integration.
- A hook containing `npm run missing-script` is rejected before persistent return.
- Passing `qg:*` commands alone is not enough if the real hook files fail.
- Core does not unlock Development Tree branch work until Quality Gates verification is valid.
- Existing Quality Gates draft/review/integration repair loops keep working.
- `DevelopmentTree_BranchWorkflow_Architecture.md` remains untouched in this cycle.
