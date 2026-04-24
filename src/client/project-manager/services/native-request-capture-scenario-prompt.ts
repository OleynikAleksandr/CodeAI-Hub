import type { SettingsLoadedPayload } from "../core-stream-message-types";
import {
  loadWorkflowContract,
  resolveArtifactsForTheUserLanguage,
  type WorkflowContractSnapshot,
} from "./description-submit-service";
import {
  buildWorkflowPromptPack,
  type WorkflowStageId,
} from "./prompt-pack-builder";
import type { WorkflowStateSnapshot } from "./workflow-state-client";

export type NativeRequestCaptureScenarioId = WorkflowStageId;

type WorkflowStateGetter = (
  workspaceSlug: string,
  workspacePath?: string
) => Promise<WorkflowStateSnapshot | null>;

type WorkflowContractLoader = (
  stage: WorkflowStageId
) => Promise<WorkflowContractSnapshot>;

interface NativeRequestCaptureScenarioPromptParams {
  readonly artifactLanguage?: string;
  readonly getWorkflowState: WorkflowStateGetter;
  readonly loadContract?: WorkflowContractLoader;
  readonly scenarioId: NativeRequestCaptureScenarioId;
  readonly settingsPayload?: SettingsLoadedPayload | null;
  readonly workspaceName?: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

export interface NativeRequestCaptureScenarioPrompt {
  readonly artifactLanguage: string;
  readonly inputPath: string;
  readonly prompt: string;
  readonly promptPath: string;
  readonly scenarioId: NativeRequestCaptureScenarioId;
  readonly scenarioLabel: string;
  readonly targetAbsolutePath: string;
  readonly targetRelativePath: string;
  readonly templatePath?: string;
}

const SCENARIO_LABELS: Record<NativeRequestCaptureScenarioId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
};

const buildQuestionnairePath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/description/questionnaire.md`;

const buildVirtualSimulationPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`;

const buildDiagramModulesIndexPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`;

const readDiagramModulesSubstep = (
  state: WorkflowStateSnapshot | null
): string | null => {
  const progress = state?.diagramModulesProgress;
  if (!progress || typeof progress !== "object" || Array.isArray(progress)) {
    return null;
  }
  return typeof progress.substep === "string" ? progress.substep : null;
};

const resolveScenarioInputPath = (params: {
  readonly scenarioId: NativeRequestCaptureScenarioId;
  readonly state: WorkflowStateSnapshot | null;
  readonly workspaceSlug: string;
}): string => {
  if (params.scenarioId === "description") {
    return (
      params.state?.description?.questionnairePath ??
      buildQuestionnairePath(params.workspaceSlug)
    );
  }

  if (params.scenarioId === "virtual_simulation") {
    const finalDescriptionPath = params.state?.description?.finalPath;
    if (!finalDescriptionPath) {
      throw new Error(
        "Missing Final_Description.md. Complete Description step first."
      );
    }
    return finalDescriptionPath;
  }

  const modulesBlocked = params.state?.gating.blocked.diagram_modules ?? true;
  if (modulesBlocked) {
    throw new Error(
      "Missing virtual-simulation.md. Complete Virtual Simulation step first."
    );
  }

  return readDiagramModulesSubstep(params.state) === null
    ? buildVirtualSimulationPath(params.workspaceSlug)
    : buildDiagramModulesIndexPath(params.workspaceSlug);
};

export const buildNativeRequestCaptureScenarioPrompt = async (
  params: NativeRequestCaptureScenarioPromptParams
): Promise<NativeRequestCaptureScenarioPrompt> => {
  const state = await params.getWorkflowState(
    params.workspaceSlug,
    params.workspacePath
  );
  const inputPath = resolveScenarioInputPath({
    scenarioId: params.scenarioId,
    state,
    workspaceSlug: params.workspaceSlug,
  });
  const contractLoader = params.loadContract ?? loadWorkflowContract;
  const contract = await contractLoader(params.scenarioId);
  const artifactLanguage =
    params.artifactLanguage ??
    resolveArtifactsForTheUserLanguage(params.settingsPayload);
  const promptPack = buildWorkflowPromptPack({
    artifactLanguage,
    stage: params.scenarioId,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
    prompt: contract.prompt,
    templatePath: contract.paths.template,
    questionnairePath: inputPath,
  });

  return {
    artifactLanguage,
    inputPath,
    prompt: promptPack.content,
    promptPath: contract.paths.prompt,
    scenarioId: params.scenarioId,
    scenarioLabel: SCENARIO_LABELS[params.scenarioId],
    targetAbsolutePath: promptPack.absolutePath,
    targetRelativePath: promptPack.relativePath,
    templatePath: contract.paths.template,
  };
};
