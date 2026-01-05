import { sendChatMessage } from "../core-bridge/core-bridge";
import {
  extractIdeaCollectorArtifact,
  type IdeaCollectorArtifact,
} from "./idea-collector-artifact";
import {
  type IdeaContractSnapshot,
  loadIdeaContract,
} from "./idea-collector-contract";
import {
  joinUrl,
  postSystemNotice,
  resolveCoreHttpUrl,
} from "./idea-collector-support";
import { buildMessageWithWorkspaceContext } from "./idea-collector-workspace-context";
import {
  clearQuestionnairePendingStored,
  isQuestionnairePendingStored,
  markQuestionnairePendingStored,
} from "./idea-questionnaire-pending-store";

const IDEA_ARTIFACT_ENDPOINT = "/api/v1/orchestrator/idea-artifact";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const loadContract = (): Promise<IdeaContractSnapshot> => loadIdeaContract();

export class IdeaCollectorService {
  private static readonly activeSessions = new Set<string>();
  private static readonly artifacts = new Map<string, IdeaCollectorArtifact>();
  private static readonly noticesSent = new Set<string>();
  private static readonly pendingQuestionnaire = new Set<string>();
  private contractPromise: Promise<IdeaContractSnapshot> | null = null;

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
    content: string
  ): Promise<void> {
    if (!IdeaCollectorService.activeSessions.has(sessionId)) {
      IdeaCollectorService.activeSessions.add(sessionId);
    }
    this.clearQuestionnairePending(sessionId);
    const [prompt, schema] = await Promise.all([
      this.getPrompt(),
      this.getNormalizedSchema(),
    ]);
    sendChatMessage(sessionId, prompt, { outputSchema: schema });
    sendChatMessage(sessionId, content, { outputSchema: schema });
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
    return this.getContract().then(
      (contract) => contract.questionnaireTemplateMarkdown
    );
  }

  getOutputPaths(): Promise<IdeaContractSnapshot["outputPaths"]> {
    return this.getContract().then((contract) => contract.outputPaths);
  }

  private getContract(): Promise<IdeaContractSnapshot> {
    if (!this.contractPromise) {
      this.contractPromise = loadContract();
    }
    return this.contractPromise;
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
    const contract = await this.getContract();
    if (!httpUrl) {
      postSystemNotice(
        sessionId,
        `Не могу сохранить артефакты идеи: Core HTTP URL не определён. Ожидаемые пути: ${contract.outputPaths.idea}, ${contract.outputPaths.virtualSimulation}.`
      );
      return;
    }

    try {
      const response = await fetch(joinUrl(httpUrl, IDEA_ARTIFACT_ENDPOINT), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          ideaMarkdown: artifact.ideaMarkdown,
          virtualSimulationMarkdown: artifact.virtualSimulationMarkdown,
          ideaPath: artifact.ideaPath,
          virtualSimulationPath: artifact.virtualSimulationPath,
        }),
      });

      if (!response.ok) {
        postSystemNotice(
          sessionId,
          `Не удалось сохранить артефакты идеи (HTTP ${response.status}). Ожидаемые пути: ${contract.outputPaths.idea}, ${contract.outputPaths.virtualSimulation}.`
        );
        return;
      }
      const payload = (await response.json()) as unknown;
      const savedIdeaPath =
        isRecord(payload) &&
        isRecord(payload.paths) &&
        typeof payload.paths.idea === "string"
          ? payload.paths.idea
          : artifact.ideaPath;
      const savedVirtualSimulationPath =
        isRecord(payload) &&
        isRecord(payload.paths) &&
        typeof payload.paths.virtualSimulation === "string"
          ? payload.paths.virtualSimulation
          : artifact.virtualSimulationPath;
      postSystemNotice(
        sessionId,
        `Артефакты идеи сохранены в workspace: ${savedIdeaPath} и ${savedVirtualSimulationPath}`
      );
    } catch {
      postSystemNotice(
        sessionId,
        `Не удалось сохранить артефакты идеи: ошибка сети. Ожидаемые пути: ${contract.outputPaths.idea}, ${contract.outputPaths.virtualSimulation}.`
      );
    }
  }
}
