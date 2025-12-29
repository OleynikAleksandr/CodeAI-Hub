import { IDEA_KICKOFF_PROMPT } from "../app-host/idea-kickoff-prompt";
import { sendChatMessage } from "../core-bridge/core-bridge";

type IdeaCollectorArtifact = {
  readonly path: string;
  readonly ideaMarkdown: string;
};

const IDEA_COLLECTOR_PROMPT_PATH =
  "~/.codeai-hub/templates/flows/full-development-flow/idea-collector-prompt.md";
const IDEA_COLLECTOR_SCHEMA_PATH =
  "~/.codeai-hub/templates/schemas/idea-collector-schema.json";

const FALLBACK_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["conversation_state", "next_action", "suggested_response"],
  properties: {
    conversation_state: { type: "object", additionalProperties: true },
    next_action: { type: "string" },
    suggested_response: { type: "string" },
    artifact: { type: "object", additionalProperties: true },
  },
};

const resolveHomeDirectory = (): string | null => {
  const globalScope = globalThis as {
    readonly process?: { readonly env?: Record<string, string | undefined> };
  };
  const env = globalScope.process?.env;
  const home = env?.HOME ?? env?.USERPROFILE;
  if (typeof home !== "string" || home.length === 0) {
    return null;
  }
  return home;
};

const resolveTemplatePath = (templatePath: string): string | null => {
  if (!templatePath.startsWith("~")) {
    return templatePath;
  }
  const home = resolveHomeDirectory();
  if (!home) {
    return null;
  }
  return `${home}${templatePath.slice(1)}`;
};

const toFileUrl = (filePath: string): string => `file://${encodeURI(filePath)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readTextFromFile = async (
  templatePath: string
): Promise<string | null> => {
  const resolvedPath = resolveTemplatePath(templatePath);
  if (!resolvedPath) {
    return null;
  }
  try {
    const response = await fetch(toFileUrl(resolvedPath));
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
};

const loadPrompt = async (): Promise<string> => {
  const raw = await readTextFromFile(IDEA_COLLECTOR_PROMPT_PATH);
  if (raw && raw.trim().length > 0) {
    return raw;
  }
  return IDEA_KICKOFF_PROMPT;
};

const loadSchema = async (): Promise<Record<string, unknown>> => {
  const raw = await readTextFromFile(IDEA_COLLECTOR_SCHEMA_PATH);
  if (!raw) {
    return FALLBACK_SCHEMA;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : FALLBACK_SCHEMA;
  } catch {
    return FALLBACK_SCHEMA;
  }
};

const extractArtifact = (event: unknown): IdeaCollectorArtifact | null => {
  if (!isRecord(event)) {
    return null;
  }
  const data = event.data;
  if (!isRecord(data) || data.kind !== "structured_output") {
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

export class IdeaCollectorService {
  private readonly activeSessions = new Set<string>();
  private readonly artifacts = new Map<string, IdeaCollectorArtifact>();
  private promptPromise: Promise<string> | null = null;
  private schemaPromise: Promise<Record<string, unknown>> | null = null;

  isIdeaCollectorSession(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  getLatestArtifact(sessionId: string): IdeaCollectorArtifact | null {
    return this.artifacts.get(sessionId) ?? null;
  }

  async startCollection(sessionId: string): Promise<void> {
    this.activeSessions.add(sessionId);
    const [prompt, schema] = await Promise.all([
      this.getPrompt(),
      this.getSchema(),
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
    const schema = await this.getSchema();
    sendChatMessage(sessionId, content, { outputSchema: schema });
  }

  handleStreamEvent(sessionId: string, event: unknown): void {
    if (!this.activeSessions.has(sessionId)) {
      return;
    }
    const artifact = extractArtifact(event);
    if (artifact) {
      this.artifacts.set(sessionId, artifact);
    }
  }

  private getPrompt(): Promise<string> {
    if (!this.promptPromise) {
      this.promptPromise = loadPrompt();
    }
    return this.promptPromise;
  }

  private getSchema(): Promise<Record<string, unknown>> {
    if (!this.schemaPromise) {
      this.schemaPromise = loadSchema();
    }
    return this.schemaPromise;
  }
}
