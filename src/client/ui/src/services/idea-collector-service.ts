import { sendChatMessage } from "../core-bridge/core-bridge";
import {
  persistIdeaArtifacts,
  resolveIdeaArtifactPaths,
} from "./idea-artifact-persistence";
import {
  extractIdeaCollectorArtifact,
  type IdeaCollectorArtifact,
} from "./idea-collector-artifact";
import {
  type IdeaContractSnapshot,
  loadIdeaContract,
} from "./idea-collector-contract";
import { postSystemNotice, resolveCoreHttpUrl } from "./idea-collector-support";
import { buildMessageWithWorkspaceContext } from "./idea-collector-workspace-context";
import { notifyMissingIdeaContext } from "./idea-questionnaire-messages";
import {
  clearQuestionnairePendingStored,
  isQuestionnairePendingStored,
  markQuestionnairePendingStored,
} from "./idea-questionnaire-pending-store";

const loadContract = (): Promise<IdeaContractSnapshot> => loadIdeaContract();

export class IdeaCollectorService {
  private static readonly activeSessions = new Set<string>();
  private static readonly artifacts = new Map<string, IdeaCollectorArtifact>();
  private static readonly noticesSent = new Set<string>();
  private static readonly pendingQuestionnaire = new Set<string>();
  private static readonly lastAssistantMessages = new Map<string, string>();
  private static readonly outputPathsBySession = new Map<
    string,
    IdeaContractSnapshot["outputPaths"]
  >();

  isIdeaCollectorSession(sessionId: string): boolean {
    if (IdeaCollectorService.activeSessions.has(sessionId)) {
      return true;
    }
    if (this.isQuestionnairePending(sessionId)) {
      IdeaCollectorService.activeSessions.add(sessionId);
      return true;
    }
    return false;
  }

