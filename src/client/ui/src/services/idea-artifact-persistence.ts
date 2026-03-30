import type { IdeaCollectorArtifact } from "./idea-collector-artifact";
import { joinUrl } from "./idea-collector-support";

const ARTIFACT_UPSERT_ENDPOINT = "/api/v1/orchestrator/artifact-upsert";

type PersistIdeaArtifactsResult =
  | {
      readonly ok: true;
      readonly saved: readonly {
        slot: string;
        path: string;
        changed: boolean;
      }[];
    }
  | { readonly ok: false; readonly error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const persistIdeaArtifacts = async (params: {
  readonly httpUrl: string;
  readonly sessionId: string;
  readonly artifact: IdeaCollectorArtifact;
}): Promise<PersistIdeaArtifactsResult> => {
  const payload: Record<string, unknown> = {
    sessionId: params.sessionId,
    artifacts: params.artifact.artifacts,
  };

  const response = await fetch(
    joinUrl(params.httpUrl, ARTIFACT_UPSERT_ENDPOINT),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (response.status === 204) {
    return { ok: true, saved: [] };
  }
  if (!response.ok) {
    const errorDetails = await tryReadCoreErrorDetails(response);
    return {
      ok: false,
      error: `HTTP ${response.status}${errorDetails ? `: ${errorDetails}` : ""}`,
    };
  }

  const responsePayload = (await response.json()) as unknown;
  const savedEntries = parseSavedArtifactUpserts(responsePayload);
  return { ok: true, saved: savedEntries ?? [] };
};

const tryReadCoreErrorDetails = async (
  response: Response
): Promise<string | null> => {
  try {
    const payload = (await response.json()) as unknown;
    if (isRecord(payload) && typeof payload.error === "string") {
      return payload.error;
    }
    return null;
  } catch {
    return null;
  }
};

const parseSavedArtifactUpserts = (
  payload: unknown
): { slot: string; path: string; changed: boolean }[] | null => {
  if (!(isRecord(payload) && Array.isArray(payload.saved))) {
    return null;
  }

  const saved: { slot: string; path: string; changed: boolean }[] = [];
  for (const entry of payload.saved) {
    if (!isRecord(entry)) {
      return null;
    }
    if (typeof entry.slot !== "string" || typeof entry.path !== "string") {
      return null;
    }
    const changed = typeof entry.changed === "boolean" ? entry.changed : true;
    saved.push({ slot: entry.slot, path: entry.path, changed });
  }

  return saved;
};

export type { PersistIdeaArtifactsResult };
