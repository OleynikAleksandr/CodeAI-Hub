import path from "node:path";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const WORKFLOW_STAGES = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];

const STAGE_TODO_DIRS: Record<WorkflowStageId, string> = {
  application_skeleton: "application-skeleton",
  description: "description",
  diagram_modules: "diagram-modules",
  quality_gates: "quality-gates",
  virtual_simulation: "virtual-simulation",
};

interface WorkflowStageClearPathRequest {
  readonly target: { readonly stage: WorkflowStageId };
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

const downstreamStages = (
  stage: WorkflowStageId
): readonly WorkflowStageId[] => {
  const index = WORKFLOW_STAGES.indexOf(stage);
  return index < 0 ? [] : WORKFLOW_STAGES.slice(index);
};

export const collectWorkflowStageClearPaths = (
  params: WorkflowStageClearPathRequest,
  options: { readonly includeWorkflowState?: boolean } = {}
): string[] => {
  const paths: string[] = [];
  const hubRoot = path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug
  );
  for (const stage of downstreamStages(params.target.stage)) {
    if (stage === "description") {
      paths.push(
        path.join(hubRoot, "description/Final_Description.md"),
        path.join(hubRoot, "description/Description_Draft.md")
      );
    } else {
      paths.push(path.join(hubRoot, stage));
    }
    paths.push(path.join(hubRoot, "continuity", stage));
    paths.push(path.join(hubRoot, "workflow", "managed", `${stage}.json`));
    paths.push(
      path.join(params.workspacePath, "doc/TODO/stages", STAGE_TODO_DIRS[stage])
    );
  }
  if (options.includeWorkflowState ?? true) {
    paths.push(
      path.join(hubRoot, "workflow", "diagram-modules-progress.json"),
      path.join(hubRoot, "workflow", "state.json")
    );
  }
  if (downstreamStages(params.target.stage).includes("application_skeleton")) {
    paths.push(path.join(params.workspacePath, "product-parts"));
  }
  if (downstreamStages(params.target.stage).includes("diagram_modules")) {
    paths.push(path.join(hubRoot, "development_tree"));
    paths.push(path.join(hubRoot, "continuity", "development_tree"));
    paths.push(
      path.join(params.workspacePath, "doc/TODO/stages/development-tree")
    );
  }
  return paths;
};
