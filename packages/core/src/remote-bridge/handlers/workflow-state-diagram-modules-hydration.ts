import { stat } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";
import type {
  WorkflowArtifactState,
  WorkflowStageStatus,
  WorkflowState,
} from "../../workflow/state/workflow-state-types";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";

const DIAGRAM_MODULES_INDEX_FILE = "product-parts.index.md";

const upsertStageArtifact = (params: {
  readonly artifacts: readonly WorkflowArtifactState[];
  readonly relativePath: string;
  readonly updatedAt: string;
}): readonly WorkflowArtifactState[] => {
  const artifactIndex = params.artifacts.findIndex(
    (artifact) => artifact.path === params.relativePath
  );
  if (artifactIndex < 0) {
    return [
      ...params.artifacts,
      {
        path: params.relativePath,
        updatedAt: params.updatedAt,
      },
    ];
  }
  return params.artifacts.map((artifact, index) =>
    index === artifactIndex
      ? { ...artifact, updatedAt: params.updatedAt }
      : artifact
  );
};

export const hydrateDiagramModulesStateFromProgress = async (params: {
  readonly state: WorkflowState;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly diagramModulesProgress: DiagramModulesProgressSnapshot | null;
}): Promise<WorkflowState> => {
  if (!params.diagramModulesProgress) {
    return params.state;
  }

  const currentStage = params.state.stages.diagram_modules;
  if (currentStage.status !== "idle") {
    return params.state;
  }

  const artifactPath = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    stage: "diagram_modules",
    fileName: DIAGRAM_MODULES_INDEX_FILE,
  });
  if (!artifactPath.ok) {
    return params.state;
  }

  const artifactStat = await stat(artifactPath.value.absolutePath).catch(
    () => null
  );
  if (!artifactStat?.isFile()) {
    return params.state;
  }

  const artifactUpdatedAt = artifactStat.mtime.toISOString();
  const nextStatus: WorkflowStageStatus = params.diagramModulesProgress
    .aggregateReady
    ? "completed"
    : "in_progress";
  const nextStage = {
    ...currentStage,
    status: nextStatus,
    artifacts: upsertStageArtifact({
      artifacts: currentStage.artifacts,
      relativePath: `diagram_modules/${DIAGRAM_MODULES_INDEX_FILE}`,
      updatedAt: artifactUpdatedAt,
    }),
    updatedAt:
      artifactUpdatedAt.localeCompare(currentStage.updatedAt) > 0
        ? artifactUpdatedAt
        : currentStage.updatedAt,
  };

  return {
    ...params.state,
    stages: {
      ...params.state.stages,
      diagram_modules: nextStage,
    },
    updatedAt:
      nextStage.updatedAt.localeCompare(params.state.updatedAt) > 0
        ? nextStage.updatedAt
        : params.state.updatedAt,
  };
};
