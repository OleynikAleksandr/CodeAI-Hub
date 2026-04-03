import type { ProviderStackId } from "../../../types/provider";
import { api } from "../api";
import {
  DescriptionSubmitService,
  resolveArtifactsForTheUserLanguage,
} from "./description-submit-service";
import type { SettingsLoadedPayload } from "../core-stream-message-types";

type StartWorkflowStepParams = {
  readonly workspaceName?: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly providerId: ProviderStackId;
  readonly onSessionCreated?: (sessionId: string) => void;
};

type ContinuityStageId = "virtual_simulation" | "diagram_modules";

type WorkflowStateGetter = (
  workspaceSlug: string,
  workspacePath?: string
) => ReturnType<typeof api.getWorkflowState>;

type SettingsPayloadGetter = () => SettingsLoadedPayload | null;

type SubmitQuestionnaireService = Pick<
  DescriptionSubmitService,
  "submitQuestionnaire"
>;

const readDiagramModulesSubstep = (
  state: Awaited<ReturnType<typeof api.getWorkflowState>> | null
): string | null => {
  const progress = state?.diagramModulesProgress;
  if (!progress || typeof progress !== "object" || Array.isArray(progress)) {
    return null;
  }
  const substep = progress.substep;
  return typeof substep === "string" ? substep : null;
};

const resolveMostRecentContinuitySessionId = (options: {
  readonly state: Awaited<ReturnType<typeof api.getWorkflowState>> | null;
  readonly stage: ContinuityStageId;
}): string | null => {
  const chains = options.state?.continuity?.chains ?? [];
  let best: { readonly updatedAt: string; readonly sessionId: string } | null = null;

  for (const chain of chains) {
    if (chain.stage !== options.stage) {
      continue;
    }
    const sessionId = chain.segments.at(-1)?.sessionId ?? null;
    if (!sessionId) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = { updatedAt: chain.updatedAt, sessionId };
    }
  }

  return best?.sessionId ?? null;
};

export class WorkflowStepStartService {
  private readonly getWorkflowState: WorkflowStateGetter;
  private readonly getSettingsPayload: SettingsPayloadGetter;
  private readonly submitService: SubmitQuestionnaireService;

  constructor(options?: {
    readonly getWorkflowState?: WorkflowStateGetter;
    readonly getSettingsPayload?: SettingsPayloadGetter;
    readonly submitService?: SubmitQuestionnaireService;
  }) {
    this.getWorkflowState =
      options?.getWorkflowState ?? api.getWorkflowState.bind(api);
    this.getSettingsPayload =
      options?.getSettingsPayload ?? api.getLastSettingsPayload.bind(api);
    this.submitService =
      options?.submitService ?? new DescriptionSubmitService();
  }

  async startVirtualSimulation(params: StartWorkflowStepParams): Promise<string> {
    const state = await this.getWorkflowState(
      params.workspaceSlug,
      params.workspacePath
    );
    const existingSessionId = resolveMostRecentContinuitySessionId({
      state,
      stage: "virtual_simulation",
    });
    if (existingSessionId) {
      params.onSessionCreated?.(existingSessionId);
      return existingSessionId;
    }

    const finalDescriptionPath = state?.description?.finalPath;
    if (!finalDescriptionPath) {
      throw new Error("Missing Final_Description.md. Complete Description step first.");
    }
    const artifactLanguage = resolveArtifactsForTheUserLanguage(
      this.getSettingsPayload()
    );
    return this.submitService.submitQuestionnaire({
      artifactLanguage,
      workspaceName: params.workspaceName,
      workspaceSlug: params.workspaceSlug,
      workspacePath: params.workspacePath,
      questionnairePath: finalDescriptionPath,
      stage: "virtual_simulation",
      providerId: params.providerId,
      onSessionCreated: params.onSessionCreated,
    });
  }

  async startDiagramModules(params: StartWorkflowStepParams): Promise<string> {
    const state = await this.getWorkflowState(
      params.workspaceSlug,
      params.workspacePath
    );
    const existingSessionId = resolveMostRecentContinuitySessionId({
      state,
      stage: "diagram_modules",
    });
    if (existingSessionId) {
      params.onSessionCreated?.(existingSessionId);
      return existingSessionId;
    }

    const vsArtifactPath = `.codeai-hub/${params.workspaceSlug}/virtual_simulation/virtual-simulation.md`;
    const modulesBlocked = state?.gating?.blocked?.diagram_modules ?? true;
    if (modulesBlocked) {
      throw new Error("Missing virtual-simulation.md. Complete Virtual Simulation step first.");
    }
    const progressSubstep = readDiagramModulesSubstep(state);
    const artifactLanguage = resolveArtifactsForTheUserLanguage(
      this.getSettingsPayload()
    );
    const questionnairePath =
      progressSubstep === null
        ? vsArtifactPath
        : `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`;
    return this.submitService.submitQuestionnaire({
      artifactLanguage,
      workspaceName: params.workspaceName,
      workspaceSlug: params.workspaceSlug,
      workspacePath: params.workspacePath,
      questionnairePath,
      stage: "diagram_modules",
      providerId: params.providerId,
      onSessionCreated: params.onSessionCreated,
    });
  }

}
