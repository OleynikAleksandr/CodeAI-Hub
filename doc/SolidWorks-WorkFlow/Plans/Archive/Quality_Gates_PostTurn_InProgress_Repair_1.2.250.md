# Quality Gates Post-Turn In-Progress Repair — 1.2.250

## Status

Active hotfix scope, accepted by the user on 2026-05-13.

## Problem

Quality Gates Phase 3 can stop after an agent writes integration artifacts with `accepted: true`, `acceptanceCommitted: true`, `integrated: false`, and `integrationState: "in_progress"`.

The provider-visible prompt can also tell the agent that `.husky/**` is Core-owned. A provider that follows this literally leaves required hook wiring incomplete and waits for Core. Core then commits the owned integration attempt as a managed stage, but does not classify the post-commit snapshot as failed because hook validation is currently tied to `integrated: true`. Result: no repair prompt, no Phase 4 user-return anchor, and the session appears stuck.

This is provider-neutral. Codex may pass if it ignores the stale hook wording and sets `integrated: true`; Claude exposed the actual state-machine gap by leaving `integrated: false`.

## Target Behavior

1. After user acceptance is committed, the Quality Gates Phase 3 continuation prompt must state that required hook wiring is agent-owned integration work for `.husky/pre-commit` and `.husky/pre-push`.
2. Core must validate required hook wiring when an accepted Quality Gates integration attempt is in progress, even if the agent did not set `integrated: true`.
3. If required hook wiring is missing after such an attempt, Core must create a Phase 3 repair microtask and send actionable repair feedback. It must not send wait-only instructions for provider-owned repair work.
4. Application Skeleton and Diagram Modules must be checked for the same class of defect: a post-acceptance `in_progress` state must not be silently committed and left without repair/continuation.
5. Release `1.2.250` must include the fix and regression coverage.

## Implementation Notes

- The fix belongs in Core managed workflow state, not in provider-specific code.
- Quality Gates hook wiring is stage-owned during Phase 3 integration because the accepted contract explicitly declares the lifecycle hooks to be materialized.
- Core still owns Git, plan advancement, validation, repair task injection, and managed commits.