  getLatestArtifact(sessionId: string): IdeaCollectorArtifact | null {
    return IdeaCollectorService.artifacts.get(sessionId) ?? null;
  }
  recordAssistantMessage(sessionId: string, content: string): void {
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return;
    }
    IdeaCollectorService.lastAssistantMessages.set(sessionId, trimmed);
  }
  getLastAssistantMessage(sessionId: string): string | null {
    return IdeaCollectorService.lastAssistantMessages.get(sessionId) ?? null;
  }
  getOutputPathsForSessionId(
    sessionId: string
  ): IdeaContractSnapshot["outputPaths"] | null {
    return IdeaCollectorService.outputPathsBySession.get(sessionId) ?? null;
  }
  startCollection(sessionId: string): void {
    IdeaCollectorService.activeSessions.add(sessionId);
    this.markQuestionnairePending(sessionId);
    if (!IdeaCollectorService.noticesSent.has(sessionId)) {
      IdeaCollectorService.noticesSent.add(sessionId);
      postSystemNotice(
        sessionId,
        "Запускаю Idea Collector. Заполните анкету и нажмите «Отправить анкету»."
      );
      postSystemNotice(
        sessionId,
        "Чтобы приложить существующие документы/файлы из workspace, можно:\n- написать в сообщении триггер (например, «прочитай/изучи/ознакомься») и указать пути к файлам (можно на отдельных строках);\n- или использовать команду:\n/read <relative-path>\n(можно несколько путей в одной строке, максимум 3)."
      );
    }
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
    const schema = await this.getNormalizedSchema();
    const augmentedContent = await buildMessageWithWorkspaceContext(
      sessionId,
      content
    );
    if (augmentedContent === "") {
      return;
    }
    sendChatMessage(sessionId, augmentedContent ?? content, {
      outputSchema: schema,
    });
  }

  async beginQuestionnaireReview(
    sessionId: string,
    content: string,
    outputPathsOverride?: IdeaContractSnapshot["outputPaths"]
  ): Promise<void> {
    if (!IdeaCollectorService.activeSessions.has(sessionId)) {
      IdeaCollectorService.activeSessions.add(sessionId);
    }
    this.clearQuestionnairePending(sessionId);
    const [prompt, schema] = await Promise.all([
      this.getPrompt(),
      this.getNormalizedSchema(),
    ]);
    const outputPaths = outputPathsOverride;
    if (!outputPaths) {
      notifyMissingIdeaContext(sessionId);
      return;
    }
    IdeaCollectorService.outputPathsBySession.set(sessionId, outputPaths);
    const promptWithPaths = this.buildPromptWithOutputPaths(
      prompt,
      outputPaths
    );
    const combinedContent = `${promptWithPaths}\n\n${content}`;
    sendChatMessage(sessionId, combinedContent, { outputSchema: schema });
  }

  handleStreamEvent(sessionId: string, event: unknown): void {
    if (!IdeaCollectorService.activeSessions.has(sessionId)) {
      return;
    }
    const artifact = extractIdeaCollectorArtifact(event);
    if (artifact) {
      IdeaCollectorService.artifacts.set(sessionId, artifact);
      this.persistIdeaArtifacts(sessionId, artifact).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        postSystemNotice(
          sessionId,
          `Не удалось сохранить артефакты идеи: ${message}`
        );
      });
    }
  }

  isQuestionnairePending(sessionId: string): boolean {
    if (IdeaCollectorService.pendingQuestionnaire.has(sessionId)) {
      return true;
    }
    if (isQuestionnairePendingStored(sessionId)) {
      IdeaCollectorService.pendingQuestionnaire.add(sessionId);
      return true;
    }
    return false;
  }

  private getPrompt(): Promise<string> {
    return this.getContract().then((contract) => contract.prompt);
  }

  private getNormalizedSchema(): Promise<Record<string, unknown>> {
    return this.getContract().then((contract) => contract.schema);
  }

  getQuestionnaireTemplateMarkdown(): Promise<string | null> {
    return loadContract().then(
      (contract) => contract.questionnaireTemplateMarkdown
    );
  }

  getOutputPaths(): Promise<IdeaContractSnapshot["outputPaths"]> {
    return this.getContract().then((contract) => contract.outputPaths);
  }

  getOutputPathsForSession(
    outputPathsOverride?: IdeaContractSnapshot["outputPaths"]
  ): Promise<IdeaContractSnapshot["outputPaths"]> {
    if (outputPathsOverride) {
      return Promise.resolve(outputPathsOverride);
    }
    return this.getOutputPaths();
  }

  private getContract(): Promise<IdeaContractSnapshot> {
    return loadContract();
  }

  private markQuestionnairePending(sessionId: string): void {
    IdeaCollectorService.pendingQuestionnaire.add(sessionId);
    markQuestionnairePendingStored(sessionId);
  }

  private clearQuestionnairePending(sessionId: string): void {
    IdeaCollectorService.pendingQuestionnaire.delete(sessionId);
    clearQuestionnairePendingStored(sessionId);
  }

  private async persistIdeaArtifacts(
    sessionId: string,
    artifact: IdeaCollectorArtifact
  ): Promise<void> {
    const httpUrl = resolveCoreHttpUrl();
    const paths = resolveIdeaArtifactPaths(
      IdeaCollectorService.outputPathsBySession,
      sessionId,
      artifact
    );
    if (!paths) {
      postSystemNotice(
        sessionId,
        "Не могу сохранить артефакты идеи: не удалось определить пути для сохранения. Перезапустите этап и попробуйте снова."
      );
      return;
    }
    if (!httpUrl) {
      postSystemNotice(
        sessionId,
        `Не могу сохранить артефакты идеи: Core HTTP URL не определён. Ожидаемые пути: ${paths.ideaPath}, ${paths.virtualSimulationPath}.`
      );
      return;
    }

    try {
      const result = await persistIdeaArtifacts({
        httpUrl,
        sessionId,
        artifact,
        paths,
      });
      if (!result.ok) {
        postSystemNotice(
          sessionId,
          `Не удалось сохранить артефакты идеи (${result.error}). Ожидаемые пути: ${paths.ideaPath}, ${paths.virtualSimulationPath}.`
        );
        return;
      }
      const verb =
        artifact.nextAction === "revise_artifacts" ? "обновлены" : "сохранены";
      postSystemNotice(
        sessionId,
        `Артефакты идеи ${verb} в workspace: ${result.paths.idea} и ${result.paths.virtualSimulation}`
      );
    } catch {
      postSystemNotice(
        sessionId,
        `Не удалось сохранить артефакты идеи: ошибка сети. Ожидаемые пути: ${paths.ideaPath}, ${paths.virtualSimulationPath}.`
      );
    }
  }

  private buildPromptWithOutputPaths(
    prompt: string,
    outputPaths: IdeaContractSnapshot["outputPaths"]
  ): string {
    return (
      `${prompt}\n\n` +
      "Пути сохранения для этой сессии (используй в Structured Output):\n" +
      `- idea.md: ${outputPaths.idea}\n` +
      `- virtual-simulation.md: ${outputPaths.virtualSimulation}`
    );
  }
}
