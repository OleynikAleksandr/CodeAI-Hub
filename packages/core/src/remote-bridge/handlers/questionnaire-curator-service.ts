import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  readSessionEvents,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import type { CoreConfig } from "../../config";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import {
  type CuratorProviderAdapter,
  QuestionnaireCuratorProviderRunner,
} from "./questionnaire-curator-provider-runner";

type CuratorContext = {
  readonly stage: string;
  readonly runSlug: string;
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly sessionId: string;
  readonly createdAt: string;
  readonly sessionWorkspaceSlug: string;
  readonly artifactWorkspaceSlug: string;
  readonly questionnairePath: string;
};

type CuratorInputs = {
  readonly transcript: string;
  readonly questionnaireRaw: string | null;
  readonly marker: string;
  readonly runId: string;
  readonly createdAt: string;
};

const WORKSPACE_ARTIFACTS_ROOT = ".codeai-hub";
const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");
const TEMPLATE_ROOT = "templates";
const QUESTIONNAIRE_FILENAME = "questionnaire.md";

const readTextFile = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

const buildBackupPath = (artifactPath: string): string => {
  const timestamp = new Date().toISOString().replace(/[^\d]/g, "");
  return `${artifactPath}.bak-${timestamp}`;
};

const normalizeWithTrailingNewline = (value: string): string =>
  value.endsWith("\n") ? value : `${value}\n`;

