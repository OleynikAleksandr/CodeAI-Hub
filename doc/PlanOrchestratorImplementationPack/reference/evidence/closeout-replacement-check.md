# Closeout Replacement Verification

**Date:** 2026-05-04
**Scope:** Phase 1 / Stream 2 / Task 2
**Command path under verification:** `npm run plan:commit` closeout finalization
**Implementation commit:** `d89b50700 fix: replace active plan on closeout`

## Commands

```bash
node --test scripts/plan-orchestrator/plan-markdown-updater.test.mjs
node --test scripts/plan-orchestrator/*.test.mjs
npm run plan:validate
npm run plan:status
```

## Results

- Focused markdown updater tests passed: `3/3`.
- Full plan orchestrator test suite passed: `46/46`.
- Active plan validation passed: `Plan validation: OK`.
- Active plan status stayed open for this evidence task: `Execution Scope Status: ACTIVE`.
- Active cycle debt stayed clear: `Debt: none`.

## Replacement Behavior Covered

- Closeout commit finalization now writes a terminal active `doc/TODO/todo-plan.md` template with `executionScopeStatus: NONE`.
- The terminal template clears `currentTaskId`, `expectedCommitMessage`, and `debt`.
- The terminal template records the latest closeout archive path as `doc/TODO/Archive/todo-plan-closeout-<planId>.md`.
- The fixture starts from a plan whose context pack contains `AGENTS.md`; the generated terminal template excludes `AGENTS.md`.
- The old reserved post-closeout handoff anchor is not preserved in the generated terminal template.

## Active Cycle Safety Check

The real repository closeout command was not executed during this evidence task.
This active verification cycle remained open:

- `Execution Scope Status`: `ACTIVE`
- `Current Task`: `phase1.stream2.task2`
- `Expected Commit`: `test: record closeout replacement verification`
- `Debt`: `none`
- `Validation`: `OK`
