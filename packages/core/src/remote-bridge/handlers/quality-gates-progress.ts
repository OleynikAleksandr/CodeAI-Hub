import { readFile, stat } from "node:fs/promises";
import path from "node:path";
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
  | "accepted"
  | "integrating"
  | "integrated"
  | "failed"
  | "outdated";

export interface QualityGatesProgressSnapshot {
  readonly accepted: boolean;
  readonly commandContractReady: boolean;
  readonly integrated: boolean;
  readonly integrationState: string | null;
  readonly jsonExists: boolean;
  readonly markdownExists: boolean;
  readonly substep: QualityGatesSubstep;
  readonly validationErrors: readonly string[];
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

const readIntegratedFlag = (value: Record<string, unknown> | null): boolean =>
  value?.integrated === true;

const readIntegrationState = (
  value: Record<string, unknown> | null
): string | null =>
  typeof value?.integrationState === "string" ? value.integrationState : null;

const hasCommandContract = (value: Record<string, unknown> | null): boolean =>
  typeof value?.commands === "object" &&
  value.commands !== null &&
  !Array.isArray(value.commands);

const readStringArray = (
  value: Record<string, unknown> | null,
  key: string
): readonly string[] =>
  Array.isArray(value?.[key])
    ? value[key].filter((entry): entry is string => typeof entry === "string")
    : [];

const toPackageScriptName = (gateId: string): string =>
  gateId.startsWith("qg-") ? `qg:${gateId.slice("qg-".length)}` : gateId;

const readHookText = async (
  workspaceRoot: string,
  hookName: string
): Promise<string> =>
  (await readExistingFile(path.join(workspaceRoot, ".husky", hookName))) ?? "";

const readPackageScripts = async (
  workspaceRoot: string
): Promise<Record<string, string>> => {
  const packageJson = parseJsonObject(
    await readExistingFile(path.join(workspaceRoot, "package.json"))
  );
  const scripts = packageJson?.scripts;
  if (
    typeof scripts !== "object" ||
    scripts === null ||
    Array.isArray(scripts)
  ) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(scripts).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
};

const hasAggregateHookRunner = (params: {
  readonly hookText: string;
  readonly packageScripts: Record<string, string>;
  readonly scope: "requiredBeforeCommit" | "requiredBeforePush";
  readonly scriptName: string;
}): boolean => {
  const script = params.packageScripts[params.scriptName];
  return Boolean(
    script?.includes("scripts/quality-gates/run.mjs") &&
      script.includes(params.scope) &&
      (params.hookText.includes(params.scriptName) ||
        params.hookText.includes(`npm run ${params.scriptName}`))
  );
};

const validateHookCommands = (params: {
  readonly gateIds: readonly string[];
  readonly hookName: string;
  readonly hookText: string;
}): readonly string[] =>
  params.gateIds
    .filter((gateId) => {
      const packageScriptName = toPackageScriptName(gateId);
      return !(
        params.hookText.includes(gateId) ||
        params.hookText.includes(packageScriptName)
      );
    })
    .map(
      (gateId) =>
        `Quality gate ${gateId} is missing from .husky/${params.hookName}`
    );

const validateDeclaredHookIntegration = async (params: {
  readonly contract: Record<string, unknown> | null;
  readonly declaredIntegrated: boolean;
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  if (!params.declaredIntegrated) {
    return [];
  }
  const [preCommitText, prePushText] = await Promise.all([
    readHookText(params.workspaceRoot, "pre-commit"),
    readHookText(params.workspaceRoot, "pre-push"),
  ]);
  const packageScripts = await readPackageScripts(params.workspaceRoot);
  const preCommitGateIds = readStringArray(
    params.contract,
    "requiredBeforeCommit"
  );
  const prePushGateIds = readStringArray(params.contract, "requiredBeforePush");
  return [
    ...(hasAggregateHookRunner({
      hookText: preCommitText,
      packageScripts,
      scope: "requiredBeforeCommit",
      scriptName: "qg:before-commit",
    })
      ? []
      : validateHookCommands({
          gateIds: preCommitGateIds,
          hookName: "pre-commit",
          hookText: preCommitText,
        })),
    ...(hasAggregateHookRunner({
      hookText: prePushText,
      packageScripts,
      scope: "requiredBeforePush",
      scriptName: "qg:before-push",
    })
      ? []
      : validateHookCommands({
          gateIds: prePushGateIds,
          hookName: "pre-push",
          hookText: prePushText,
        })),
  ];
};

const resolveSubstep = (params: {
  readonly accepted: boolean;
  readonly declaredIntegrated: boolean;
  readonly integrated: boolean;
  readonly integrationState: string | null;
  readonly jsonExists: boolean;
  readonly markdownExists: boolean;
  readonly validationErrors: readonly string[];
}): QualityGatesSubstep => {
  if (params.integrated) {
    return "integrated";
  }
  if (params.declaredIntegrated && params.validationErrors.length > 0) {
    return "failed";
  }
  if (params.integrationState === "in_progress") {
    return "integrating";
  }
  if (params.integrationState === "failed") {
    return "failed";
  }
  if (params.integrationState === "outdated") {
    return "outdated";
  }
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
  const integrationState = readIntegrationState(contract);
  const declaredIntegrated =
    accepted && commandContractReady && readIntegratedFlag(contract);
  const validationErrors = await validateDeclaredHookIntegration({
    contract,
    declaredIntegrated,
    workspaceRoot: params.workspaceRoot,
  });
  const integrated = declaredIntegrated && validationErrors.length === 0;
  return {
    accepted,
    commandContractReady,
    integrated,
    integrationState,
    jsonExists,
    markdownExists,
    substep: resolveSubstep({
      accepted,
      declaredIntegrated,
      integrated,
      integrationState,
      jsonExists,
      markdownExists,
      validationErrors,
    }),
    validationErrors,
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
  const applicationSkeleton = updateTechnicalStage({
    stage: params.state.stages.application_skeleton,
    complete: params.applicationSkeletonProgress?.materialized === true,
    hasArtifact:
      params.applicationSkeletonProgress?.markdownExists === true ||
      params.applicationSkeletonProgress?.mapExists === true ||
      stageHasArtifact({
        state: params.state,
        stage: "application_skeleton",
        fileName: "application-skeleton.md",
      }) ||
      stageHasArtifact({
        state: params.state,
        stage: "application_skeleton",
        fileName: "application-skeleton-map.json",
      }),
  });
  const qualityGates = params.qualityGatesProgress
    ? updateTechnicalStage({
        stage: params.state.stages.quality_gates,
        complete: params.qualityGatesProgress.integrated,
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
  readonly managedGitClean?: boolean;
  readonly state: WorkflowState;
}): Partial<Record<WorkflowStageId, boolean>> => {
  const descriptionDone = Boolean(params.description?.finalPath);
  const managedModeActive =
    params.state.stages.diagram_modules.status !== "idle";
  const virtualSimulationArtifactAvailable = stageHasArtifact({
    state: params.state,
    stage: "virtual_simulation",
    fileName: "virtual-simulation.md",
  });
  const managedGitBlocked = params.managedGitClean === false;
  return {
    description: managedModeActive,
    virtual_simulation: managedModeActive || !descriptionDone,
    diagram_modules: !virtualSimulationArtifactAvailable,
    application_skeleton:
      managedGitBlocked || !params.diagramModulesProgress?.aggregateReady,
    quality_gates:
      managedGitBlocked || !params.applicationSkeletonProgress?.materialized,
  };
};
