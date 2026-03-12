import { stat } from "node:fs/promises";
import path from "node:path";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { DescriptionBranchSnapshot } from "../description/description-step-types";
import type { WorkflowStageId } from "../watcher/watcher-types";
import type {
  WorkflowArtifactState,
  WorkflowStageState,
  WorkflowState,
} from "./workflow-state-types";

const STAGE_ARTIFACT_FILE_NAMES: Record<WorkflowStageId, string> = {
  description: "Final_Description.md",
  virtual_simulation: "virtual-simulation.md",
  diagram_modules: "modules-diagram.mmd",
  diagram_facades: "facades-graph.mmd",
};

type CanonicalArtifactStage = Exclude<WorkflowStageId, "description">;

const STAGES_WITH_CANONICAL_ARTIFACTS: readonly CanonicalArtifactStage[] = [
  "virtual_simulation",
  "diagram_modules",
  "diagram_facades",
];

const normalizeArtifactPath = (value: string): string =>
  value.replace(/\\/g, "/").trim();

const hasArtifact = (
  artifacts: readonly WorkflowArtifactState[],
  artifactPath: string
): boolean =>
  artifacts.some(
    (artifact) => normalizeArtifactPath(artifact.path) === artifactPath
  );

const upsertArtifact = (
  stageState: WorkflowStageState,
  artifact: WorkflowArtifactState
): WorkflowStageState =>
  hasArtifact(stageState.artifacts, artifact.path)
    ? stageState
    : {
        ...stageState,
        artifacts: [...stageState.artifacts, artifact],
        updatedAt: artifact.updatedAt,
      };

const resolveChainUpdatedAt = (
  chains: readonly ContinuityChainSummary[],
  stage: WorkflowStageId
): string | null => {
  let updatedAt: string | null = null;
  for (const chain of chains) {
    if (chain.stage !== stage || chain.segments.length === 0) {
      continue;
    }
    if (!updatedAt || chain.updatedAt.localeCompare(updatedAt) > 0) {
      updatedAt = chain.updatedAt;
    }
  }
  return updatedAt;
};

const resolveCanonicalArtifact = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly stage: CanonicalArtifactStage;
}): Promise<WorkflowArtifactState | null> => {
  const fileName = STAGE_ARTIFACT_FILE_NAMES[params.stage];
  const absolutePath = path.join(
    params.workspaceRoot,
    ".codeai-hub",
    params.workspaceSlug,
    params.stage,
    fileName
  );
  try {
    const metadata = await stat(absolutePath);
    if (!metadata.isFile()) {
      return null;
    }
    return {
      path: `${params.stage}/${fileName}`,
      updatedAt: metadata.mtime.toISOString(),
    };
  } catch {
    return null;
  }
};

const shouldKeepDerivedStatus = (stageState: WorkflowStageState): boolean =>
  stageState.status !== "invalid" && stageState.status !== "outdated";

const markStageInProgress = (
  stageState: WorkflowStageState,
  updatedAt: string
): WorkflowStageState =>
  stageState.status === "idle"
    ? { ...stageState, status: "in_progress", updatedAt }
    : stageState;

const markStageCompleted = (
  stageState: WorkflowStageState,
  artifact: WorkflowArtifactState
): WorkflowStageState => {
  const withArtifact = upsertArtifact(stageState, artifact);
  if (!shouldKeepDerivedStatus(withArtifact)) {
    return withArtifact;
  }
  return {
    ...withArtifact,
    status: "completed",
    updatedAt: artifact.updatedAt,
  };
};

export const reconcileWorkflowState = async (params: {
  readonly state: WorkflowState;
  readonly description: DescriptionBranchSnapshot | null;
  readonly chains: readonly ContinuityChainSummary[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<WorkflowState> => {
  const descriptionStage = params.state.stages.description;
  const descriptionChainUpdatedAt = resolveChainUpdatedAt(
    params.chains,
    "description"
  );
  const descriptionHasActivity = Boolean(
    params.description?.questionnairePath ||
      params.description?.draftPath ||
      params.description?.collectorSession ||
      params.description?.session ||
      descriptionChainUpdatedAt
  );

  let nextDescription = descriptionStage;
  if (params.description?.finalPath) {
    nextDescription = markStageCompleted(descriptionStage, {
      path: `description/${STAGE_ARTIFACT_FILE_NAMES.description}`,
      updatedAt: params.description.updatedAt,
    });
  } else if (descriptionHasActivity && descriptionChainUpdatedAt) {
    nextDescription = markStageInProgress(
      descriptionStage,
      descriptionChainUpdatedAt
    );
  }

  const canonicalArtifacts = await Promise.all(
    STAGES_WITH_CANONICAL_ARTIFACTS.map(async (stage) => ({
      stage,
      artifact: await resolveCanonicalArtifact({
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
        stage,
      }),
    }))
  );

  let didChange = nextDescription !== descriptionStage;
  const nextStages: WorkflowState["stages"] = {
    ...params.state.stages,
    description: nextDescription,
  };

  for (const { stage, artifact } of canonicalArtifacts) {
    const current = nextStages[stage];
    const chainUpdatedAt = resolveChainUpdatedAt(params.chains, stage);
    let next = current;
    if (artifact) {
      next = markStageCompleted(current, artifact);
    } else if (chainUpdatedAt) {
      next = markStageInProgress(current, chainUpdatedAt);
    }
    nextStages[stage] = next;
    didChange ||= next !== current;
  }

  if (!didChange) {
    return params.state;
  }

  let updatedAt = params.state.updatedAt;
  for (const stage of Object.values(nextStages)) {
    if (stage.updatedAt.localeCompare(updatedAt) > 0) {
      updatedAt = stage.updatedAt;
    }
  }

  return {
    ...params.state,
    stages: nextStages,
    updatedAt,
  };
};
