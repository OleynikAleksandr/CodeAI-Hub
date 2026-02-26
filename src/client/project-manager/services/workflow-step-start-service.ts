import type { ProviderStackId } from "../../../types/provider";
import { api } from "../api";
import { IdeaCollectorSubmitService } from "./idea-collector-submit-service";

type StartWorkflowStepParams = {
  readonly workspaceName?: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly providerId: ProviderStackId;
  readonly onSessionCreated?: (sessionId: string) => void;
};

type ContinuityStageId = "virtual_simulation" | "diagram_modules" | "diagram_facades";

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
  private readonly submitService = new IdeaCollectorSubmitService();

  async startVirtualSimulation(params: StartWorkflowStepParams): Promise<string> {
    const state = await api.getWorkflowState(params.workspaceSlug, params.workspacePath);
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
    const state = await api.getWorkflowState(params.workspaceSlug, params.workspacePath);
    const existingSessionId = resolveMostRecentContinuitySessionId({
      state,
      stage: "diagram_modules",
    });
    if (existingSessionId) {
      params.onSessionCreated?.(existingSessionId);
      return existingSessionId;
    }

    const vsArtifactPath = `.codeai-hub/${params.workspaceSlug}/virtual_simulation/virtual-simulation.md`;
    const vsStatus = state?.stages.virtual_simulation;
    if (vsStatus !== "completed") {
      throw new Error("Missing virtual-simulation.md. Complete Virtual Simulation step first.");
    }
    return this.submitService.submitQuestionnaire({
      workspaceName: params.workspaceName,
      workspaceSlug: params.workspaceSlug,
      workspacePath: params.workspacePath,
      questionnairePath: vsArtifactPath,
      stage: "diagram_modules",
      providerId: params.providerId,
      onSessionCreated: params.onSessionCreated,
    });
  }

  async startDiagramFacades(params: StartWorkflowStepParams): Promise<string> {
    const state = await api.getWorkflowState(params.workspaceSlug, params.workspacePath);
    const existingSessionId = resolveMostRecentContinuitySessionId({
      state,
      stage: "diagram_facades",
    });
    if (existingSessionId) {
      params.onSessionCreated?.(existingSessionId);
      return existingSessionId;
    }

    const dmArtifactPath = `.codeai-hub/${params.workspaceSlug}/diagram_modules/modules-diagram.mmd`;
    const dmStatus = state?.stages.diagram_modules;
    if (dmStatus !== "completed") {
      throw new Error("Missing modules-diagram.mmd. Complete Diagram Modules step first.");
    }
    return this.submitService.submitQuestionnaire({
      workspaceName: params.workspaceName,
      workspaceSlug: params.workspaceSlug,
      workspacePath: params.workspacePath,
      questionnairePath: dmArtifactPath,
      stage: "diagram_facades",
      providerId: params.providerId,
      onSessionCreated: params.onSessionCreated,
    });
  }
}
