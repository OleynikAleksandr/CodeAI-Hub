import { sendChatMessage } from "../core-bridge/core-bridge";
import {
  extractIdeaCollectorArtifact,
  type IdeaCollectorArtifact,
} from "./idea-collector-artifact";
import { saveIdeaCollectorArtifacts } from "./idea-collector-artifact-saver";
import {
  type DescriptionContractSnapshot,
  type IdeaContractSnapshot,
  loadDescriptionContract,
  loadIdeaContract,
  loadVirtualSimulationContract,
  type VirtualSimulationContractSnapshot,
} from "./idea-collector-contract";
import {
  enforceArtifactsRequired,
  isFinalizeTrigger,
} from "./idea-collector-finalize-utils";
import {
  IdeaCollectorSessionState,
  type WorkflowStageId,
} from "./idea-collector-session-state";
import { postSystemNotice } from "./idea-collector-support";
import { buildMessageWithWorkspaceContext } from "./idea-collector-workspace-context";
import { notifyMissingIdeaContext } from "./idea-questionnaire-messages";
import {
  clearQuestionnairePendingStored,
  isQuestionnairePendingStored,
  markQuestionnairePendingStored,
} from "./idea-questionnaire-pending-store";

type WorkflowContractSnapshot =
  | DescriptionContractSnapshot
  | VirtualSimulationContractSnapshot;

const loadContractForStage = (
  stage: WorkflowStageId
): Promise<WorkflowContractSnapshot> =>
  stage === "virtual_simulation"
    ? loadVirtualSimulationContract()
    : loadDescriptionContract();

const loadLegacyContract = (): Promise<IdeaContractSnapshot> =>
  loadIdeaContract();

export class IdeaCollectorService {
  private readonly state = new IdeaCollectorSessionState();

  isIdeaCollectorSession(sessionId: string): boolean {
    if (this.state.isActive(sessionId)) {
      return true;
    }
    if (this.isQuestionnairePending(sessionId)) {
      this.state.markActive(sessionId);
      return true;
    }
    return false;
  }

