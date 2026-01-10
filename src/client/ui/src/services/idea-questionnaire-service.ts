import type { IdeaContractSnapshot } from "./idea-collector-contract";
import { IdeaCollectorService } from "./idea-collector-service";
import { joinUrl, resolveCoreHttpUrl } from "./idea-collector-support";
import {
  extractIdeaQuestionnaireAnswers,
  parseIdeaQuestionnaireTemplateFields,
  renderIdeaQuestionnaire,
} from "./idea-questionnaire-template";

type QuestionnaireField = {
  readonly id: string;
  readonly title: string;
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

type WorkspaceFileResponse = {
  readonly path: string;
  readonly truncated: boolean;
  readonly maxBytes: number;
  readonly content: string;
};

const WORKSPACE_FILE_ENDPOINT = "/api/v1/orchestrator/workspace-file";
const WORKSPACE_FILE_WRITE_ENDPOINT =
  "/api/v1/orchestrator/workspace-file-write";
const DEFAULT_TEMPLATE = "# Idea Questionnaire\n\n";
const SAVE_DEBOUNCE_MS = 400;
const IDEA_PATH_SUFFIX_RE = /idea\.md$/;
const RUN_QUESTIONNAIRE_PATH_RE =
  /^\.codeai-hub\/initiatives\/([^/]+)\/runs\/[^/]+\/idea\/questionnaire\.md$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isWorkspaceFileResponse = (
  value: unknown
): value is WorkspaceFileResponse => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.path === "string" &&
    typeof value.content === "string" &&
    typeof value.truncated === "boolean" &&
    typeof value.maxBytes === "number"
  );
};

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

export class IdeaQuestionnaireService {
  private readonly ideaCollector = new IdeaCollectorService();
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
    const existing = await this.fetchWorkspaceFile(
      sessionId,
      questionnairePath
    );
    const existingContent = normalizeQuestionnaireContent(existing?.content);
    let content = existingContent;
    if (!content && initiativeQuestionnairePath) {
      const initiativeCopy = await this.fetchWorkspaceFile(
        sessionId,
        initiativeQuestionnairePath
      );
      content = normalizeQuestionnaireContent(initiativeCopy?.content);
    }
    const resolvedContent = content ?? template;
    if (!existingContent) {
      await this.writeWorkspaceFile(
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

  private async fetchWorkspaceFile(
    sessionId: string,
    path: string
  ): Promise<WorkspaceFileResponse | null> {
    const httpUrl = resolveCoreHttpUrl();
    if (!httpUrl) {
      return null;
    }
    try {
      const response = await fetch(joinUrl(httpUrl, WORKSPACE_FILE_ENDPOINT), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, path, maxBytes: 200_000 }),
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as unknown;
      if (!isWorkspaceFileResponse(payload)) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  private async writeQuestionnaireCopies(
    sessionId: string,
    path: string,
    content: string
  ): Promise<void> {
    await this.writeWorkspaceFile(sessionId, path, content);
    const initiativeQuestionnairePath =
      resolveInitiativeQuestionnairePath(path);
    if (initiativeQuestionnairePath && initiativeQuestionnairePath !== path) {
      await this.writeWorkspaceFile(
        sessionId,
        initiativeQuestionnairePath,
        content
      );
    }
  }

  private async writeWorkspaceFile(
    sessionId: string,
    path: string,
    content: string
  ): Promise<void> {
    const httpUrl = resolveCoreHttpUrl();
    if (!httpUrl) {
      return;
    }
    await fetch(joinUrl(httpUrl, WORKSPACE_FILE_WRITE_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, path, content }),
    });
  }
}
