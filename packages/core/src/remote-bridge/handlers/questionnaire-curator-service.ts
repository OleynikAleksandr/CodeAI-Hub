import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { CoreConfig } from "../../config";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import {
  hasValidCuratorMarker,
  normalizeWithTrailingNewline,
  sanitizeCuratorAppendBlock,
} from "./questionnaire-curator-append-sanitizer";
import {
  type CuratorProviderAdapter,
  QuestionnaireCuratorProviderRunner,
} from "./questionnaire-curator-provider-runner";
import { buildCuratorTranscript } from "./questionnaire-curator-transcript";

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
const TEMPLATE_ROOT = "templates";
const QUESTIONNAIRE_FILENAME = "questionnaire.md";
const readTextFile = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
};
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
      buildCuratorTranscript({
        providerId: context.providerId,
        providerSessionId: context.providerSessionId,
        sessionWorkspaceSlug: context.sessionWorkspaceSlug,
      }),
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

    if (questionnaireRaw && hasValidCuratorMarker(questionnaireRaw, marker)) {
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
    if (hasValidCuratorMarker(input.existingContent, input.marker)) {
      return;
    }

    const sanitized = sanitizeCuratorAppendBlock(input.appendBlock);
    if (!sanitized) {
      this.logger.warn("Questionnaire curator skipped: invalid append block", {
        questionnairePath: input.questionnairePath,
      });
      return;
    }

    const normalizedAppend = normalizeWithTrailingNewline(sanitized);
    const ensuredMarker = normalizedAppend.includes(input.marker)
      ? normalizedAppend
      : `${input.marker}\n\n${normalizedAppend}`;
    const ensuredLogHeader = ensuredMarker.includes("## Clarifications log")
      ? ensuredMarker
      : `## Clarifications log\n\n${ensuredMarker}`;

    const updated = `${input.existingContent.trimEnd()}\n\n${ensuredLogHeader.trimEnd()}\n`;

    await mkdir(path.dirname(input.questionnairePath), { recursive: true });
    await writeFile(input.questionnairePath, updated, "utf8");
  }
}