  getLatestArtifact(sessionId: string): IdeaCollectorArtifact | null {
    return this.state.getArtifact(sessionId);
  }
  recordAssistantMessage(sessionId: string, content: string): void {
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return;
    }
    this.state.recordAssistantMessage(sessionId, trimmed);
  }
  getLastAssistantMessage(sessionId: string): string | null {
    return this.state.getLastAssistantMessage(sessionId);
  }
  getOutputPathsForSessionId(
    sessionId: string
  ): IdeaContractSnapshot["outputPaths"] | null {
    return this.state.getOutputPaths(sessionId);
  }

  setSessionStage(sessionId: string, stage: WorkflowStageId): void {
    this.state.setStage(sessionId, stage);
  }

  startCollection(
    sessionId: string,
    stage: WorkflowStageId = "description"
  ): void {
    this.state.markActive(sessionId);
    this.setSessionStage(sessionId, stage);

    if (stage === "description") {
      this.markQuestionnairePending(sessionId);
      if (!this.state.hasNoticeSent(sessionId)) {
        this.state.markNoticeSent(sessionId);
        postSystemNotice(
          sessionId,
          "Запускаю Description. Заполните анкету и нажмите «Отправить анкету»."
        );
        postSystemNotice(
          sessionId,
          "Если нужно учесть файлы проекта — просто укажите пути к ним (relative или absolute) в сообщении. Агент прочитает файлы напрямую и продолжит интервью."
        );
      }
      return;
    }

    if (!this.state.hasNoticeSent(sessionId)) {
      this.state.markNoticeSent(sessionId);
      postSystemNotice(
        sessionId,
        "Запускаю Virtual Simulation. При необходимости приложите Final_Description.md или другие файлы проекта."
      );
    }
  }

  startVirtualSimulation(sessionId: string): void {
    this.startCollection(sessionId, "virtual_simulation");
  }

  async continueConversation(
    sessionId: string,
    content: string
  ): Promise<void> {
    if (!this.isIdeaCollectorSession(sessionId)) {
      return;
    }
    if (this.isQuestionnairePending(sessionId)) {
      postSystemNotice(
        sessionId,
        "Анкета ещё не отправлена. Заполните анкету и нажмите «Отправить анкету»."
      );
      return;
    }
    const schema = await this.getNormalizedSchemaForSession(sessionId);
    const augmentedContent = await buildMessageWithWorkspaceContext(
      sessionId,
      content
    );
    if (augmentedContent === "") {
      return;
    }
    const outputSchema = isFinalizeTrigger(content)
      ? enforceArtifactsRequired(schema)
      : schema;
    sendChatMessage(sessionId, augmentedContent ?? content, {
      outputSchema,
    });
  }

  async beginQuestionnaireReview(
    sessionId: string,
    content: string,
    outputPathsOverride?: IdeaContractSnapshot["outputPaths"]
  ): Promise<void> {
    if (!this.state.isActive(sessionId)) {
      this.state.markActive(sessionId);
    }
    this.setSessionStage(sessionId, "description");
    this.clearQuestionnairePending(sessionId);
    const [prompt, schema] = await Promise.all([
      this.getPrompt("description"),
      this.getNormalizedSchema("description"),
    ]);
    const outputPaths = outputPathsOverride;
    if (!outputPaths) {
      notifyMissingIdeaContext(sessionId);
      return;
    }
    this.state.setOutputPaths(sessionId, outputPaths);
    const promptWithSlots = this.buildPromptWithOutputSlots(
      prompt,
      "description"
    );
    const combinedContent = `${promptWithSlots}\n\n${content}`;
    sendChatMessage(sessionId, combinedContent, { outputSchema: schema });
  }

  handleStreamEvent(sessionId: string, event: unknown): void {
    const artifact = extractIdeaCollectorArtifact(event);
    if (artifact) {
      this.state.markActive(sessionId);
      this.state.recordArtifact(sessionId, artifact);
      saveIdeaCollectorArtifacts(sessionId, artifact).catch(
        (error: unknown) => {
          const message =
            error instanceof Error ? error.message : String(error);
          postSystemNotice(
            sessionId,
            `Не удалось сохранить артефакты: ${message}`
          );
        }
      );
    }
  }

  isQuestionnairePending(sessionId: string): boolean {
    if (this.state.isQuestionnairePending(sessionId)) {
      return true;
    }
    if (isQuestionnairePendingStored(sessionId)) {
      this.state.markQuestionnairePending(sessionId);
      return true;
    }
    return false;
  }

  private getPrompt(stage: WorkflowStageId): Promise<string> {
    return this.getContract(stage).then((contract) => contract.prompt);
  }

  private getNormalizedSchema(
    stage: WorkflowStageId
  ): Promise<Record<string, unknown>> {
    return this.getContract(stage).then((contract) => contract.schema);
  }

  private getNormalizedSchemaForSession(
    sessionId: string
  ): Promise<Record<string, unknown>> {
    const stage = this.getSessionStage(sessionId);
    return this.getNormalizedSchema(stage);
  }

  getQuestionnaireTemplateMarkdown(): Promise<string | null> {
    return loadDescriptionContract().then(
      (contract) => contract.questionnaireTemplateMarkdown
    );
  }

  getOutputPaths(): Promise<IdeaContractSnapshot["outputPaths"]> {
    return this.getLegacyContract().then((contract) => contract.outputPaths);
  }

  getOutputPathsForSession(
    outputPathsOverride?: IdeaContractSnapshot["outputPaths"]
  ): Promise<IdeaContractSnapshot["outputPaths"]> {
    if (outputPathsOverride) {
      return Promise.resolve(outputPathsOverride);
    }
    return this.getOutputPaths();
  }

  private getContract(
    stage: WorkflowStageId
  ): Promise<WorkflowContractSnapshot> {
    return loadContractForStage(stage);
  }

  private getLegacyContract(): Promise<IdeaContractSnapshot> {
    return loadLegacyContract();
  }

  private getSessionStage(sessionId: string): WorkflowStageId {
    return this.state.getStage(sessionId);
  }

  private markQuestionnairePending(sessionId: string): void {
    this.state.markQuestionnairePending(sessionId);
    markQuestionnairePendingStored(sessionId);
  }

  private clearQuestionnairePending(sessionId: string): void {
    this.state.clearQuestionnairePending(sessionId);
    clearQuestionnairePendingStored(sessionId);
  }

  private buildPromptWithOutputSlots(
    prompt: string,
    stage: WorkflowStageId
  ): string {
    const slotLines =
      stage === "virtual_simulation"
        ? ["- virtual-simulation.md: workspace.virtual_simulation"]
        : ["- Final_Description.md: workspace.description"];
    return (
      `${prompt}\n\n` +
      "Слоты сохранения для этой сессии (используй в Structured Output):\n" +
      `${slotLines.join("\n")}`
    );
  }
}
