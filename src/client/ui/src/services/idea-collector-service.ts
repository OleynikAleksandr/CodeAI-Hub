import { IDEA_KICKOFF_PROMPT } from "../app-host/idea-kickoff-prompt";
import { sendChatMessage } from "../core-bridge/core-bridge";
import { IDEA_COLLECTOR_FALLBACK_SCHEMA } from "./idea-collector-fallback-schema";
import { normalizeIdeaCollectorSchema } from "./idea-collector-schema-utils";
import {
  joinUrl,
  postSystemNotice,
  resolveCoreHttpUrl,
} from "./idea-collector-support";
import { buildMessageWithWorkspaceContext } from "./idea-collector-workspace-context";

type IdeaCollectorArtifact = {
  readonly ideaPath: string;
  readonly ideaMarkdown: string;
  readonly virtualSimulationPath: string;
  readonly virtualSimulationMarkdown: string;
};

type IdeaContractPayload = {
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
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
};

const IDEA_CONTRACT_ENDPOINT = "/api/v1/orchestrator/idea-contract";
const IDEA_ARTIFACT_ENDPOINT = "/api/v1/orchestrator/idea-artifact";
const FALLBACK_OUTPUT_PATHS = {
  idea: ".codeai-hub/full-development-flow/idea/idea.md",
  virtualSimulation:
    ".codeai-hub/full-development-flow/idea/virtual-simulation.md",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringField = (
  record: Record<string, unknown>,
  key: string
): string | null => (typeof record[key] === "string" ? record[key] : null);

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
    return { prompt: payload.prompt, schema, outputPaths: payload.outputPaths };
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
  };
};

const extractArtifact = (event: unknown): IdeaCollectorArtifact | null => {
  if (!isRecord(event)) {
    return null;
  }
  const data = event.data;
  if (!isRecord(data) || data.kind !== "structured_output") {
    return null;
  }
  let nextAction: string | null = null;
  if (typeof data.nextAction === "string") {
    nextAction = data.nextAction;
  } else if (typeof data.next_action === "string") {
    nextAction = data.next_action;
  }
  if (nextAction !== "finalize") {
    return null;
  }
  const artifact = data.artifact;
  if (!isRecord(artifact)) {
    return null;
  }
  const ideaPath =
    readStringField(artifact, "ideaPath") ??
    readStringField(artifact, "idea_path") ??
    readStringField(artifact, "path");
  const virtualSimulationPath =
    readStringField(artifact, "virtualSimulationPath") ??
    readStringField(artifact, "virtual_simulation_path");
  const ideaMarkdown =
    readStringField(artifact, "ideaMarkdown") ??
    readStringField(artifact, "idea_markdown");
  const virtualSimulationMarkdown =
    readStringField(artifact, "virtualSimulationMarkdown") ??
    readStringField(artifact, "virtual_simulation_markdown");
  if (
    !(
      ideaPath &&
      ideaMarkdown &&
      virtualSimulationPath &&
      virtualSimulationMarkdown
    )
  ) {
    return null;
  }
  return {
    ideaPath,
    ideaMarkdown,
    virtualSimulationPath,
    virtualSimulationMarkdown,
  };
};

export class IdeaCollectorService {
  private readonly activeSessions = new Set<string>();
  private readonly artifacts = new Map<string, IdeaCollectorArtifact>();
  private contractPromise: Promise<IdeaContractSnapshot> | null = null;
  private readonly noticesSent = new Set<string>();

  isIdeaCollectorSession(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  getLatestArtifact(sessionId: string): IdeaCollectorArtifact | null {
    return this.artifacts.get(sessionId) ?? null;
  }

  async startCollection(sessionId: string): Promise<void> {
    this.activeSessions.add(sessionId);
    if (!this.noticesSent.has(sessionId)) {
      this.noticesSent.add(sessionId);
      postSystemNotice(
        sessionId,
        "Запускаю Idea Collector. Пожалуйста, дождитесь первого вопроса."
      );
      postSystemNotice(
        sessionId,
        "Чтобы приложить существующие документы/файлы из workspace, напишите:\n/read <relative-path>\n(можно несколько путей в одной строке, максимум 3)."
      );
    }
    const [prompt, schema] = await Promise.all([
      this.getPrompt(),
      this.getNormalizedSchema(),
    ]);
    sendChatMessage(sessionId, prompt, { outputSchema: schema });
  }

  async continueConversation(
    sessionId: string,
    content: string
  ): Promise<void> {
    if (!this.activeSessions.has(sessionId)) {
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

  handleStreamEvent(sessionId: string, event: unknown): void {
    if (!this.activeSessions.has(sessionId)) {
      return;
    }
    const artifact = extractArtifact(event);
    if (artifact) {
      this.artifacts.set(sessionId, artifact);
      this.persistIdeaArtifacts(
        sessionId,
        artifact.ideaMarkdown,
        artifact.virtualSimulationMarkdown
      ).catch((error: unknown) => {
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

  private getContract(): Promise<IdeaContractSnapshot> {
    if (!this.contractPromise) {
      this.contractPromise = loadContract();
    }
    return this.contractPromise;
  }

  private async persistIdeaArtifacts(
    sessionId: string,
    ideaMarkdown: string,
    virtualSimulationMarkdown: string
  ): Promise<void> {
    const httpUrl = resolveCoreHttpUrl();
    const contract = await this.getContract();
    if (!httpUrl) {
      postSystemNotice(
        sessionId,
        `Не могу сохранить артефакты идеи: Core HTTP URL не определён. Ожидаемые пути: ${contract.outputPaths.idea}, ${contract.outputPaths.virtualSimulation}`
      );
      return;
    }

    try {
      const response = await fetch(joinUrl(httpUrl, IDEA_ARTIFACT_ENDPOINT), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          ideaMarkdown,
          virtualSimulationMarkdown,
        }),
      });

      if (!response.ok) {
        postSystemNotice(
          sessionId,
          `Не удалось сохранить артефакты идеи (HTTP ${response.status}). Ожидаемые пути: ${contract.outputPaths.idea}, ${contract.outputPaths.virtualSimulation}`
        );
        return;
      }

      postSystemNotice(
        sessionId,
        `Артефакты идеи сохранены в workspace: ${contract.outputPaths.idea} и ${contract.outputPaths.virtualSimulation}`
      );
    } catch {
      postSystemNotice(
        sessionId,
        `Не удалось сохранить артефакты идеи: ошибка сети. Ожидаемые пути: ${contract.outputPaths.idea}, ${contract.outputPaths.virtualSimulation}`
      );
    }
  }
}
