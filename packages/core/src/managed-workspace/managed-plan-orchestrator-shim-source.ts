import { createManagedStagePlan } from "./managed-todo-tree";

const retainLegacyShimDependenciesUntilCleanup = (
  ..._dependencies: readonly unknown[]
): undefined => undefined;

retainLegacyShimDependenciesUntilCleanup(createManagedStagePlan);

export const isLegacyManagedPlanCliShimRemoved = (): boolean => true;
