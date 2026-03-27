import { joinUrl, resolveCoreHttpUrl } from "./idea-collector-support";

export interface WorkspaceFileResponse {
  readonly content: string;
  readonly maxBytes: number;
  readonly path: string;
  readonly truncated: boolean;
}

export type WorkspaceFileFetchResult =
  | { readonly status: "ok"; readonly file: WorkspaceFileResponse }
  | { readonly status: "missing" }
  | { readonly status: "error" };

const WORKSPACE_FILE_ENDPOINT = "/api/v1/orchestrator/workspace-file";
const WORKSPACE_FILE_WRITE_ENDPOINT =
  "/api/v1/orchestrator/workspace-file-write";

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

export class WorkspaceFileService {
  async read(
    sessionId: string,
    path: string,
    maxBytes: number
  ): Promise<WorkspaceFileFetchResult> {
    const httpUrl = resolveCoreHttpUrl();
    if (!httpUrl) {
      return { status: "error" };
    }
    try {
      const response = await fetch(joinUrl(httpUrl, WORKSPACE_FILE_ENDPOINT), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, path, maxBytes }),
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
  }

  async write(sessionId: string, path: string, content: string): Promise<void> {
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
