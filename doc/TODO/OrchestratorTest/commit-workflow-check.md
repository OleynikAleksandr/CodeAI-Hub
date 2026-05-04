# Commit Workflow Check

**Date:** 2026-05-04
**Plan ID:** mixed-orchestrator-test-2026-05-04
**Baseline commit:** 948da2db4

## Scope

This check records the mixed workflow behavior after Phase 1 no-commit
completion and Phase 2 commit workflow verification.

## Phase 2 Commit Workflow Observations

1. Staged scoped change:
   - `doc/TODO/OrchestratorTest/session-recovery-check.md`
   - Initial add required `git add -f` because `doc/TODO/*` was ignored.

2. First `plan:commit` attempt:
   - Command: `npm run plan:commit -- "test: record orchestrator recovery check"`.
   - Architecture check passed with warnings only.
   - `npm run lint` passed.
   - `npm run check:knip` passed with configuration hints only.
   - Commit failed before commit object creation because `.husky/pre-commit`
     re-added staged files with a normal `git add`, and Git rejected the
     ignored `doc/TODO/OrchestratorTest` path.

3. Debt and repair behavior:
   - The failed transaction opened `.git/codeai-plan-debt`.
   - `npm run plan:status` reported `Debt: open` and validation failed.
   - Debt stage was `commit_pending`.
   - `npm run plan:repair` returned `commit_not_created_rolled_back`.
   - After repair, `Debt: none`, validation returned OK, and HEAD stayed
     `03ddd1984`.

4. Process fix:
   - `.gitignore` now permits tracked test evidence files:
     - `!doc/TODO/OrchestratorTest/`
     - `!doc/TODO/OrchestratorTest/*.md`
   - `git check-ignore` no longer matches
     `doc/TODO/OrchestratorTest/session-recovery-check.md`.
   - Normal `git add .gitignore doc/TODO/OrchestratorTest/session-recovery-check.md`
     succeeded without `-f`.

5. Successful `plan:commit` retry:
   - Command: `npm run plan:commit -- "test: record orchestrator recovery check"`.
   - Pre-commit checks completed.
   - Ultracite formatted staged files and re-added them without ignored-path
     failure.
   - Post-commit hook printed `Plan post-commit hook: finalized`.
   - Commit created: `948da2db4 test: record orchestrator recovery check`.

## Post-Commit State

- `npm run plan:status` reported `Last Recorded Commit: 948da2db4`.
- `git rev-parse --short HEAD` returned `948da2db4`.
- `Debt: none`.
- `Validation: OK`.
- The current task advanced to `phase2.stream1.task2`, then `plan:complete`
  advanced the plan to `phase3.stream1.task1`.

## Result

The mixed workflow now covers:

- no-commit local plan state transitions through `plan:complete`;
- normal tracked file commits through `plan:commit`;
- new evidence files under `doc/TODO/OrchestratorTest/*.md`, which are now
  explicitly unignored and can pass pre-commit formatting without `git add -f`.
