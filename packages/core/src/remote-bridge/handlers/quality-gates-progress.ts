import { readFile, stat } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";
import type {
  WorkflowStageState,
  WorkflowStageStatus,
  WorkflowState,
} from "../../workflow/state/workflow-state-types";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";

export type QualityGatesSubstep =
  | "artifact"
  | "awaiting_acceptance"
  | "accepted";

export interface QualityGatesProgressSnapshot {
  readonly accepted: boolean;
  readonly commandContractReady: boolean;
  readonly jsonExists: boolean;
  readonly markdownExists: boolean;
  readonly substep: QualityGatesSubstep;
}

const readExistingFile = async (
  absolutePath: string
): Promise<string | null> => {
  const fileStat = await stat(absolutePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }
  return readFile(absolutePath, "utf8").catch(() => null);
};

const parseJsonObject = (
  content: string | null
): Record<string, unknown> | null => {
  if (!content) {
    return null;
  }
  try {
    const parsed = JSON.parse(content) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const readAcceptedFlag = (value: Record<string, unknown> | null): boolean => {
  if (!value) {
    return false;
  }
  if (value.accepted === true) {
    return true;
  }
  const acceptance = value.acceptance;
  return (
    typeof acceptance === "object" &&
    acceptance !== null &&
    !Array.isArray(acceptance) &&
    (acceptance as Record<string, unknown>).accepted === true
  );
};

const hasCommandContract = (value: Record<string, unknown> | null): boolean =>
  typeof value?.commands === "object" &&
  value.commands !== null &&
  !Array.isArray(value.commands);

const resolveSubstep = (params: {
  readonly accepted: boolean;
  readonly jsonExists: boolean;
  readonly markdownExists: boolean;
}): QualityGatesSubstep => {
  if (params.accepted) {
    return "accepted";
  }
  return params.markdownExists && params.jsonExists
    ? "awaiting_acceptance"
    : "artifact";
};

export const readQualityGatesProgressSnapshot = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<QualityGatesProgressSnapshot | null> => {
  const markdownPath = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    stage: "quality_gates",
    fileName: "quality-gates.md",
  });
  const jsonPath = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    stage: "quality_gates",
    fileName: "quality-gates.json",
  });
  if (!(markdownPath.ok && jsonPath.ok)) {
    return null;
  }

  const markdown = await readExistingFile(markdownPath.value.absolutePath);
  const contract = parseJsonObject(
    await readExistingFile(jsonPath.value.absolutePath)
  );
  const markdownExists = Boolean(markdown);
  const jsonExists = Boolean(contract);
  if (!(markdownExists || jsonExists)) {
    return null;
  }

  const commandContractReady = hasCommandContract(contract);
  const accepted =
    markdownExists &&
    jsonExists &&
    commandContractReady &&
    readAcceptedFlag(contract);
  return {
    accepted,
    commandContractReady,
    jsonExists,
    markdownExists,
    substep: resolveSubstep({ accepted, jsonExists, markdownExists }),
  };
};

const normalizeArtifactPath = (value: string): string =>
  value.replace(/\\/g, "/").trim();

const stageHasArtifact = (params: {
  readonly state: WorkflowState;
  readonly stage: WorkflowStageId;
  readonly fileName: string;
}): boolean =>
  params.state.stages[params.stage].artifacts.some((artifact) =>
    normalizeArtifactPath(artifact.path).endsWith(`/${params.fileName}`)
  );

const resolveTechnicalStageStatus = (params: {
  readonly complete: boolean;
  readonly current: WorkflowStageStatus;
  readonly hasArtifact: boolean;
}): WorkflowStageStatus => {
  if (params.complete) {
    return "completed";
  }
  if (params.hasArtifact && params.current === "completed") {
    return "in_progress";
  }
  return params.current;
};

const updateTechnicalStage = (params: {
  readonly complete: boolean;
  readonly hasArtifact: boolean;
  readonly stage: WorkflowStageState;
}): WorkflowStageState => ({
  ...params.stage,
  status: resolveTechnicalStageStatus({
    complete: params.complete,
    current: params.stage.status,
    hasArtifact: params.hasArtifact,
  }),
});

export const applyTechnicalRootProgressToState = (params: {
  readonly applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot | null;
  readonly qualityGatesProgress: QualityGatesProgressSnapshot | null;
  readonly state: WorkflowState;
}): WorkflowState => {
  const applicationSkeleton = params.applicationSkeletonProgress
    ? updateTechnicalStage({
        stage: params.state.stages.application_skeleton,
        complete: params.applicationSkeletonProgress.materialized,
        hasArtifact:
          params.applicationSkeletonProgress.markdownExists ||
          params.applicationSkeletonProgress.mapExists,
      })
    : params.state.stages.application_skeleton;
  const qualityGates = params.qualityGatesProgress
    ? updateTechnicalStage({
        stage: params.state.stages.quality_gates,
        complete: params.qualityGatesProgress.accepted,
        hasArtifact:
          params.qualityGatesProgress.markdownExists ||
          params.qualityGatesProgress.jsonExists,
      })
    : params.state.stages.quality_gates;

  return {
    ...params.state,
    stages: {
      ...params.state.stages,
      application_skeleton: applicationSkeleton,
      quality_gates: qualityGates,
    },
  };
};

export const resolveWorkflowBlockedStages = (params: {
  readonly applicationSkeletonProgress?: ApplicationSkeletonProgressSnapshot | null;
  readonly description: {
    readonly draftPath?: string;
    readonly finalPath?: string;
  } | null;
  readonly diagramModulesProgress?: DiagramModulesProgressSnapshot | null;
  readonly state: WorkflowState;
}): Partial<Record<WorkflowStageId, boolean>> => {
  const descriptionDone = Boolean(params.description?.finalPath);
  const virtualSimulationArtifactAvailable = stageHasArtifact({
    state: params.state,
    stage: "virtual_simulation",
    fileName: "virtual-simulation.md",
  });
  return {
    description: false,
    virtual_simulation: !descriptionDone,
    diagram_modules: !virtualSimulationArtifactAvailable,
    application_skeleton: !params.diagramModulesProgress?.aggregateReady,
    quality_gates: !params.applicationSkeletonProgress?.materialized,
  };
};
