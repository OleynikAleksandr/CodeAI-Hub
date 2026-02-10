import type { IdeaContractSnapshot } from "./idea-collector-contract";
import { IdeaCollectorService } from "./idea-collector-service";
import { resolveCoreHttpUrl } from "./idea-collector-support";
import {
  appendClarificationToAgentQnaField,
  migrateLegacyClarifications,
} from "./idea-questionnaire-agent-qna";
import { resolveQuestionnaireTargets } from "./idea-questionnaire-paths";
import {
  extractIdeaQuestionnaireAnswers,
  parseIdeaQuestionnaireTemplateFields,
  renderIdeaQuestionnaire,
} from "./idea-questionnaire-template";
import {
  type WorkspaceFileFetchResult,
  WorkspaceFileService,
} from "./workspace-file-service";

type QuestionnaireField = {
  readonly id: string;
  readonly title: string;
  readonly titleHint?: string;
  readonly description?: string;
  readonly hint?: string;
};

export type QuestionnaireSnapshot = {
  readonly sessionId: string;
  readonly path: string;
  readonly template: string;
  readonly placeholders: Record<string, string>;
  readonly questions: readonly QuestionnaireField[];
  readonly answers: Record<string, string>;
};

type QuestionnaireReadResult = {
  readonly existingStatus: WorkspaceFileFetchResult["status"];
  readonly existingContent: string | null;
  readonly resolvedContent: string | null;
};

const DEFAULT_TEMPLATE = "# Idea Questionnaire\n\n";
const SAVE_DEBOUNCE_MS = 400;
const QUESTIONNAIRE_READ_MAX_BYTES = 1_000_000;

const normalizeQuestionnaireContent = (
  content: string | null | undefined
): string | null => {
  if (!content) {
    return null;
  }
  const trimmed = content.trim();
  return trimmed.length > 0 ? content : null;
};

const shouldWriteTemplate = (
  existingStatus: WorkspaceFileFetchResult["status"],
  existingContent: string | null
): boolean =>
  existingStatus === "missing" ||
  (existingStatus === "ok" && existingContent === null);

export class IdeaQuestionnaireService {
  private readonly ideaCollector = new IdeaCollectorService();
  private readonly workspaceFiles = new WorkspaceFileService();
  private readonly saveTimers = new Map<string, number>();

  private async readQuestionnaireContent(
    sessionId: string,
    primaryPath: string,
    readFallbackPaths: readonly string[]
  ): Promise<QuestionnaireReadResult> {
    const existing = await this.workspaceFiles.read(
      sessionId,
      primaryPath,
      QUESTIONNAIRE_READ_MAX_BYTES
    );
    const existingContent =
      existing.status === "ok"
        ? normalizeQuestionnaireContent(existing.file.content)
        : null;
    if (existingContent) {
      return {
        existingStatus: existing.status,
        existingContent,
        resolvedContent: existingContent,
      };
    }
    for (const fallbackPath of readFallbackPaths) {
      const legacyCopy = await this.workspaceFiles.read(
        sessionId,
        fallbackPath,
        QUESTIONNAIRE_READ_MAX_BYTES
      );
      const legacyContent =
        legacyCopy.status === "ok"
          ? normalizeQuestionnaireContent(legacyCopy.file.content)
          : null;
      if (legacyContent) {
        return {
          existingStatus: existing.status,
          existingContent,
          resolvedContent: legacyContent,
        };
      }
    }
    return {
      existingStatus: existing.status,
      existingContent,
      resolvedContent: null,
    };
  }

  async loadQuestionnaire(
    sessionId: string,
    outputPathsOverride?: IdeaContractSnapshot["outputPaths"]
  ): Promise<QuestionnaireSnapshot | null> {
    const httpUrl = resolveCoreHttpUrl();
    if (!httpUrl) {
      return null;
    }

    const templateMarkdown =
      await this.ideaCollector.getQuestionnaireTemplateMarkdown();
    const outputPaths = outputPathsOverride;
    if (!outputPaths) {
      return null;
    }

    const { primaryPath: questionnairePath, readFallbackPaths } =
      resolveQuestionnaireTargets(outputPaths.idea);
    const template =
      templateMarkdown && templateMarkdown.trim().length > 0
        ? templateMarkdown
        : DEFAULT_TEMPLATE;
    const { questions, placeholders } =
      parseIdeaQuestionnaireTemplateFields(template);
    const { existingStatus, existingContent, resolvedContent } =
      await this.readQuestionnaireContent(
        sessionId,
        questionnairePath,
        readFallbackPaths
      );
    const content = resolvedContent ?? template;
    const migratedContent = migrateLegacyClarifications(content);

    const shouldWriteMigrated =
      shouldWriteTemplate(existingStatus, existingContent) ||
      migratedContent !== content;

    if (shouldWriteMigrated) {
      await this.writeQuestionnaire(
        sessionId,
        questionnairePath,
        migratedContent
      );
    }

    const answers = extractIdeaQuestionnaireAnswers(
      migratedContent,
      placeholders
    );
    return {
      sessionId,
      path: questionnairePath,
      template,
      placeholders,
      questions,
      answers,
    };
  }

  renderQuestionnaire(
    template: string,
    placeholders: Record<string, string>,
    answers: Record<string, string>
  ): string {
    return renderIdeaQuestionnaire(template, placeholders, answers);
  }

  queueSave(sessionId: string, path: string, content: string): void {
    const existing = this.saveTimers.get(sessionId);
    if (existing) {
      window.clearTimeout(existing);
    }
    const timer = window.setTimeout(() => {
      this.writeQuestionnaire(sessionId, path, content).catch(() => {
        /* ignore save errors */
      });
    }, SAVE_DEBOUNCE_MS);
    this.saveTimers.set(sessionId, timer);
  }

  async flushSave(
    sessionId: string,
    path: string,
    content: string
  ): Promise<void> {
    const existing = this.saveTimers.get(sessionId);
    if (existing) {
      window.clearTimeout(existing);
      this.saveTimers.delete(sessionId);
    }
    await this.writeQuestionnaire(sessionId, path, content);
  }

  async appendClarificationAnswer(
    sessionId: string,
    outputPaths: IdeaContractSnapshot["outputPaths"],
    question: string | null,
    answer: string
  ): Promise<void> {
    const { primaryPath: questionnairePath, readFallbackPaths } =
      resolveQuestionnaireTargets(outputPaths.idea);
    const { resolvedContent } = await this.readQuestionnaireContent(
      sessionId,
      questionnairePath,
      readFallbackPaths
    );
    if (!resolvedContent) {
      return;
    }
    const updated = appendClarificationToAgentQnaField(
      resolvedContent,
      question,
      answer
    );
    if (updated === resolvedContent) {
      return;
    }
    await this.writeQuestionnaire(sessionId, questionnairePath, updated);
  }

  private async writeQuestionnaire(
    sessionId: string,
    path: string,
    content: string
  ): Promise<void> {
    await this.workspaceFiles.write(sessionId, path, content);
  }
}
