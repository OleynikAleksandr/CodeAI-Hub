import type { DevelopmentTreeSnapshot } from "../development-tree-types";
import {
  DevelopmentTreeFilesystemApplier,
  type DevelopmentTreeFilesystemApplyResult,
} from "./development-tree-filesystem-applier";
import {
  DevelopmentTreeFilesystemPathPlanner,
  type DevelopmentTreeFilesystemPathPlannerRequest,
} from "./development-tree-filesystem-path-planner";
import type { DevelopmentTreeFilesystemPathPlan } from "./development-tree-filesystem-paths";
import {
  DevelopmentTreeOrphanRegistry,
  type DevelopmentTreeOrphanSummary,
} from "./development-tree-orphan-registry";

export interface DevelopmentTreeFilesystemStructuratorRequest {
  readonly existingRelativePaths?: readonly string[];
  readonly snapshot: DevelopmentTreeSnapshot;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface DevelopmentTreeFilesystemStructuratorResult {
  readonly apply: DevelopmentTreeFilesystemApplyResult;
  readonly orphans: DevelopmentTreeOrphanSummary;
  readonly plan: DevelopmentTreeFilesystemPathPlan;
}

export class DevelopmentTreeFilesystemStructuratorFacade {
  private readonly applier = new DevelopmentTreeFilesystemApplier();
  private readonly orphanRegistry = new DevelopmentTreeOrphanRegistry();
  private readonly pathPlanner = new DevelopmentTreeFilesystemPathPlanner();

  plan(
    params: DevelopmentTreeFilesystemPathPlannerRequest
  ): DevelopmentTreeFilesystemPathPlan {
    return this.pathPlanner.plan(params);
  }

  async materialize(
    params: DevelopmentTreeFilesystemStructuratorRequest
  ): Promise<DevelopmentTreeFilesystemStructuratorResult> {
    const plan = this.plan(params);
    const apply = await this.applier.apply(plan);
    const orphans = this.orphanRegistry.summarize({
      plan,
      existingRelativePaths: params.existingRelativePaths ?? [],
    });
    return { plan, apply, orphans };
  }
}
