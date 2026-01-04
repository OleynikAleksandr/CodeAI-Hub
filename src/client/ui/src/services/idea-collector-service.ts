import { IDEA_KICKOFF_PROMPT } from "../app-host/idea-kickoff-prompt";
import { sendChatMessage } from "../core-bridge/core-bridge";
import { extractIdeaContractQuestionnaireTemplate } from "../core-bridge/normalizers";
import {
  extractIdeaCollectorArtifact,
  type IdeaCollectorArtifact,
} from "./idea-collector-artifact";
import { IDEA_COLLECTOR_FALLBACK_SCHEMA } from "./idea-collector-fallback-schema";
import { normalizeIdeaCollectorSchema } from "./idea-collector-schema-utils";
import {
  joinUrl,
  postSystemNotice,
  resolveCoreHttpUrl,
} from "./idea-collector-support";
import { buildMessageWithWorkspaceContext } from "./idea-collector-workspace-context";

type IdeaContractPayload = {
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
  readonly questionnaire?: {
    readonly templateMarkdown?: string;
  };
  readonly outputPaths: {
    readonly idea: string;
    readonly virtualSimulation: string;
  };
};

type IdeaContractSnapshot = {
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
  readonly outputPaths: {
    readonly idea: string;
    readonly virtualSimulation: string;
  };
  readonly questionnaireTemplateMarkdown: string | null;
};

const IDEA_CONTRACT_ENDPOINT = "/api/v1/orchestrator/idea-contract";
const IDEA_ARTIFACT_ENDPOINT = "/api/v1/orchestrator/idea-artifact";
const FALLBACK_OUTPUT_PATHS = {
  idea: ".codeai-hub/full-development-flow/initiatives/full-development-flow/idea/idea.md",
  virtualSimulation:
    ".codeai-hub/full-development-flow/initiatives/full-development-flow/idea/virtual-simulation.md",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isIdeaContractPayload = (
  value: unknown
): value is IdeaContractPayload => {
  if (!isRecord(value)) {
    return false;
  }
  const outputPaths = value.outputPaths;
  return (
    typeof value.prompt === "string" &&
    value.prompt.length > 0 &&
    isRecord(value.schema) &&
    isRecord(outputPaths) &&
    typeof outputPaths.idea === "string" &&
    outputPaths.idea.length > 0 &&
    typeof outputPaths.virtualSimulation === "string" &&
    outputPaths.virtualSimulation.length > 0
  );
};

const fetchIdeaContract = async (): Promise<IdeaContractSnapshot | null> => {
  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    return null;
  }
  try {
    const response = await fetch(joinUrl(httpUrl, IDEA_CONTRACT_ENDPOINT));
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as unknown;
    if (!isIdeaContractPayload(payload)) {
      return null;
    }
    const schema = normalizeIdeaCollectorSchema(payload.schema, null);
    const questionnaireTemplateMarkdown =
      extractIdeaContractQuestionnaireTemplate(payload) ?? null;
    return {
      prompt: payload.prompt,
      schema,
      outputPaths: payload.outputPaths,
      questionnaireTemplateMarkdown,
    };
  } catch {
    return null;
  }
};

const loadContract = async (): Promise<IdeaContractSnapshot> => {
  const remote = await fetchIdeaContract();
  if (remote) {
    return remote;
  }
  const fallbackSchema = normalizeIdeaCollectorSchema(
    IDEA_COLLECTOR_FALLBACK_SCHEMA,
    null
  );
  return {
    prompt: IDEA_KICKOFF_PROMPT,
    schema: fallbackSchema,
    outputPaths: FALLBACK_OUTPUT_PATHS,
    questionnaireTemplateMarkdown: null,
  };
};

export class IdeaCollectorService {
  private readonly activeSessions = new Set<string>();
  private readonly artifacts = new Map<string, IdeaCollectorArtifact>();
  private contractPromise: Promise<IdeaContractSnapshot> | null = null;
  private readonly noticesSent = new Set<string>();
  private readonly pendingQuestionnaire = new Set<string>();

  isIdeaCollectorSession(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  getLatestArtifact(sessionId: string): IdeaCollectorArtifact | null {
    return this.artifacts.get(sessionId) ?? null;
  }

  startCollection(sessionId: string): void {
    this.activeSessions.add(sessionId);
    this.pendingQuestionnaire.add(sessionId);
    if (!this.noticesSent.has(sessionId)) {
      this.noticesSent.add(sessionId);
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
    if (!this.activeSessions.has(sessionId)) {
      return;
    }
    if (this.pendingQuestionnaire.has(sessionId)) {
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
    if (!this.activeSessions.has(sessionId)) {
      this.activeSessions.add(sessionId);
    }
    this.pendingQuestionnaire.delete(sessionId);
    const [prompt, schema] = await Promise.all([
      this.getPrompt(),
      this.getNormalizedSchema(),
    ]);
    sendChatMessage(sessionId, prompt, { outputSchema: schema });
    sendChatMessage(sessionId, content, { outputSchema: schema });
  }

  handleStreamEvent(sessionId: string, event: unknown): void {
    if (!this.activeSessions.has(sessionId)) {
      return;
    }
    const artifact = extractIdeaCollectorArtifact(event);
    if (artifact) {
      this.artifacts.set(sessionId, artifact);
      this.persistIdeaArtifacts(sessionId, artifact).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        postSystemNotice(
          sessionId,
          `Не удалось сохранить артефакты идеи: ${message}`
        );
      });
    }
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
