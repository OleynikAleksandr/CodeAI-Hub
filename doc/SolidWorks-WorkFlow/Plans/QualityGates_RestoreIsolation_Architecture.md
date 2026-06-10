# Quality Gates Restore Isolation Architecture

**Status:** Active planning source
**Created:** 2026-06-10
**Owner:** Codex
**Scope:** Quality Gates Phase 4 formal verification command isolation after the `1.2.486` no-stop orchestration retest.

## Problem

The `Quality Gates Baseline` retest reached persistent user return, but the live transcript exposed a technical race in Phase 4 formal verification: an agent ran verification commands in parallel while one of the Quality Gates scripts (`qg:restore`) removed `node_modules`. Other checks and hook commands started against the same workspace at the same time, so the agent created an avoidable workspace-level race.

This did not break the Core lifecycle, but it is an architectural defect in the formal verification contract. A command that restores, deletes, reinstalls, or otherwise mutates dependency state cannot share a workspace with simultaneous verification commands.

## Root Cause

Current Core validation proves that evidence exists for required hooks and commands, but it does not own or validate the execution discipline that produced that evidence. Phase 4 prompts say to run the required commands, while the validator accepts `verificationState: "verified"` plus passed command entries. There is no canonical concept of:

- exclusive workspace mutation commands;
- serialized verification execution;
- command evidence order;
- dependency-restore commands as a workspace lock boundary.

As a result, provider agents can interpret "run all commands" as parallel tool calls, and Core has no contract-level reason to reject the resulting evidence.

## Architectural Decision

Quality Gates formal verification must be a sequential workspace transaction, not a bag of independent checks.

Core remains the authority for the Phase 4 contract. The provider-visible prompt, bundled agent asset, JSON evidence contract, and Core validator must all agree on the same invariant:

1. Resolve command reachability first.
2. Build one ordered verification plan.
3. Run commands one at a time in a single workspace.
4. Treat dependency-restore, install, clean, delete, or hook commands that may invoke them as exclusive workspace mutation commands.
5. Do not start the next command until the previous command exits and any dependency install/restore side effects are settled.
6. Record evidence only after the sequential run completes.

The preferred evidence shape becomes:

```json
{
  "verificationState": "verified",
  "verificationEvidence": {
    "executionMode": "sequential",
    "commands": [
      {
        "sequence": 1,
        "command": "sh .husky/pre-commit",
        "status": "passed",
        "exitCode": 0
      }
    ]
  }
}
```

Compatibility evidence paths may remain accepted only when Core can read the same sequential execution marker from the enclosing `verificationEvidence` object. String-only array evidence is no longer sufficient for new verified Phase 4 output.

## Implementation Boundaries

- Do not hardcode `qg:restore` as a special case. The rule applies to any Quality Gates command or aggregate/hook that can mutate the workspace dependency/install state.
- Do not move the whole Quality Gates command execution into Project Manager. PM remains a projection.
- Do not make script names authoritative. Name-agnostic gate validation from `1.2.486` stays intact: `commands.<gate-id>.proposedCommand` remains the machine source of truth.
- Do not require npm/Husky for non-npm stacks. The npm/Husky wording applies to the current adapter; the Core invariant is sequential workspace verification.

## Planned Code Changes

1. Add a Core-side sequential verification evidence reader/validator for Quality Gates Phase 4.
2. Update formal verification diagnostics so repair prompts explain the required `executionMode: "sequential"` and per-command `sequence` fields.
3. Update Phase 4 continuation and repair prompts to forbid parallel tool calls for verification commands and to describe exclusive workspace mutation commands.
4. Update bundled Quality Gates prompt/contract assets and template sync tests.
5. Synchronize SSOT docs for `Managed Workflow Orchestration` and `Workflow Steps Overview`.

## Acceptance Criteria

- Core rejects `verificationState: "verified"` when command evidence lacks the sequential execution marker.
- Core accepts ordered command entries with `executionMode: "sequential"`, `status: "passed"`, and `exitCode: 0`.
- Phase 4 prompts explicitly instruct agents to run formal verification commands sequentially and never in parallel.
- The Quality Gates bundled asset contains the same contract as the runtime prompt.
- Targeted Core tests for Quality Gates prompt/evidence validation pass.
