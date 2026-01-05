import { IdeaCollectorService } from "./idea-collector-service";
import { joinUrl, resolveCoreHttpUrl } from "./idea-collector-support";

type QuestionnaireField = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly placeholder: string;
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
const FIELD_REGEX =
  /<!--\s*field:([^\s]+)\s*-->([\s\S]*?)<!--\s*\/field\s*-->/g;
const HEADING_PREFIX_RE = /^#+\s*/;
const HEADING_LINE_RE = /^#+\s+.*$/gm;
const IDEA_PATH_SUFFIX_RE = /idea\.md$/;

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

const normalizeDescription = (value: string): string | undefined => {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("<!--"));
  if (lines.length === 0) {
    return;
  }
  return lines.join("\n");
};

const resolveFieldMeta = (
  template: string,
  startIndex: number,
  fallback: string
): { readonly title: string; readonly description?: string } => {
  const prefix = template.slice(0, startIndex);
  const headings = Array.from(prefix.matchAll(HEADING_LINE_RE));
  const lastHeading = headings.at(-1);
  if (!lastHeading) {
    return { title: fallback };
  }
  const headingIndex = lastHeading.index ?? 0;
  const headingLine = lastHeading[0] ?? "";
  const title = headingLine.replace(HEADING_PREFIX_RE, "").trim() || fallback;
  const descriptionStart = headingIndex + headingLine.length;
  const description = normalizeDescription(
    template.slice(descriptionStart, startIndex)
  );
  return { title, description };
};

const parseTemplateFields = (
  template: string
): {
  readonly questions: QuestionnaireField[];
  readonly placeholders: Record<string, string>;
} => {
  const questions: QuestionnaireField[] = [];
  const placeholders: Record<string, string> = {};
  const matches = template.matchAll(FIELD_REGEX);
  for (const match of matches) {
    const fieldId = match[1];
    if (!fieldId || placeholders[fieldId]) {
      continue;
    }
    const placeholder = (match[2] ?? "").trim();
    const { title, description } = resolveFieldMeta(
      template,
      match.index ?? 0,
      fieldId
    );
    placeholders[fieldId] = placeholder;
    questions.push({ id: fieldId, title, description, placeholder });
  }
  return { questions, placeholders };
};

const extractAnswers = (
  content: string,
  placeholders: Record<string, string>
): Record<string, string> => {
  const answers: Record<string, string> = {};
  const matches = content.matchAll(FIELD_REGEX);
  for (const match of matches) {
    const fieldId = match[1];
    if (!fieldId) {
      continue;
    }
    const candidate = (match[2] ?? "").trim();
    const placeholder = (placeholders[fieldId] ?? "").trim();
    answers[fieldId] = candidate === placeholder ? "" : candidate;
  }
  return answers;
};

export class IdeaQuestionnaireService {
  private readonly ideaCollector = new IdeaCollectorService();
  private readonly saveTimers = new Map<string, number>();

  async loadQuestionnaire(
    sessionId: string
  ): Promise<QuestionnaireSnapshot | null> {
    const httpUrl = resolveCoreHttpUrl();
    if (!httpUrl) {
      return null;
    }

    const [templateMarkdown, outputPaths] = await Promise.all([
      this.ideaCollector.getQuestionnaireTemplateMarkdown(),
      this.ideaCollector.getOutputPaths(),
    ]);
    if (!outputPaths) {
      return null;
    }

    const template =
      templateMarkdown && templateMarkdown.trim().length > 0
        ? templateMarkdown
        : DEFAULT_TEMPLATE;
    const { questions, placeholders } = parseTemplateFields(template);
    const questionnairePath = outputPaths.idea.replace(
      IDEA_PATH_SUFFIX_RE,
      "questionnaire.md"
    );

    const existing = await this.fetchWorkspaceFile(
      sessionId,
      questionnairePath
    );
    const content =
      existing && existing.content.trim().length > 0
        ? existing.content
        : template;
    if (!existing || existing.content.trim().length === 0) {
      await this.writeWorkspaceFile(sessionId, questionnairePath, content);
    }

    const answers = extractAnswers(content, placeholders);
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
    return template.replace(FIELD_REGEX, (_match, fieldId, fallback) => {
      const rawAnswer = answers[fieldId] ?? "";
      const trimmedAnswer = rawAnswer.trim();
      const placeholder =
        placeholders[fieldId] ?? String(fallback ?? "").trim();
      const replacement =
        trimmedAnswer.length > 0 ? rawAnswer.trimEnd() : placeholder;
      return `<!-- field:${fieldId} -->\n${replacement}\n<!-- /field -->`;
    });
  }

  queueSave(sessionId: string, path: string, content: string): void {
    const existing = this.saveTimers.get(sessionId);
    if (existing) {
      window.clearTimeout(existing);
    }
    const timer = window.setTimeout(() => {
      this.writeWorkspaceFile(sessionId, path, content).catch(() => {
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
    await this.writeWorkspaceFile(sessionId, path, content);
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
