# Closeout Replacement Acceptance

**Date:** 2026-05-04
**Scope:** Phase 2 / Stream 2 / Task 1
**Accepted by:** Oleksandr
**Acceptance source:** chat confirmation

## Accepted Result

The closeout replacement fix is accepted for this execution cycle.

The accepted behavior is:

- A completed active scope is archived into `doc/TODO/Archive/`.
- The active `doc/TODO/todo-plan.md` is replaced by a short terminal `NONE` handoff template after the closeout commit finalizes.
- The terminal handoff template clears `currentTaskId`, `expectedCommitMessage`, and `debt`.
- The terminal handoff template does not include `AGENTS.md` in its context pack.

## Verification Before Acceptance

- Implementation commit: `d89b50700 fix: replace active plan on closeout`.
- Evidence commit: `3f21c0ad5 test: record closeout replacement verification`.
- Focused markdown updater tests passed: `3/3`.
- Full plan orchestrator test suite passed: `46/46`.
- `npm run plan:status`: OK, `Debt: none`.
- `npm run plan:validate`: OK.
