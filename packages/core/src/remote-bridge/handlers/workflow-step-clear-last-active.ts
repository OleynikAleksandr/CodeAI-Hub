import { stat } from "node:fs/promises";
import path from "node:path";
import { WorkflowLastActiveStore } from "../../workflow/state/workflow-last-active-store";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const WORKFLOW_STAGES = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];

const STAGE_ARTIFACT_CANDIDATES: Record<WorkflowStageId, readonly string[]> = {
  application_skeleton: [
    "application_skeleton/application-skeleton-map.json",
    "application_skeleton/application-skeleton.md",
  ],
  description: [
    "description/Final_Description.md",
    "description/questionnaire.md",
  ],
  diagram_modules: ["diagram_modules/product-parts.index.md"],
  quality_gates: [
    "quality_gates/quality-gates.json",
    "quality_gates/quality-gates.md",
  ],
  virtual_simulation: [
    "virtual_simulation/virtual-simulation.md",
    "virtual-simulation/virtual-simulation.md",
    "virtual_simulation/final-virtual-simulation.md",
  ],
};

const pathExists = async (absolutePath: string): Promise<boolean> =>
  Boolean(await stat(absolutePath).catch(() => null));

const buildWorkflowPath = (
  workspaceSlug: string,
  stageRelativePath: string
): string => `.codeai-hub/${workspaceSlug}/${stageRelativePath}`;

const downstreamStages = (stage: WorkflowStageId): ReadonlySet<string> => {
  const index = WORKFLOW_STAGES.indexOf(stage);
  return new Set(index < 0 ? [] : WORKFLOW_STAGES.slice(index));
};

const fallbackStageOrder = (
  stage: WorkflowStageId
): readonly WorkflowStageId[] => {
  if (stage === "description") {
    return ["description"];
  }
  const index = WORKFLOW_STAGES.indexOf(stage);
  return index < 0 ? [] : WORKFLOW_STAGES.slice(0, index).reverse();
};

const resolveExistingFallback = async (params: {
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<{
  readonly artifactPath: string;
  readonly stage: WorkflowStageId;
} | null> => {
  for (const stage of fallbackStageOrder(params.stage)) {
    for (const candidate of STAGE_ARTIFACT_CANDIDATES[stage]) {
      const relativePath = buildWorkflowPath(params.workspaceSlug, candidate);
      if (await pathExists(path.join(params.workspaceRoot, relativePath))) {
        return { stage, artifactPath: relativePath };
      }
    }
  }
  return null;
};

export const resetWorkflowLastActiveAfterClear = async (params: {
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<boolean> => {
  if (await pathExists(path.join(params.workspaceRoot, ".git"))) {
    return false;
  }

  const store = new WorkflowLastActiveStore();
  const current = await store.read(params.workspaceRoot, params.workspaceSlug);
  const removedStages = downstreamStages(params.stage);
  if (current && !removedStages.has(current.stage)) {
    return false;
  }

  const fallback = await resolveExistingFallback(params);
  if (!fallback) {
    return false;
  }

  await store.upsert(params.workspaceRoot, params.workspaceSlug, fallback);
  return true;
};
