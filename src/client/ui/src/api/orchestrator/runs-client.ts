import { joinUrl } from "../../services/idea-collector-support";

type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string };

export type RunSummary = {
  readonly runId: string;
  readonly runSlug: string;
  readonly displayName: string;
  readonly description?: string;
  readonly createdAt?: string;
  readonly providerId?: string;
  readonly providerSessionId?: string;
};

type CreateRunInput = {
  readonly displayName: string;
  readonly description?: string;
};

type RunListResult = {
  readonly runs: readonly RunSummary[];
  readonly currentRunId: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRunSummary = (value: unknown): value is RunSummary => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.runId === "string" &&
    typeof value.runSlug === "string" &&
    typeof value.displayName === "string"
  );
};

const parseRunSummary = (value: unknown): RunSummary | null => {
  if (!isRunSummary(value)) {
    return null;
  }

  return {
    runId: value.runId,
    runSlug: value.runSlug,
    displayName: value.displayName,
    description:
      typeof value.description === "string" ? value.description : undefined,
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : undefined,
    providerId:
      typeof value.providerId === "string" ? value.providerId : undefined,
    providerSessionId:
      typeof value.providerSessionId === "string"
        ? value.providerSessionId
        : undefined,
  };
};

const buildRunsUrl = (
  httpUrl: string,
  workspacePath: string,
  initiativeSlug: string
): string => {
  const encodedSlug = encodeURIComponent(initiativeSlug);
  const url = new URL(
    joinUrl(httpUrl, `/api/v1/orchestrator/initiatives/${encodedSlug}/runs`)
  );
  url.searchParams.set("workspacePath", workspacePath);
  return url.toString();
};

const buildSelectCurrentUrl = (
  httpUrl: string,
  workspacePath: string,
  initiativeSlug: string,
  runId: string
): string => {
  const encodedSlug = encodeURIComponent(initiativeSlug);
  const encodedRunId = encodeURIComponent(runId);
  const url = new URL(
    joinUrl(
      httpUrl,
      `/api/v1/orchestrator/initiatives/${encodedSlug}/runs/${encodedRunId}/select-current`
    )
  );
  url.searchParams.set("workspacePath", workspacePath);
  return url.toString();
};

const parseRunList = (value: unknown): RunListResult => {
  if (!isRecord(value)) {
    return { runs: [], currentRunId: null };
  }

  const raw = value.runs;
  const runs: RunSummary[] = [];
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const parsed = parseRunSummary(entry);
      if (parsed) {
        runs.push(parsed);
      }
    }
  }

  const currentRunId =
    typeof value.currentRunId === "string" ? value.currentRunId : null;

  return { runs, currentRunId };
};

const parseCreatedRun = (
  value: unknown
): { run: RunSummary; currentRunId: string } | null => {
  if (!isRecord(value)) {
    return null;
  }

  const run = parseRunSummary(value.run);
  const currentRunId = value.currentRunId;
  if (!run || typeof currentRunId !== "string") {
    return null;
  }

  return { run, currentRunId };
};

const parseCurrentRunId = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value.currentRunId === "string" ? value.currentRunId : null;
};

export const listRuns = async (
  httpUrl: string,
  workspacePath: string,
  initiativeSlug: string
): Promise<ApiResult<RunListResult>> => {
  try {
    const response = await fetch(
      buildRunsUrl(httpUrl, workspacePath, initiativeSlug),
      { method: "GET" }
    );
    if (!response.ok) {
      return {
        ok: false,
        error: `Failed to load runs (HTTP ${response.status}).`,
      };
    }

    const payload = (await response.json()) as unknown;
    return { ok: true, data: parseRunList(payload) };
  } catch {
    return { ok: false, error: "Failed to reach CodeAI Hub core." };
  }
};

export const createRun = async (
  httpUrl: string,
  workspacePath: string,
  initiativeSlug: string,
  input: CreateRunInput
): Promise<ApiResult<{ run: RunSummary; currentRunId: string }>> => {
  try {
    const response = await fetch(
      buildRunsUrl(httpUrl, workspacePath, initiativeSlug),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspacePath,
          displayName: input.displayName,
          description: input.description,
        }),
      }
    );
    if (!response.ok) {
      return {
        ok: false,
        error: `Failed to create run (HTTP ${response.status}).`,
      };
    }

    const payload = (await response.json()) as unknown;
    const parsed = parseCreatedRun(payload);
    if (!parsed) {
      return { ok: false, error: "Invalid run response payload." };
    }

    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: "Failed to reach CodeAI Hub core." };
  }
};

export const selectCurrentRun = async (
  httpUrl: string,
  workspacePath: string,
  initiativeSlug: string,
  runId: string
): Promise<ApiResult<string>> => {
  try {
    const response = await fetch(
      buildSelectCurrentUrl(httpUrl, workspacePath, initiativeSlug, runId),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspacePath }),
      }
    );
    if (!response.ok) {
      return {
        ok: false,
        error: `Failed to select run (HTTP ${response.status}).`,
      };
    }

    const payload = (await response.json()) as unknown;
    const currentRunId = parseCurrentRunId(payload);
    if (!currentRunId) {
      return { ok: false, error: "Invalid run selection response." };
    }

    return { ok: true, data: currentRunId };
  } catch {
    return { ok: false, error: "Failed to reach CodeAI Hub core." };
  }
};
