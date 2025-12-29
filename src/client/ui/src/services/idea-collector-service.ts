import { IDEA_KICKOFF_PROMPT } from "../app-host/idea-kickoff-prompt";
import { sendChatMessage } from "../core-bridge/core-bridge";

type IdeaCollectorArtifact = {
  readonly path: string;
  readonly ideaMarkdown: string;
};

const IDEA_COLLECTOR_PROMPT_PATH =
  "~/.codeai-hub/templates/flows/full-development-flow/idea-collector-prompt.md";
const IDEA_COLLECTOR_TEMPLATE_PATH =
  "~/.codeai-hub/templates/flows/full-development-flow/idea-template.md";
const IDEA_COLLECTOR_SCHEMA_PATH =
  "~/.codeai-hub/templates/schemas/idea-collector-schema.json";
const HARDCODED_IDEA_PATH =
  "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/.codeai-hub/orchestrator/idea.md";

const FALLBACK_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["conversation_state", "next_action", "suggested_response"],
  properties: {
    conversation_state: {
      type: "object",
      additionalProperties: false,
      required: ["collected", "coverage_percent"],
      properties: {
        collected: { type: "object", additionalProperties: false },
        coverage_percent: { type: "integer", minimum: 0, maximum: 100 },
      },
    },
    next_action: {
      type: "string",
      enum: ["ask_question", "clarify", "summarize", "finalize"],
    },
    suggested_response: { type: "string", minLength: 1 },
    artifact: {
      type: "object",
      additionalProperties: false,
      required: ["idea_markdown", "path"],
      properties: {
        idea_markdown: { type: "string", minLength: 1 },
        path: { type: "string" },
      },
    },
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

const loadTemplate = async (): Promise<string | null> => {
  const raw = await readTextFromFile(IDEA_COLLECTOR_TEMPLATE_PATH);
  if (raw && raw.trim().length > 0) {
    return raw;
  }
  return null;
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
  const path = HARDCODED_IDEA_PATH;
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

const cloneSchema = (
  schema: Record<string, unknown>
): Record<string, unknown> =>
  typeof globalThis.structuredClone === "function"
    ? globalThis.structuredClone(schema)
    : (JSON.parse(JSON.stringify(schema)) as Record<string, unknown>);

const injectTemplateIntoSchema = (
  schema: Record<string, unknown>,
  template: string | null
): Record<string, unknown> => {
  if (!template) {
    return schema;
  }
  const next = cloneSchema(schema);
  const properties = next.properties;
  if (!isRecord(properties)) {
    return schema;
  }
  const artifact = properties.artifact;
  if (!isRecord(artifact)) {
    return schema;
  }
  const artifactProperties = artifact.properties;
  if (!isRecord(artifactProperties)) {
    return schema;
  }
  const ideaMarkdown = artifactProperties.idea_markdown;
  if (!isRecord(ideaMarkdown)) {
    return schema;
  }
  const description =
    typeof ideaMarkdown.description === "string"
      ? ideaMarkdown.description
      : "Готовый Idea.md в Markdown.";
  ideaMarkdown.description = `${description}\n\nШаблон Idea.md:\n${template}`;
  return next;
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
  private promptPromise: Promise<string> | null = null;
  private templatePromise: Promise<string | null> | null = null;
  private schemaPromise: Promise<Record<string, unknown>> | null = null;
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
    const [prompt, schema, template] = await Promise.all([
      this.getPrompt(),
      this.getSchema(),
      this.getTemplate(),
    ]);
    const hydratedSchema = injectTemplateIntoSchema(schema, template);
    sendChatMessage(sessionId, prompt, { outputSchema: hydratedSchema });
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

  private getTemplate(): Promise<string | null> {
    if (!this.templatePromise) {
      this.templatePromise = loadTemplate();
    }
    return this.templatePromise;
  }

  private getSchema(): Promise<Record<string, unknown>> {
    if (!this.schemaPromise) {
      this.schemaPromise = loadSchema();
    }
    return this.schemaPromise;
  }
}
