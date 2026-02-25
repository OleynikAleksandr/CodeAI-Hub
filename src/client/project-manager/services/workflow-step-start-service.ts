import type { ProviderStackId } from "../../../types/provider";
import { IdeaCollectorSubmitService } from "./idea-collector-submit-service";

type StartVirtualSimulationParams = {
  readonly workspaceName?: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly providerId: ProviderStackId;
  readonly onSessionCreated?: (sessionId: string) => void;
};

export class WorkflowStepStartService {
  private readonly submitService = new IdeaCollectorSubmitService();

  async startVirtualSimulation(params: StartVirtualSimulationParams): Promise<string> {
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

