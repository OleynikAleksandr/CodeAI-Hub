import type { IdeaContractSnapshot } from "./idea-collector-contract";
import { IdeaCollectorService } from "./idea-collector-service";
import { resolveCoreHttpUrl } from "./idea-collector-support";
import {
  extractIdeaQuestionnaireAnswers,
  parseIdeaQuestionnaireTemplateFields,
  renderIdeaQuestionnaire,
} from "./idea-questionnaire-template";
import { WorkspaceFileService } from "./workspace-file-service";

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

const DEFAULT_TEMPLATE = "# Idea Questionnaire\n\n";
const SAVE_DEBOUNCE_MS = 400;
const QUESTIONNAIRE_READ_MAX_BYTES = 1_000_000;
const IDEA_PATH_SUFFIX_RE = /idea\.md$/;
const QUESTIONNAIRE_CLARIFICATIONS_HEADER = "## Уточнения анкеты";
const RUN_QUESTIONNAIRE_PATH_RE =
  /^\.codeai-hub\/initiatives\/([^/]+)\/runs\/[^/]+\/idea\/questionnaire\.md$/;

const normalizeQuestionnaireContent = (
  content: string | null | undefined
): string | null => {
  if (!content) {
    return null;
  }
  const trimmed = content.trim();
  return trimmed.length > 0 ? content : null;
};

const resolveInitiativeQuestionnairePath = (
  questionnairePath: string
): string | null => {
  const match = RUN_QUESTIONNAIRE_PATH_RE.exec(questionnairePath);
  if (!match) {
    return null;
  }
  return `.codeai-hub/initiatives/${match[1]}/idea/questionnaire.md`;
};

const appendClarificationToMarkdown = (
  content: string,
  question: string | null,
  answer: string
): string => {
  const normalizedAnswer = answer.trim();
  if (normalizedAnswer.length === 0) {
    return content;
  }
  const normalizedQuestion = question?.trim();
  const questionLine = normalizedQuestion
    ? `- Вопрос: ${normalizedQuestion}`
    : "- Вопрос: (не удалось определить)";
  const base = content.trimEnd();
  const withHeader = base.includes(QUESTIONNAIRE_CLARIFICATIONS_HEADER)
    ? base
    : `${base}\n\n${QUESTIONNAIRE_CLARIFICATIONS_HEADER}`;
  return `${withHeader}\n${questionLine}\n  Ответ: ${normalizedAnswer}\n`;
};

export class IdeaQuestionnaireService {
  private readonly ideaCollector = new IdeaCollectorService();
  private readonly workspaceFiles = new WorkspaceFileService();
  private readonly saveTimers = new Map<string, number>();

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

    const template =
      templateMarkdown && templateMarkdown.trim().length > 0
        ? templateMarkdown
        : DEFAULT_TEMPLATE;
    const { questions, placeholders } =
      parseIdeaQuestionnaireTemplateFields(template);
    const questionnairePath = outputPaths.idea.replace(
      IDEA_PATH_SUFFIX_RE,
      "questionnaire.md"
    );

    const initiativeQuestionnairePath =
      resolveInitiativeQuestionnairePath(questionnairePath);
    const existing = await this.workspaceFiles.read(
      sessionId,
      questionnairePath,
      QUESTIONNAIRE_READ_MAX_BYTES
    );
    const existingContent =
      existing.status === "ok"
        ? normalizeQuestionnaireContent(existing.file.content)
        : null;
    let content = existingContent;
    if (!content && initiativeQuestionnairePath) {
      const initiativeCopy = await this.workspaceFiles.read(
        sessionId,
        initiativeQuestionnairePath,
        QUESTIONNAIRE_READ_MAX_BYTES
      );
      content =
        initiativeCopy.status === "ok"
          ? normalizeQuestionnaireContent(initiativeCopy.file.content)
          : null;
    }
    const resolvedContent = content ?? template;

    const shouldWriteTemplate =
      existing.status === "missing" ||
      (existing.status === "ok" && existingContent === null);

    if (shouldWriteTemplate) {
      await this.workspaceFiles.write(
        sessionId,
        questionnairePath,
        resolvedContent
      );
    }

    const answers = extractIdeaQuestionnaireAnswers(
      resolvedContent,
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
      this.writeQuestionnaireCopies(sessionId, path, content).catch(() => {
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
    await this.writeQuestionnaireCopies(sessionId, path, content);
  }

  async appendClarificationAnswer(
    sessionId: string,
    outputPaths: IdeaContractSnapshot["outputPaths"],
    question: string | null,
    answer: string
  ): Promise<void> {
    const questionnairePath = outputPaths.idea.replace(
      IDEA_PATH_SUFFIX_RE,
      "questionnaire.md"
    );
    const existing = await this.workspaceFiles.read(
      sessionId,
      questionnairePath,
      QUESTIONNAIRE_READ_MAX_BYTES
    );
    const existingContent =
      existing.status === "ok"
        ? normalizeQuestionnaireContent(existing.file.content)
        : null;
    if (!existingContent) {
      return;
    }
    const updated = appendClarificationToMarkdown(
      existingContent,
      question,
      answer
    );
    if (updated === existingContent) {
      return;
    }
    await this.writeQuestionnaireCopies(sessionId, questionnairePath, updated);
  }

  private async writeQuestionnaireCopies(
    sessionId: string,
    path: string,
    content: string
  ): Promise<void> {
    await this.workspaceFiles.write(sessionId, path, content);
    const initiativeQuestionnairePath =
      resolveInitiativeQuestionnairePath(path);
    if (initiativeQuestionnairePath && initiativeQuestionnairePath !== path) {
      await this.workspaceFiles.write(
        sessionId,
        initiativeQuestionnairePath,
        content
      );
    }
  }
}
