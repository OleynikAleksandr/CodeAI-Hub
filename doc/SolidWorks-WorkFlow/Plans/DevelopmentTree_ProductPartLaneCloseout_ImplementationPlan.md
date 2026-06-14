# Development Tree Product Part Lane Closeout Implementation Plan

**Status:** active implementation planning source, opened 2026-06-14.
**Source decision:** `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_DownstreamExecutionRefactor_Architecture.md`.

## Goal

Stop Product Part pre-code lanes at the accepted Product Part planning checkpoint.

After the lead Product Part `DevelopmentOrderPlan.v2` is accepted, Core must:

- checkpoint the accepted Product Part artifacts into the main workspace;
- not create cluster/module documents from the Product Part lane;
- not start cluster contract sessions;
- remove the finished Product Part worktree folder/tree;
- leave downstream cluster/module work for a later verified-main phase.

## Current Runtime Gap

The current order-plan acceptance path still opens downstream coordination:

- generated lead Product Part todo plans include Phase 5 downstream coordination;
- `ProductPartDevelopmentOrderPlanReviewController` moves the Product Part plan into that downstream phase and returns `startFirstWave`;
- `product-part-managed-review-decision-handler` sees `startFirstWave` and calls the cluster contract bootstrapper.

That is the premature path observed in `FinderWidget-Test01`.

## Implementation Cut

Keep the diff small:

1. Generated Product Part plans should end at `Phase Return - User Return And Revisions` after lead order-plan review.
2. Order-plan acceptance should write accepted order-plan state/checkpoints, then move the Product Part plan to return, not downstream coordination.
3. The managed review handler should not contain a cluster wave bootstrap path for Product Part acceptance.
4. The accepted order-plan checkpoint should resolve a lane workspace back to main and clean the Product Part worktrees after the main checkpoint succeeds.

No cluster/module executor is implemented in this cycle.

## Retest Contract

In a FinderWidget-style workspace:

1. Product Part agents create and accept briefs.
2. Lead Product Part creates and accepts `DevelopmentOrderPlan`.
3. No `cluster-contracts/...` worktree/session is created.
4. Accepted Product Part artifacts and managed decisions are present in the main workspace.
5. The finished `<workspace>.worktrees/<workspaceSlug>/product-parts/...` tree is removed.

## Implementation Files

Expected runtime files:

- `packages/core/src/development-tree/product-part-workflow/product-part-development-brief-plan-writer.ts`
- `packages/core/src/remote-bridge/handlers/product-part-brief-lane-checkpoint.ts`
- `packages/core/src/remote-bridge/handlers/product-part-development-order-plan-review-controller.ts`
- `packages/core/src/remote-bridge/handlers/product-part-managed-review-decision-handler.ts`

Focused tests stay beside those files.
