import type { QuestionnaireQuestion } from "../../ui/src/components/idea-questionnaire/question-block";

type WorkspaceFileResponse = {
  readonly path: string;
  readonly truncated: boolean;
  readonly maxBytes: number;
  readonly content: string;
};

type QuestionnaireSnapshot = {
  readonly sessionId: string;
  readonly path: string;
  readonly template: string;
  readonly questions: readonly QuestionnaireQuestion[];
  readonly placeholders: Record<string, string>;
  readonly answers: Record<string, string>;
};

type WorkspaceInfo = {
  readonly name?: string;
  readonly path: string;
  readonly slug?: string;
};

type WorkspaceFileFetchResult =
  | { readonly status: "ok"; readonly file: WorkspaceFileResponse }
  | { readonly status: "missing" }
  | { readonly status: "error" };

type QuestionnaireLoadResult =
  | { readonly status: "ok"; readonly value: QuestionnaireSnapshot }
  | { readonly status: "error" };

type WorkspaceSessionResponse = {
  readonly sessionId: string;
};

const DEFAULT_CORE_HTTP_URL = "http://127.0.0.1:8080";

const resolveCoreHttpUrl = (): string => {
  const globalScope = window as typeof window & {
    codeaiBridgeConfig?: { readonly httpUrl?: string };
  };
  const httpUrl = globalScope.codeaiBridgeConfig?.httpUrl;
  if (typeof httpUrl !== "string" || httpUrl.length === 0) {
    return DEFAULT_CORE_HTTP_URL;
  }
  return httpUrl;
};

const joinUrl = (baseUrl: string, path: string): string =>
  baseUrl.endsWith("/") ? `${baseUrl.slice(0, -1)}${path}` : `${baseUrl}${path}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isWorkspaceSessionResponse = (
  value: unknown
): value is WorkspaceSessionResponse =>
  isRecord(value) && typeof value.sessionId === "string";

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

const resolveWorkspaceName = (workspace: WorkspaceInfo): string => {
  if (workspace.name && workspace.name.trim().length > 0) {
    return workspace.name.trim();
  }
  const normalized = workspace.path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter((part) => part.length > 0);
  return parts.at(-1) ?? "Workspace";
};

const toWorkspaceSlug = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return slug.length > 0 ? slug : "workspace";
};

const buildDefaults = (
  workspaceName: string,
  _workspacePath: string
): Record<string, string> => ({
  "meta.title": workspaceName,
});

const resolveQuestionnairePath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/description/questionnaire.md`;

export type {
  QuestionnaireLoadResult,
  QuestionnaireSnapshot,
  WorkspaceFileFetchResult,
  WorkspaceFileResponse,
  WorkspaceInfo,
};
export {
  buildDefaults,
  isRecord,
  isWorkspaceFileResponse,
  isWorkspaceSessionResponse,
  joinUrl,
  resolveCoreHttpUrl,
  resolveQuestionnairePath,
  resolveWorkspaceName,
  toWorkspaceSlug,
};
