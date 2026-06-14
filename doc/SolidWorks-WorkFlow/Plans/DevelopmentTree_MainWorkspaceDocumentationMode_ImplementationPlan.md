# Development Tree Main-Workspace Documentation Mode Implementation Plan

**Status:** active implementation planning source, opened 2026-06-14.
**Source decision:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartLaneCloseout_ImplementationPlan.md`.

## Goal

Move Product Part documentation sessions back into the main workspace.

After accepted `Diagram Modules`, Core should still start Product Part
documentation agents immediately, but it must not create Product Part pre-code
Git worktrees. Sessions, draft artifacts, managed state, continuity, and
Product Part TODO ledgers should all live under the current workspace.

## Runtime Contract

Keep the existing behavior where it is still correct:

1. `Diagram Modules` acceptance bootstraps Product Part documentation sessions.
2. Secondary Product Part briefs must be accepted before the lead Product Part
   receives the `DevelopmentOrderPlan` assignment.
3. Core owns Product Part TODO ledgers, managed decisions, and Git commits.
4. Agents write only assigned Product Part draft artifacts.
5. Cluster/Module sessions must not start from Product Part acceptance in this
   cycle.

Change only the wrong pre-code lane model:

1. Product Part bootstrap uses the main workspace path as the session
   `workspacePath`.
2. Product Part draft files and stage TODO plans are created in the main
   workspace.
3. Bootstrap commits include created draft files, Product Part TODO plans, and
   managed state paths.
4. Managed Product Part state must not require `worktreePath`.
5. Accepted Product Part brief/order-plan checkpoint helpers become no-op when
   the session already runs in the main workspace.

## Non-Goals

- Do not implement Cluster/Module documentation sessions in this release.
- Do not implement code-stage persistent worktree lifecycle in this release.
- Do not implement full node-ledger Clear/Undo in this release.

## Retest Contract

In a FinderWidget-style workspace:

1. Accepting `Diagram Modules` starts all Product Part documentation sessions.
2. No `<workspace>.worktrees/<slug>/product-parts/<partId>/precode` folders are
   created.
3. Product Part draft artifacts and stage TODO plans are present in the main
   workspace.
4. Product Part managed state and Project Manager sessions are visible from the
   main workspace.
5. Secondary Product Part acceptance still gates the lead
   `DevelopmentOrderPlan` assignment.
6. No Cluster/Module sessions start after lead order-plan acceptance.

## Implementation Cut

Keep the first fix narrow:

- Refactor `DevelopmentTreeProductPartPrecodeBootstrap` to stop creating
  Product Part worktrees and to commit main-workspace bootstrap paths.
- Keep existing Product Part review/lead-barrier controllers and adjust only
  checkpoint behavior that still assumes a lane.
- Update canonical workflow docs to remove the pre-code worktree-lane contract
  for documentation mode.
- Build release `1.2.514` for retest.

## Expected Files

- `packages/core/src/remote-bridge/handlers/development-tree-product-part-precode-bootstrap.ts`
- `packages/core/src/remote-bridge/handlers/product-part-brief-lane-checkpoint.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-diagram-review-actions.test.ts`
- `packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts`
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
