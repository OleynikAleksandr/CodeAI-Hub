import { isLegacyManagedPlanCliShimRemoved } from "./managed-plan-orchestrator-shim-source";
import {
  ensureManagedTodoTree,
  type ManagedWorkflowPlanStage,
  normalizeInitialPlanStage,
} from "./managed-todo-tree";
import { createManagedWorkspacePaths } from "./managed-workspace-paths";

export interface ManagedPlanOrchestratorInstallResult {
  readonly hooksWritten: readonly string[];
  readonly packageScripts: readonly string[];
  readonly todoPlanCreated: boolean;
}

export interface ManagedPlanOrchestratorInstallOptions {
  readonly initialStage?: ManagedWorkflowPlanStage | string | null;
}

export class ManagedPlanOrchestratorInstaller {
  async install(
    workspaceRoot: string,
    options: ManagedPlanOrchestratorInstallOptions = {}
  ): Promise<ManagedPlanOrchestratorInstallResult> {
    if (!isLegacyManagedPlanCliShimRemoved()) {
      throw new Error("Legacy managed plan CLI shim must remain disabled.");
    }

    const paths = createManagedWorkspacePaths(workspaceRoot);
    const todoPlanCreated = await ensureTodoPlan(
      paths.todoPlan.absolutePath,
      normalizeInitialPlanStage(options.initialStage)
    );

    return {
      hooksWritten: [],
      packageScripts: [],
      todoPlanCreated,
    };
  }
}

const ensureTodoPlan = async (
  todoPlanPath: string,
  initialStage: ManagedWorkflowPlanStage
): Promise<boolean> => {
  return (await ensureManagedTodoTree(todoPlanPath, initialStage)).created;
};