const resolveCuratorTemplatePath = (stage: string): string | null => {
  const home = homedir();
  if (!home) {
    return null;
  }
  return path.join(
    home,
    WORKSPACE_ARTIFACTS_ROOT,
    TEMPLATE_ROOT,
    stage,
    "questionnaire-curator.md"
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeAppendBlock = (raw: string): string => {
  const logIndex = raw.indexOf("## Clarifications log");
  const start = logIndex >= 0 ? raw.slice(logIndex) : raw;
  const stopMarkers = [
    "Run metadata:",
    "Current questionnaire.md:",
    "Transcript (JSONL):",
    "Transcript:",
  ];
  const lines = start.split("\n");
  const cleaned: string[] = [];
  let inFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    if (stopMarkers.some((marker) => trimmed.startsWith(marker))) {
      break;
    }
    if (trimmed === "---") {
      continue;
    }
    cleaned.push(line);
  }
  return cleaned.join("\n").trim();
};

const extractSessionMessage = (
  event: unknown
): {
  readonly id: string;
  readonly role: string;
  readonly content: string;
  readonly timestamp: string;
} | null => {
  if (!isRecord(event) || event.type !== "message") {
    return null;
  }
  const id = typeof event.messageId === "string" ? event.messageId : "";
  const role = typeof event.role === "string" ? event.role : "";
  const content = typeof event.content === "string" ? event.content : "";
  const timestamp = typeof event.timestamp === "string" ? event.timestamp : "";
  if (!(id && role && content && timestamp)) {
    return null;
  }
  return { id, role, content, timestamp };
};

const buildSessionTranscript = async (
  context: CuratorContext
): Promise<string | null> => {
  const filePath = buildSessionFilePath({
    rootDirectory: SESSION_ROOT,
    workspaceSlug: sanitizeWorkspaceSlug(context.sessionWorkspaceSlug),
    provider: context.providerId,
    sessionId: sanitizeWorkspaceSlug(context.providerSessionId),
  });
  const events = await readSessionEvents(filePath);
  const lines: string[] = [];
  for (const event of events) {
    const message = extractSessionMessage(event);
    if (!message) {
      continue;
    }
    lines.push(
      JSON.stringify({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
      })
    );
  }
  if (lines.length === 0) {
    return null;
  }
  return `${lines.join("\n")}\n`;
};

export class QuestionnaireCuratorService {
  private readonly config: CoreConfig;
  private readonly logger: Logger;
  private readonly providerRunner = new QuestionnaireCuratorProviderRunner();

  constructor(options: {
    readonly config: CoreConfig;
    readonly logger: Logger;
  }) {
    this.config = options.config;
    this.logger = options.logger;
  }

  async maybeCurate(
    session: Session,
    adapter: CuratorProviderAdapter
  ): Promise<void> {
    const context = this.resolveCuratorContext(session);
    if (!context) {
      return;
    }

    const inputs = await this.loadCuratorInputs(context);
    if (!inputs) {
      return;
    }

    const template = await this.loadCuratorTemplate(context.stage);
    if (!template) {
      return;
    }

    const prompt = this.buildCuratorPrompt({
      template,
      stage: context.stage,
      runSlug: context.runSlug,
      runId: inputs.runId,
      createdAt: inputs.createdAt,
      questionnaire: inputs.questionnaireRaw ?? "",
      transcript: inputs.transcript,
    });

    const appendBlock = await this.providerRunner.requestAppendBlock(
      adapter,
      session.workspacePath,
      prompt
    );
    if (!appendBlock) {
      this.logger.warn("Questionnaire curator skipped: no append block", {
        stage: context.stage,
        runSlug: context.runSlug,
      });
      return;
    }

    await this.appendToQuestionnaire({
      questionnairePath: context.questionnairePath,
      existingContent: inputs.questionnaireRaw ?? "",
      marker: inputs.marker,
      appendBlock,
    });
  }

  private resolveCuratorContext(session: Session): CuratorContext | null {
    const stage = session.stage?.trim() ?? "";
    if (!stage) {
      return null;
    }
    if (stage !== "description") {
      return null;
    }
    const providerSessionId = session.providerSessionId?.trim() ?? "";
    if (!providerSessionId) {
      return null;
    }

    const workspaceRoot = path.resolve(session.workspacePath);
    const sessionWorkspaceSlug = this.config.claudeProjectSlug;
    const artifactWorkspaceSlug =
      session.initiativeSlug?.trim() || this.config.claudeProjectSlug;
    const runSlug = session.runSlug?.trim() ?? "";
    const runSlugLabel = runSlug || providerSessionId || session.id;

    return {
      stage,
      runSlug: runSlugLabel,
      providerId: session.providerId,
      providerSessionId,
      sessionId: session.id,
      createdAt: session.createdAt,
      sessionWorkspaceSlug,
      artifactWorkspaceSlug,
      questionnairePath: path.join(
        workspaceRoot,
        WORKSPACE_ARTIFACTS_ROOT,
        artifactWorkspaceSlug,
        stage,
        QUESTIONNAIRE_FILENAME
      ),
    };
  }

  private async loadCuratorInputs(
    context: CuratorContext
  ): Promise<CuratorInputs | null> {
    const [transcriptRaw, questionnaireRaw] = await Promise.all([
      buildSessionTranscript(context),
      readTextFile(context.questionnairePath),
    ]);

    const transcript = transcriptRaw?.trim();
    if (!transcript) {
      return null;
    }

    const runId =
      context.runSlug || context.providerSessionId || context.sessionId;
    const createdAt = context.createdAt ?? "";
    const marker = `<!-- curator:runId=${runId} -->`;

    if (questionnaireRaw?.includes(marker)) {
      return null;
    }

    return { transcript, questionnaireRaw, marker, runId, createdAt };
  }

  private async loadCuratorTemplate(stage: string): Promise<string | null> {
    const templatePath = resolveCuratorTemplatePath(stage);
    const template = templatePath ? await readTextFile(templatePath) : null;
    if (!template) {
      this.logger.warn("Questionnaire curator skipped: template unavailable", {
        stage,
        templatePath,
      });
      return null;
    }
    return template;
  }

  private buildCuratorPrompt(input: {
    readonly template: string;
    readonly stage: string;
    readonly runSlug: string;
    readonly runId: string;
    readonly createdAt: string;
    readonly questionnaire: string;
    readonly transcript: string;
  }): string {
    const now = new Date().toISOString();
    return `${input.template.trim()}\n\n---\n\nRun metadata:\n- runId: ${input.runId}\n- runSlug: ${input.runSlug}\n- stage: ${input.stage}\n- createdAt: ${input.createdAt}\n- curatorAt: ${now}\n\nCurrent questionnaire.md:\n\n\`\`\`md\n${input.questionnaire.trimEnd()}\n\`\`\`\n\nTranscript (JSONL):\n\n\`\`\`jsonl\n${input.transcript}\n\`\`\`\n`;
  }

  private async appendToQuestionnaire(input: {
    readonly questionnairePath: string;
    readonly existingContent: string;
    readonly marker: string;
    readonly appendBlock: string;
  }): Promise<void> {
    if (input.existingContent.includes(input.marker)) {
      return;
    }

    const normalizedAppend = normalizeWithTrailingNewline(
      normalizeAppendBlock(input.appendBlock)
    );
    const ensuredMarker = normalizedAppend.includes(input.marker)
      ? normalizedAppend
      : `${input.marker}\n\n${normalizedAppend}`;
    const ensuredLogHeader = ensuredMarker.includes("## Clarifications log")
      ? ensuredMarker
      : `## Clarifications log\n\n${ensuredMarker}`;

    const updated = `${input.existingContent.trimEnd()}\n\n${ensuredLogHeader.trimEnd()}\n`;

    await mkdir(path.dirname(input.questionnairePath), { recursive: true });
    if (input.existingContent.length > 0) {
      const backupPath = buildBackupPath(input.questionnairePath);
      await writeFile(backupPath, input.existingContent, "utf8").catch(
        () => null
      );
    }
    await writeFile(input.questionnairePath, updated, "utf8");
  }
}
