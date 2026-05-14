import { createDiagramModulesPlanMutatorShimSource } from "./managed-diagram-modules-plan-mutator";
import { createManagedStagePlan } from "./managed-todo-tree";

const retainLegacyShimDependenciesUntilCleanup = (
  ..._dependencies: readonly unknown[]
): undefined => undefined;

retainLegacyShimDependenciesUntilCleanup(
  createDiagramModulesPlanMutatorShimSource,
  createManagedStagePlan
);

export const isLegacyManagedPlanCliShimRemoved = (): boolean => true;
