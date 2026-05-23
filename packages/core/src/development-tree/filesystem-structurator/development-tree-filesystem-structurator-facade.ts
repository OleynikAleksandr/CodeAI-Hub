import { WorkflowStepUndoLedgerStore } from "../../workflow/undo/workflow-step-undo-ledger";
import type { DevelopmentTreeSnapshot } from "../development-tree-types";
import {
  DevelopmentTreeFilesystemApplier,
  type DevelopmentTreeFilesystemApplyResult,
} from "./development-tree-filesystem-applier";
import {
  DevelopmentTreeFilesystemPathPlanner,
  type DevelopmentTreeFilesystemPathPlannerRequest,
} from "./development-tree-filesystem-path-planner";
import type {
  DevelopmentTreeFilesystemDirectoryPlan,
  DevelopmentTreeFilesystemPathPlan,
} from "./development-tree-filesystem-paths";
import {
  DevelopmentTreeOrphanRegistry,
  type DevelopmentTreeOrphanSummary,
} from "./development-tree-orphan-registry";
import {
  DevelopmentTreeProductionPathApplier,
  type DevelopmentTreeProductionPathApplyResult,
  readDevelopmentTreeCodeWorkspacePathIndex,
} from "./development-tree-production-path-applier";

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
  readonly productionApply: DevelopmentTreeProductionPathApplyResult;
}

const developmentTreeStageFromPath = (
  relativePath: string,
  workspaceSlug: string
): `development_tree/${string}` | null => {
  const materializedPrefix = `.codeai-hub/${workspaceSlug}/`;
  if (relativePath.startsWith(`${materializedPrefix}development_tree/`)) {
    return relativePath.slice(
      materializedPrefix.length
    ) as `development_tree/${string}`;
  }
  const todoPrefix = "doc/TODO/stages/development-tree/";
  if (relativePath.startsWith(todoPrefix)) {
    return `development_tree/materialized/${relativePath.slice(todoPrefix.length)}`;
  }
  return null;
};

const codeStageFromEntry = (entry: {
  readonly clusterId?: string;
  readonly kind: "cluster" | "module" | "product_part";
  readonly moduleId?: string;
  readonly partId: string;
}): `development_tree/${string}` => {
  const clusterPath = entry.clusterId ? `/clusters/${entry.clusterId}` : "";
  const modulePath = entry.moduleId ? `/modules/${entry.moduleId}` : "";
  return `development_tree/materialized/product-parts/${entry.partId}${clusterPath}${modulePath}`;
};

const recordUndoLedgerEntries = async (params: {
  readonly createdDirectories: readonly DevelopmentTreeFilesystemDirectoryPlan[];
  readonly productionApply: DevelopmentTreeProductionPathApplyResult;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const codeIndex = await readDevelopmentTreeCodeWorkspacePathIndex(params);
  const codeEntriesByPath = new Map(
    (codeIndex?.entries ?? []).map((entry) => [entry.codeWorkspacePath, entry])
  );
  const entries = [
    ...params.createdDirectories.flatMap((directory) => {
      const stage = developmentTreeStageFromPath(
        directory.relativePath,
        params.workspaceSlug
      );
      return stage
        ? [
            {
              kind: "create_directory" as const,
              relativePath: directory.relativePath,
              source: "development_tree_materialization",
              stage,
            },
          ]
        : [];
    }),
    ...params.productionApply.created.flatMap((relativePath) => {
      const entry = codeEntriesByPath.get(relativePath);
      return entry
        ? [
            {
              kind: "create_directory" as const,
              relativePath,
              source: "development_tree_production_paths",
              stage: codeStageFromEntry(entry),
            },
          ]
        : [];
    }),
  ];
  if (entries.length === 0) {
    return;
  }
  await new WorkflowStepUndoLedgerStore({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  }).append(entries);
};

export class DevelopmentTreeFilesystemStructuratorFacade {
  private readonly applier = new DevelopmentTreeFilesystemApplier();
  private readonly orphanRegistry = new DevelopmentTreeOrphanRegistry();
  private readonly pathPlanner = new DevelopmentTreeFilesystemPathPlanner();
  private readonly productionPathApplier =
    new DevelopmentTreeProductionPathApplier();

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
    const productionApply = await this.productionPathApplier.apply(params);
    await recordUndoLedgerEntries({
      createdDirectories: apply.created,
      productionApply,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const orphans =
      params.existingRelativePaths && params.existingRelativePaths.length > 0
        ? this.orphanRegistry.summarize({
            plan,
            existingRelativePaths: [
              ...apply.observedDirectories.map(
                (directory) => directory.relativePath
              ),
              ...params.existingRelativePaths,
            ],
          })
        : this.orphanRegistry.summarizeFromObservedDirectories({
            plan,
            observedDirectories: apply.observedDirectories,
          });
    return { plan, apply, orphans, productionApply };
  }
}
