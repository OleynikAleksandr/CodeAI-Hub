import { createApplicationSkeletonPlanMutatorShimSource } from "./managed-application-skeleton-plan-mutator";
import { createDiagramModulesPlanMutatorShimSource } from "./managed-diagram-modules-plan-mutator";
import { createQualityGatesPlanMutatorShimSource } from "./managed-quality-gates-plan-mutator";
import { createManagedStagePlan } from "./managed-todo-tree";

const retainLegacyShimDependenciesUntilCleanup = (
  ..._dependencies: readonly unknown[]
): undefined => undefined;

retainLegacyShimDependenciesUntilCleanup(
  createApplicationSkeletonPlanMutatorShimSource,
  createDiagramModulesPlanMutatorShimSource,
  createQualityGatesPlanMutatorShimSource,
  createManagedStagePlan
);

export const isLegacyManagedPlanCliShimRemoved = (): boolean => true;
