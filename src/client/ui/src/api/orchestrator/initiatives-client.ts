import { joinUrl } from "../../services/idea-collector-support";

type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string };

export interface InitiativeSummary {
  readonly currentRunId?: string;
  readonly description?: string;
  readonly displayName: string;
  readonly initiativeSlug: string;
}

interface CreateInitiativeInput {
  readonly createInitialRun?: {
    readonly displayName: string;
    readonly description?: string;
  };
  readonly description?: string;
  readonly displayName: string;
}

const INITIATIVES_ENDPOINT = "/api/v1/orchestrator/initiatives";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isInitiativeSummary = (value: unknown): value is InitiativeSummary => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.initiativeSlug === "string" &&
    typeof value.displayName === "string"
  );
};

const parseInitiatives = (value: unknown): InitiativeSummary[] => {
  if (!isRecord(value)) {
    return [];
  }

  const raw = value.initiatives;
  if (!Array.isArray(raw)) {
    return [];
  }

  const initiatives: InitiativeSummary[] = [];
  for (const entry of raw) {
    if (!isInitiativeSummary(entry)) {
      continue;
    }

    initiatives.push({
      initiativeSlug: entry.initiativeSlug,
      displayName: entry.displayName,
      description:
        typeof entry.description === "string" ? entry.description : undefined,
      currentRunId:
        typeof entry.currentRunId === "string" ? entry.currentRunId : undefined,
    });
  }

  return initiatives;
};

const parseCreatedInitiative = (value: unknown): InitiativeSummary | null => {
  if (!isRecord(value)) {
    return null;
  }

  const initiative = value.initiative;
  if (!isInitiativeSummary(initiative)) {
    return null;
  }

  return {
    initiativeSlug: initiative.initiativeSlug,
    displayName: initiative.displayName,
    description:
      typeof initiative.description === "string"
        ? initiative.description
        : undefined,
    currentRunId:
      typeof initiative.currentRunId === "string"
        ? initiative.currentRunId
        : undefined,
  };
};

const buildInitiativesUrl = (
  httpUrl: string,
  workspacePath: string
): string => {
  const url = new URL(joinUrl(httpUrl, INITIATIVES_ENDPOINT));
  url.searchParams.set("workspacePath", workspacePath);
  return url.toString();
};

export const listInitiatives = async (
  httpUrl: string,
  workspacePath: string
): Promise<ApiResult<readonly InitiativeSummary[]>> => {
  try {
    const response = await fetch(buildInitiativesUrl(httpUrl, workspacePath), {
      method: "GET",
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `Failed to load initiatives (HTTP ${response.status}).`,
      };
    }

    const payload = (await response.json()) as unknown;
    return { ok: true, data: parseInitiatives(payload) };
  } catch {
    return { ok: false, error: "Failed to reach CodeAI Hub core." };
  }
};

export const createInitiative = async (
  httpUrl: string,
  workspacePath: string,
  input: CreateInitiativeInput
): Promise<ApiResult<InitiativeSummary>> => {
  try {
    const response = await fetch(buildInitiativesUrl(httpUrl, workspacePath), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspacePath,
        displayName: input.displayName,
        description: input.description,
        createInitialRun: input.createInitialRun,
      }),
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `Failed to create initiative (HTTP ${response.status}).`,
      };
    }

    const payload = (await response.json()) as unknown;
    const initiative = parseCreatedInitiative(payload);
    if (!initiative) {
      return { ok: false, error: "Invalid initiative response payload." };
    }

    return { ok: true, data: initiative };
  } catch {
    return { ok: false, error: "Failed to reach CodeAI Hub core." };
  }
};
