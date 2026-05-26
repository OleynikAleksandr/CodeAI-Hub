import { stat } from "node:fs/promises";
import type { SessionManager } from "../../session-manager";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";
import type { WorkflowArtifactFileName } from "../../workflow/paths/workflow-paths-types";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

type ContinuityEvidence = readonly {
  readonly segments: readonly unknown[];
  readonly stage?: string;
}[];

export const workflowArtifactFileExists = async (params: {
  readonly fileName: WorkflowArtifactFileName;
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<boolean> => {
  const artifactPath = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    stage: params.stage,
    fileName: params.fileName,
  });
  if (!artifactPath.ok) {
    return false;
  }
  const artifactStat = await stat(artifactPath.value.absolutePath).catch(
    () => null
  );
  return Boolean(artifactStat?.isFile());
};

const hasContinuityForStage = (
  chains: ContinuityEvidence,
  stage: WorkflowStageId
): boolean =>
  chains.some((chain) => chain.stage === stage && chain.segments.length > 0);

const resetStageProjection = (
  state: WorkflowState,
  stage: WorkflowStageId
): WorkflowState => {
  const stageState = state.stages[stage];
  if (
    stageState.status === "idle" &&
    stageState.artifacts.length === 0 &&
    stageState.gates.length === 0
  ) {
    return state;
  }
  return {
    ...state,
    stages: {
      ...state.stages,
      [stage]: {
        ...stageState,
        artifacts: [],
        gates: [],
        status: "idle",
      },
    },
  };
};

export const normalizeClearedWorkflowProjection = (params: {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly chains: ContinuityEvidence;
  readonly description: {
    readonly draftPath?: string;
    readonly finalPath?: string;
    readonly primarySession?: unknown;
  } | null;
  readonly diagramModulesProgress: DiagramModulesProgressSnapshot | null;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
  readonly sessionManager?: SessionManager;
  readonly state: WorkflowState;
  readonly virtualSimulationArtifactExists: boolean;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): WorkflowState => {
  const hasActiveSession = (stage: WorkflowStageId): boolean =>
    params.sessionManager
      ?.getSessionsByWorkspacePath(params.workspaceRoot)
      .some(
        (session) =>
          session.initiativeSlug === params.workspaceSlug &&
          session.stage === stage
      ) ?? false;
  const hasStageEvidence = (
    stage: WorkflowStageId,
    stageSpecificEvidence: boolean
  ): boolean =>
    stageSpecificEvidence ||
    hasContinuityForStage(params.chains, stage) ||
    hasActiveSession(stage);
  const evidence: Record<WorkflowStageId, boolean> = {
    description: hasStageEvidence(
      "description",
      Boolean(
        params.description?.draftPath ||
          params.description?.finalPath ||
          params.description?.primarySession
      )
    ),
    virtual_simulation: hasStageEvidence(
      "virtual_simulation",
      params.virtualSimulationArtifactExists
    ),
    diagram_modules: hasStageEvidence(
      "diagram_modules",
      Boolean(params.diagramModulesProgress)
    ),
    application_skeleton: hasStageEvidence(
      "application_skeleton",
      Boolean(params.applicationSkeletonProgress)
    ),
    quality_gates: hasStageEvidence(
      "quality_gates",
      Boolean(params.qualityGatesProgress)
    ),
  };

  let nextState = params.state;
  for (const stage of Object.keys(evidence) as WorkflowStageId[]) {
    if (!evidence[stage]) {
      nextState = resetStageProjection(nextState, stage);
    }
  }
  return nextState;
};
