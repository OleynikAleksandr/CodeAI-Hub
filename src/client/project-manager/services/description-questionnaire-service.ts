import {
  extractIdeaQuestionnaireAnswers,
  parseIdeaQuestionnaireTemplateFields,
  renderIdeaQuestionnaire,
} from "../../ui/src/services/idea-questionnaire-template";
import { buildCanonicalQuestionnairePath } from "../../ui/src/services/idea-questionnaire-paths";
import {
  buildDefaults,
  isRecord,
  isWorkspaceFileResponse,
  isWorkspaceSessionResponse,
  joinUrl,
  resolveCoreHttpUrl,
  resolveWorkspaceName,
  toWorkspaceSlug,
  type QuestionnaireLoadResult,
  type WorkspaceFileFetchResult,
  type WorkspaceInfo,
} from "./description-questionnaire-utils";

const IDEA_CONTRACT_ENDPOINT = "/api/v1/orchestrator/idea-contract";
const WORKSPACE_FILE_ENDPOINT = "/api/v1/orchestrator/workspace-file";
const WORKSPACE_FILE_WRITE_ENDPOINT =
  "/api/v1/orchestrator/workspace-file-write";
const WORKSPACE_SESSION_ENDPOINT = "/api/v1/orchestrator/workspace-session";

const DEFAULT_TEMPLATE = "# Description Questionnaire\n\n";

type IdeaContractPayload = {
  readonly questionnaire?: {
    readonly templateMarkdown?: string;
  };
};

const sessionCache = new Map<string, string>();

const resolveTemplateMarkdown = async (): Promise<string> => {
  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    return DEFAULT_TEMPLATE;
  }

  try {
    const response = await fetch(joinUrl(httpUrl, IDEA_CONTRACT_ENDPOINT));
    if (!response.ok) {
      return DEFAULT_TEMPLATE;
    }
    const payload = (await response.json()) as unknown;
    if (!isRecord(payload)) {
      return DEFAULT_TEMPLATE;
    }
    const questionnaire = (payload as IdeaContractPayload).questionnaire;
    const template = questionnaire?.templateMarkdown;
    if (typeof template === "string" && template.trim().length > 0) {
      return template;
    }
  } catch {
    return DEFAULT_TEMPLATE;
  }

  return DEFAULT_TEMPLATE;
};

const readWorkspaceFile = async (
  sessionId: string,
  path: string
): Promise<WorkspaceFileFetchResult> => {
  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    return { status: "error" };
  }
  try {
    const response = await fetch(joinUrl(httpUrl, WORKSPACE_FILE_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, path, maxBytes: 300_000 }),
    });

    if (!response.ok) {
      return response.status === 404
        ? { status: "missing" }
        : { status: "error" };
    }

    const payload = (await response.json()) as unknown;
    if (!isWorkspaceFileResponse(payload)) {
      return { status: "error" };
    }

    return { status: "ok", file: payload };
  } catch {
    return { status: "error" };
  }
};

const writeWorkspaceFile = async (
  sessionId: string,
  path: string,
  content: string
): Promise<void> => {
  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    return;
  }
  await fetch(joinUrl(httpUrl, WORKSPACE_FILE_WRITE_ENDPOINT), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, path, content }),
  });
};

const ensureWorkspaceSession = async (
  workspacePath: string,
  initiativeSlug: string
): Promise<string | null> => {
  const existing = sessionCache.get(workspacePath);
  if (existing) {
    return existing;
  }

  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    return null;
  }

  try {
    const response = await fetch(joinUrl(httpUrl, WORKSPACE_SESSION_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspacePath,
        initiativeSlug,
        stage: "idea",
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (!isWorkspaceSessionResponse(payload)) {
      return null;
    }

    sessionCache.set(workspacePath, payload.sessionId);
    return payload.sessionId;
  } catch {
    return null;
  }
};

export class DescriptionQuestionnaireService {
  async load(workspace: WorkspaceInfo): Promise<QuestionnaireLoadResult> {
    const workspaceName = resolveWorkspaceName(workspace);
    const workspaceSlug =
      typeof workspace.slug === "string" && workspace.slug.trim().length > 0
        ? workspace.slug.trim()
        : toWorkspaceSlug(workspaceName);
    const sessionId = await ensureWorkspaceSession(
      workspace.path,
      workspaceSlug
    );
    if (!sessionId) {
      return { status: "error" };
    }

    const template = await resolveTemplateMarkdown();
    const { questions, placeholders } =
      parseIdeaQuestionnaireTemplateFields(template);

    const questionnairePath = buildCanonicalQuestionnairePath(workspaceSlug);
    const existing = await readWorkspaceFile(sessionId, questionnairePath);
    const existingContent =
      existing.status === "ok" ? existing.file.content : null;

    const defaults = buildDefaults(workspaceName, workspace.path);
    const baseContent = existingContent ?? template;
    const answers = extractIdeaQuestionnaireAnswers(baseContent, placeholders);

    const nextAnswers = { ...answers };
    for (const [fieldId, value] of Object.entries(defaults)) {
      if (!nextAnswers[fieldId] || nextAnswers[fieldId].trim().length === 0) {
        nextAnswers[fieldId] = value;
      }
    }

    const rendered = renderIdeaQuestionnaire(
      template,
      placeholders,
      nextAnswers
    );

    if (!existingContent || rendered.trim() !== existingContent.trim()) {
      await writeWorkspaceFile(sessionId, questionnairePath, rendered);
    }

    return {
      status: "ok",
      value: {
        sessionId,
        path: questionnairePath,
        template,
        questions,
        placeholders,
        answers: nextAnswers,
      },
    };
  }

  async save(
    sessionId: string,
    questionnairePath: string,
    template: string,
    placeholders: Record<string, string>,
    answers: Record<string, string>
  ): Promise<void> {
    const content = renderIdeaQuestionnaire(template, placeholders, answers);
    await writeWorkspaceFile(sessionId, questionnairePath, content);
  }
}
