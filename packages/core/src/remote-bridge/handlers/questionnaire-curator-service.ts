import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { CoreConfig } from "../../config";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";

type ProviderAdapter = {
  createSession(workspacePath?: string): Promise<string>;
  closeSession(sessionId: string): Promise<void>;
  sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): Promise<void>;
  subscribe(
    sessionId: string,
    listener: (payload: unknown) => void
  ): () => void;
};

type CuratorContext = {
  readonly stage: string;
  readonly runSlug: string;
  readonly transcriptPath: string;
  readonly manifestPath: string;
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
const TEMPLATE_ROOT = "templates";
const RUNS_DIRECTORY_NAME = "runs";
const TRANSCRIPT_FILENAME = "transcript.jsonl";
const RUN_MANIFEST_FILENAME = "run.json";
const QUESTIONNAIRE_FILENAME = "questionnaire.md";

const BEGIN_APPEND_MARKER = "BEGIN_APPEND";
const END_APPEND_MARKER = "END_APPEND";
const APPEND_BLOCK_RE = /BEGIN_APPEND\s*([\s\S]*?)\s*END_APPEND/m;

const readTextFile = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

const extractAppendBlock = (text: string): string | null => {
  const match = text.match(APPEND_BLOCK_RE);
  if (!match) {
    return null;
  }
  const content = match[1]?.trim();
  return content && content.length > 0 ? content : null;
};

const extractMessageContent = (event: unknown): string | null => {
  if (typeof event === "string") {
    return event;
  }
  if (!event || typeof event !== "object") {
    return null;
  }
  const typed = event as {
    readonly content?: unknown;
    readonly data?: unknown;
    readonly payload?: unknown;
  };

  if (typeof typed.content === "string") {
    return typed.content;
  }
  if (typed.content && typeof typed.content === "object") {
    return JSON.stringify(typed.content);
  }

  if (typeof typed.data === "string") {
    return typed.data;
  }
  if (typed.data && typeof typed.data === "object") {
    return JSON.stringify(typed.data);
  }

  if (typeof typed.payload === "string") {
    return typed.payload;
  }
  if (typed.payload && typeof typed.payload === "object") {
    return JSON.stringify(typed.payload);
  }
  return null;
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

const parseRunManifest = (
  raw: string
): { readonly runId: string | null; readonly createdAt: string | null } => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return { runId: null, createdAt: null };
    }
    const runId = typeof parsed.runId === "string" ? parsed.runId.trim() : "";
    const createdAt =
      typeof parsed.createdAt === "string" ? parsed.createdAt.trim() : "";
    return {
      runId: runId.length > 0 ? runId : null,
      createdAt: createdAt.length > 0 ? createdAt : null,
    };
  } catch {
    return { runId: null, createdAt: null };
  }
};

export class QuestionnaireCuratorService {
  private readonly config: CoreConfig;
  private readonly logger: Logger;

  constructor(options: {
    readonly config: CoreConfig;
    readonly logger: Logger;
  }) {
    this.config = options.config;
    this.logger = options.logger;
  }

  async maybeCurate(session: Session, adapter: ProviderAdapter): Promise<void> {
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

    const appendBlock = await this.requestAppendBlock(
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
    const runSlug = session.runSlug?.trim() ?? "";
    if (!(stage && runSlug)) {
      return null;
    }
    if (stage !== "description") {
      return null;
    }

    const workspaceRoot = path.resolve(session.workspacePath);
    const workspaceSlug = this.config.claudeProjectSlug;

    const runDirectory = path.join(
      workspaceRoot,
      WORKSPACE_ARTIFACTS_ROOT,
      workspaceSlug,
      stage,
      RUNS_DIRECTORY_NAME,
      runSlug
    );

    return {
      stage,
      runSlug,
      transcriptPath: path.join(runDirectory, TRANSCRIPT_FILENAME),
      manifestPath: path.join(runDirectory, RUN_MANIFEST_FILENAME),
      questionnairePath: path.join(
        workspaceRoot,
        WORKSPACE_ARTIFACTS_ROOT,
        workspaceSlug,
        stage,
        QUESTIONNAIRE_FILENAME
      ),
    };
  }

  private async loadCuratorInputs(
    context: CuratorContext
  ): Promise<CuratorInputs | null> {
    const [transcriptRaw, manifestRaw, questionnaireRaw] = await Promise.all([
      readTextFile(context.transcriptPath),
      readTextFile(context.manifestPath),
      readTextFile(context.questionnairePath),
    ]);

    const transcript = transcriptRaw?.trim();
    if (!transcript) {
      return null;
    }

    const manifest = manifestRaw ? parseRunManifest(manifestRaw) : null;
    const runId = manifest?.runId ?? context.runSlug;
    const createdAt = manifest?.createdAt ?? "";
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

  private async requestAppendBlock(
    adapter: ProviderAdapter,
    workspacePath: string,
    prompt: string
  ): Promise<string | null> {
    const curatorSessionId = await adapter.createSession(workspacePath);
    try {
      return await this.runCuratorPrompt(adapter, curatorSessionId, prompt);
    } finally {
      await adapter.closeSession(curatorSessionId).catch(() => null);
    }
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
      input.appendBlock.trim()
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

  private async runCuratorPrompt(
    adapter: ProviderAdapter,
    sessionId: string,
    prompt: string
  ): Promise<string | null> {
    let resolved = false;
    let appendBlock: string | null = null;

    const done = (value: string | null): void => {
      if (resolved) {
        return;
      }
      resolved = true;
      appendBlock = value;
    };

    const unsubscribe = adapter.subscribe(sessionId, (event) => {
      if (resolved) {
        return;
      }
      const text = extractMessageContent(event);
      if (!text) {
        return;
      }
      if (
        !(
          text.includes(BEGIN_APPEND_MARKER) && text.includes(END_APPEND_MARKER)
        )
      ) {
        return;
      }
      done(extractAppendBlock(text));
    });

    try {
      await adapter.sendMessage(sessionId, prompt);
      const timeoutMs = 90_000;
      const startedAt = Date.now();
      while (!resolved && Date.now() - startedAt < timeoutMs) {
        await new Promise((resolver) => setTimeout(resolver, 250));
      }
      if (!resolved) {
        done(null);
      }
    } finally {
      unsubscribe();
    }

    return appendBlock;
  }
}
