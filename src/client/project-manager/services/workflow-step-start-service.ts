import type { ProviderStackId } from "../../../types/provider";
import { api } from "../api";
import { IdeaCollectorSubmitService } from "./idea-collector-submit-service";

type StartVirtualSimulationParams = {
  readonly workspaceName?: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly providerId: ProviderStackId;
  readonly onSessionCreated?: (sessionId: string) => void;
};

const resolveMostRecentContinuitySessionId = (options: {
  readonly state: Awaited<ReturnType<typeof api.getWorkflowState>> | null;
  readonly stage: "virtual_simulation";
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

  async startVirtualSimulation(params: StartVirtualSimulationParams): Promise<string> {
    const state = await api.getWorkflowState(params.workspaceSlug, params.workspacePath);
    const existingSessionId = resolveMostRecentContinuitySessionId({
      state,
      stage: "virtual_simulation",
    });
    if (existingSessionId) {
      params.onSessionCreated?.(existingSessionId);
      return existingSessionId;
    }

    const finalDescriptionPath = `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`;
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
}
