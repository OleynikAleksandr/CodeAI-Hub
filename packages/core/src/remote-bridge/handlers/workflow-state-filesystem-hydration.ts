import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
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
  { stage: "application_skeleton", fileName: "application-skeleton.md" },
  {
    stage: "application_skeleton",
    fileName: "application-skeleton-map.json",
  },
  { stage: "quality_gates", fileName: "quality-gates.md" },
  { stage: "quality_gates", fileName: "quality-gates.json" },
] as const;

const VIRTUAL_SIMULATION_ALIAS_DIR = "virtual-simulation";

const DIRECT_ARTIFACT_COMPLETION_STAGES = new Set<WorkflowStageId>([
  "description",
  "virtual_simulation",
]);

const isDisposableAliasEntry = (entry: string): boolean =>
  entry === ".DS_Store";

const resolveHydratedStageStatus = (
  stage: WorkflowStageId,
  stageState: WorkflowStageState
): WorkflowStageState["status"] => {
  if (
    stageState.status === "in_progress" &&
    DIRECT_ARTIFACT_COMPLETION_STAGES.has(stage)
  ) {
    return "completed";
  }
  return stageState.status === "idle" ? "completed" : stageState.status;
};

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

  const artifactStat = await resolveCanonicalArtifactStat({
    absolutePath: artifactPath.value.absolutePath,
    fileName: params.fileName,
    stage: params.stage,
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  if (!artifactStat?.isFile()) {
    return params.stageState;
  }

  const artifactUpdatedAt = artifactStat.mtime.toISOString();
  const relativeArtifactPath = `${params.stage}/${params.fileName}`;
  return {
    ...params.stageState,
    status: resolveHydratedStageStatus(params.stage, params.stageState),
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

const resolveCanonicalArtifactStat = async (params: {
  readonly absolutePath: string;
  readonly fileName: WorkflowArtifactFileName;
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<Awaited<ReturnType<typeof stat>> | null> => {
  const canonicalStat = await stat(params.absolutePath).catch(() => null);
  if (canonicalStat?.isFile()) {
    return canonicalStat;
  }

  if (
    params.stage !== "virtual_simulation" ||
    params.fileName !== "virtual-simulation.md"
  ) {
    return canonicalStat;
  }

  await moveVirtualSimulationAliasIfPresent({
    canonicalAbsolutePath: params.absolutePath,
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  return await stat(params.absolutePath).catch(() => null);
};

const moveVirtualSimulationAliasIfPresent = async (params: {
  readonly canonicalAbsolutePath: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const aliasDir = path.join(
    params.workspaceRoot,
    ".codeai-hub",
    params.workspaceSlug,
    VIRTUAL_SIMULATION_ALIAS_DIR
  );
  const aliasPath = path.join(aliasDir, "virtual-simulation.md");
  const aliasStat = await stat(aliasPath).catch(() => null);
  if (!aliasStat?.isFile()) {
    return;
  }

  await mkdir(path.dirname(params.canonicalAbsolutePath), { recursive: true });
  await rename(aliasPath, params.canonicalAbsolutePath);
  await removeEmptyVirtualSimulationAliasDir(aliasDir);
};

const removeEmptyVirtualSimulationAliasDir = async (
  aliasDir: string
): Promise<void> => {
  const entries = await readdir(aliasDir).catch(() => null);
  if (!entries || entries.some((entry) => !isDisposableAliasEntry(entry))) {
    return;
  }
  await rm(aliasDir, { force: true, recursive: true });
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
