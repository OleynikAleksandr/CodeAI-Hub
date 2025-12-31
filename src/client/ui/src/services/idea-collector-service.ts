import { IDEA_KICKOFF_PROMPT } from "../app-host/idea-kickoff-prompt";
import { sendChatMessage } from "../core-bridge/core-bridge";
import { IDEA_COLLECTOR_FALLBACK_SCHEMA } from "./idea-collector-fallback-schema";
import { normalizeIdeaCollectorSchema } from "./idea-collector-schema-utils";

type IdeaCollectorArtifact = {
  readonly path: string;
  readonly ideaMarkdown: string;
};

type IdeaContractPayload = {
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
  readonly outputPath: string;
};

type IdeaContractSnapshot = {
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
  readonly outputPath: string;
};

const IDEA_CONTRACT_ENDPOINT = "/api/v1/orchestrator/idea-contract";
const IDEA_ARTIFACT_ENDPOINT = "/api/v1/orchestrator/idea-artifact";
const FALLBACK_OUTPUT_PATH = ".codeai-hub/orchestrator/idea.md";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveCoreHttpUrl = (): string | null => {
  const globalScope = window as typeof window & {
    __CODEAI_CORE_CONFIG?: { readonly httpUrl?: string };
  };
  const httpUrl = globalScope.__CODEAI_CORE_CONFIG?.httpUrl;
  if (typeof httpUrl !== "string" || httpUrl.length === 0) {
    return null;
  }
  return httpUrl;
};

const joinUrl = (baseUrl: string, path: string): string =>
  baseUrl.endsWith("/")
    ? `${baseUrl.slice(0, -1)}${path}`
    : `${baseUrl}${path}`;

const isIdeaContractPayload = (
  value: unknown
): value is IdeaContractPayload => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.prompt === "string" &&
    value.prompt.length > 0 &&
    isRecord(value.schema) &&
    typeof value.outputPath === "string" &&
    value.outputPath.length > 0
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
    return { prompt: payload.prompt, schema, outputPath: payload.outputPath };
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
    outputPath: FALLBACK_OUTPUT_PATH,
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
  const path = typeof artifact.path === "string" ? artifact.path : null;
  let ideaMarkdown: string | null = null;
  if (typeof artifact.ideaMarkdown === "string") {
    ideaMarkdown = artifact.ideaMarkdown;
  } else if (typeof artifact.idea_markdown === "string") {
    ideaMarkdown = artifact.idea_markdown;
  }
  if (!(path && ideaMarkdown)) {
    return null;
  }
  return { path, ideaMarkdown };
};

const generateLocalMessageId = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const postSystemNotice = (sessionId: string, content: string): void => {
  window.postMessage(
    {
      type: "session:message",
      payload: {
        sessionId,
        message: {
          id: generateLocalMessageId(),
          role: "system",
          content,
          createdAt: Date.now(),
        },
      },
    },
    "*"
  );
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
    sendChatMessage(sessionId, content, { outputSchema: schema });
  }

  handleStreamEvent(sessionId: string, event: unknown): void {
    if (!this.activeSessions.has(sessionId)) {
      return;
    }
    const artifact = extractArtifact(event);
    if (artifact) {
      this.artifacts.set(sessionId, artifact);
      this.persistIdeaArtifact(sessionId, artifact.ideaMarkdown).catch(
        (error: unknown) => {
          const message =
            error instanceof Error ? error.message : String(error);
          postSystemNotice(
            sessionId,
            `Не удалось сохранить Idea.md: ${message}`
          );
        }
      );
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

  private async persistIdeaArtifact(
    sessionId: string,
    ideaMarkdown: string
  ): Promise<void> {
    const httpUrl = resolveCoreHttpUrl();
    const contract = await this.getContract();
    if (!httpUrl) {
      postSystemNotice(
        sessionId,
        `Не могу сохранить Idea.md: Core HTTP URL не определён. Ожидаемый путь: ${contract.outputPath}`
      );
      return;
    }

    try {
      const response = await fetch(joinUrl(httpUrl, IDEA_ARTIFACT_ENDPOINT), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ideaMarkdown }),
      });

      if (!response.ok) {
        postSystemNotice(
          sessionId,
          `Не удалось сохранить Idea.md (HTTP ${response.status}). Ожидаемый путь: ${contract.outputPath}`
        );
        return;
      }

      postSystemNotice(
        sessionId,
        `Idea.md сохранён в workspace: ${contract.outputPath}`
      );
    } catch {
      postSystemNotice(
        sessionId,
        `Не удалось сохранить Idea.md: ошибка сети. Ожидаемый путь: ${contract.outputPath}`
      );
    }
  }
}
