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
type SettingsWorkflowCaptureScenarioId = Extract<
  NativeRequestCaptureScenarioId,
  "description" | "virtual_simulation" | "diagram_modules"
>;

type WorkflowStateGetter = (
  workspaceSlug: string,
  workspacePath?: string
) => Promise<WorkflowStateSnapshot | null>;

type WorkflowContractLoader = (
  stage: WorkflowStageId
) => Promise<WorkflowContractSnapshot>;

interface NativeRequestCaptureScenarioPromptParams<
  TScenarioId extends NativeRequestCaptureScenarioId = NativeRequestCaptureScenarioId,
> {
  readonly artifactLanguage?: string;
  readonly bypassUpstreamGuard?: boolean;
  readonly getWorkflowState: WorkflowStateGetter;
  readonly loadContract?: WorkflowContractLoader;
  readonly scenarioId: TScenarioId;
  readonly settingsPayload?: SettingsLoadedPayload | null;
  readonly workspaceName?: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

export interface NativeRequestCaptureScenarioPrompt<
  TScenarioId extends NativeRequestCaptureScenarioId = SettingsWorkflowCaptureScenarioId,
> {
  readonly artifactLanguage: string;
  readonly inputPath: string;
  readonly prompt: string;
  readonly promptPath: string;
  readonly scenarioId: TScenarioId;
  readonly scenarioLabel: string;
  readonly targetAbsolutePath: string;
  readonly targetRelativePath: string;
  readonly templatePath?: string;
}

const SCENARIO_LABELS: Record<NativeRequestCaptureScenarioId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
  application_skeleton: "Application Skeleton",
  quality_gates: "Quality Gates Baseline",
};

const buildQuestionnairePath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/description/questionnaire.md`;

const buildVirtualSimulationPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`;

const buildDiagramModulesIndexPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`;

const buildApplicationSkeletonMapPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton-map.json`;

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
  readonly bypassUpstreamGuard?: boolean;
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
      if (params.bypassUpstreamGuard) {
        return `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`;
      }
      throw new Error(
        "Missing Final_Description.md. Complete Description step first."
      );
    }
    return finalDescriptionPath;
  }

  if (params.scenarioId === "diagram_modules") {
    const modulesBlocked = params.state?.gating.blocked.diagram_modules ?? true;
    if (modulesBlocked && !params.bypassUpstreamGuard) {
      throw new Error(
        "Missing virtual-simulation.md. Complete Virtual Simulation step first."
      );
    }

    return readDiagramModulesSubstep(params.state) === null
      ? buildVirtualSimulationPath(params.workspaceSlug)
      : buildDiagramModulesIndexPath(params.workspaceSlug);
  }

  if (params.scenarioId === "application_skeleton") {
    const blockedStages = params.state?.gating.blocked as
      | Readonly<Record<string, boolean>>
      | undefined;
    const skeletonBlocked =
      blockedStages?.application_skeleton ?? true;
    if (skeletonBlocked && !params.bypassUpstreamGuard) {
      throw new Error(
        "Missing completed Diagram Modules. Complete Diagram Modules first."
      );
    }
    return buildDiagramModulesIndexPath(params.workspaceSlug);
  }

  const blockedStages = params.state?.gating.blocked as
    | Readonly<Record<string, boolean>>
    | undefined;
  const gatesBlocked = blockedStages?.quality_gates ?? true;
  if (gatesBlocked && !params.bypassUpstreamGuard) {
    throw new Error(
      "Missing accepted Application Skeleton. Complete Application Skeleton first."
    );
  }
  return buildApplicationSkeletonMapPath(params.workspaceSlug);
};

export const buildNativeRequestCaptureScenarioPrompt = async <
  TScenarioId extends NativeRequestCaptureScenarioId,
>(
  params: NativeRequestCaptureScenarioPromptParams<TScenarioId>
): Promise<NativeRequestCaptureScenarioPrompt<TScenarioId>> => {
  const state = await params.getWorkflowState(
    params.workspaceSlug,
    params.workspacePath
  );
  const inputPath = resolveScenarioInputPath({
    bypassUpstreamGuard: params.bypassUpstreamGuard,
    scenarioId: params.scenarioId,
    state,
    workspaceSlug: params.workspaceSlug,
  });
  const contract =
    params.loadContract === undefined
      ? await loadWorkflowContract(
          params.scenarioId as Parameters<typeof loadWorkflowContract>[0]
        )
      : await params.loadContract(params.scenarioId);
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
