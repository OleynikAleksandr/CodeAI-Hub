# Application Skeleton Final Review Gate Planning

**Status:** Active planning source
**Created:** 2026-05-18
**Owner:** Oleksandr + Codex
**Implementation note:** Lifecycle, handler, and regression-test changes are implemented in commits `d3bb293a4`, `e5d265532`, and `a2327cf44`; SSOT synchronization is tracked by the active `todo-plan.md`.

## Problem

`Application Skeleton` currently finishes its materialization phase by sending a Core/system completion message:

```text
Core: Application Skeleton завершён и зафиксирован.
Можно переходить к следующему шагу.
```

This is inconsistent with the managed workflow UX used by `Diagram Modules` and expected for step boundaries. Core must not treat the step as accepted by the user merely because materialization validation passed. After materialization, Core must open a user review gate where the user can:

- ask questions;
- request changes within the `Application Skeleton` scope;
- press the inline `Подтверждаю` button to accept the materialized result and move to the next managed step.

## Runtime Decision

Materialization validation remains Core-owned and commit-backed, but it is not final user acceptance.

After a valid materialization commit:

- Core keeps `Application Skeleton` as the active managed stage;
- Core appends a `managed-workflow-user-review` system card using the same handoff style as other user review gates;
- `quality_gates` is not unlocked and `application_skeleton` is not added to `completedStages` until the user confirms this final gate.

When the user confirms the final gate:

- Core records the final user acceptance in the managed stage plan/workspace ledger;
- Core opens the persistent user return boundary;
- Core marks `application_skeleton` completed;
- Core unlocks and activates `quality_gates`.

When the user requests changes at the final gate:

- Core routes a provider-visible revision prompt for the materialized Application Skeleton scope;
- the agent may update the canonical Application Skeleton artifacts and declared scaffold paths;
- Core validates and commits the next materialization attempt before opening the final review gate again.

## Boundaries

- Project Manager remains a projection. It only renders the `managed-workflow-user-review` card and submits the existing acceptance intent.
- Core remains the authority for phase state, validation, commit boundaries, `completedStages`, and next-stage unlock.
- No client-side acceptance state or direct Project Manager plan mutation is introduced.

## Implementation Targets

- Application Skeleton stage-plan model/controller: defer completed-stage ledger updates until final review acceptance.
- Application Skeleton review intent handling: distinguish draft contract review from final materialized review.
- Managed workflow turn handler: emit final `managed-workflow-user-review` for materialized Application Skeleton instead of terminal complete.
- Regression tests: prove materialization opens a review gate, confirmation completes/unlocks, and revision does not unlock.
- SSOT docs: update managed workflow/Application Skeleton lifecycle wording.
