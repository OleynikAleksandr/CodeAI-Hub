import { stat } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";
import type { WorkflowArtifactFileName } from "../../workflow/paths/workflow-paths-types";
import type {
  WorkflowArtifactState,
  WorkflowStageState,
  WorkflowState,
} from "../../workflow/state/workflow-state-types";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const FILESYSTEM_HYDRATION_TARGETS: readonly {
  readonly stage: WorkflowStageId;
  readonly fileName: WorkflowArtifactFileName;
}[] = [
  { stage: "description", fileName: "Final_Description.md" },
  { stage: "virtual_simulation", fileName: "virtual-simulation.md" },
  { stage: "diagram_modules", fileName: "module-map.md" },
  { stage: "diagram_facades", fileName: "facade-map.md" },
] as const;

const upsertArtifact = (
  artifacts: readonly WorkflowArtifactState[],
  relativePath: string,
  updatedAt: string
): readonly WorkflowArtifactState[] => {
  const index = artifacts.findIndex(
    (artifact) => artifact.path === relativePath
  );
  if (index < 0) {
    return [...artifacts, { path: relativePath, updatedAt }];
  }
  return artifacts.map((artifact, artifactIndex) =>
    artifactIndex === index ? { ...artifact, updatedAt } : artifact
  );
};

const hydrateStageFromFilesystem = async (params: {
  readonly stageState: WorkflowStageState;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly stage: WorkflowStageId;
  readonly fileName: WorkflowArtifactFileName;
}): Promise<WorkflowStageState> => {
  const artifactPath = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    stage: params.stage,
    fileName: params.fileName,
  });
  if (!artifactPath.ok) {
    return params.stageState;
  }

  const artifactStat = await stat(artifactPath.value.absolutePath).catch(
    () => null
  );
  if (!artifactStat?.isFile()) {
    return params.stageState;
  }

  const artifactUpdatedAt = artifactStat.mtime.toISOString();
  const relativeArtifactPath = `${params.stage}/${params.fileName}`;
  return {
    ...params.stageState,
    status:
      params.stageState.status === "idle"
        ? "completed"
        : params.stageState.status,
    artifacts: upsertArtifact(
      params.stageState.artifacts,
      relativeArtifactPath,
      artifactUpdatedAt
    ),
    updatedAt:
      artifactUpdatedAt.localeCompare(params.stageState.updatedAt) > 0
        ? artifactUpdatedAt
        : params.stageState.updatedAt,
  };
};

export const hydrateWorkflowStateFromFilesystem = async (params: {
  readonly state: WorkflowState;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<WorkflowState> => {
  let nextState = params.state;

  for (const target of FILESYSTEM_HYDRATION_TARGETS) {
    const currentStageState = nextState.stages[target.stage];
    const hydratedStageState = await hydrateStageFromFilesystem({
      stageState: currentStageState,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
      stage: target.stage,
      fileName: target.fileName,
    });
    if (hydratedStageState === currentStageState) {
      continue;
    }
    nextState = {
      ...nextState,
      stages: {
        ...nextState.stages,
        [target.stage]: hydratedStageState,
      },
      updatedAt:
        hydratedStageState.updatedAt.localeCompare(nextState.updatedAt) > 0
          ? hydratedStageState.updatedAt
          : nextState.updatedAt,
    };
  }

  return nextState;
};
