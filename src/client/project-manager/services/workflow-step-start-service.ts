import type { ProviderStackId } from "../../../types/provider";
import { api } from "../api";
import { DescriptionSubmitService } from "./description-submit-service";

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
  private readonly submitService: SubmitQuestionnaireService;

  constructor(options?: {
    readonly getWorkflowState?: WorkflowStateGetter;
    readonly submitService?: SubmitQuestionnaireService;
  }) {
    this.getWorkflowState =
      options?.getWorkflowState ?? api.getWorkflowState.bind(api);
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
    return this.submitService.submitQuestionnaire({
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
    const questionnairePath =
      progressSubstep === null
        ? vsArtifactPath
        : `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`;
    return this.submitService.submitQuestionnaire({
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
