import type { IdeaCollectorArtifact } from "./idea-collector-artifact";
import type { IdeaContractSnapshot } from "./idea-collector-contract";
import { joinUrl } from "./idea-collector-support";

const IDEA_ARTIFACT_ENDPOINT = "/api/v1/orchestrator/idea-artifact";

type IdeaArtifactPaths = {
  readonly ideaPath: string;
  readonly virtualSimulationPath: string;
};

type PersistIdeaArtifactsResult =
  | {
      readonly ok: true;
      readonly paths: { idea: string; virtualSimulation: string };
    }
  | { readonly ok: false; readonly error: string };

export const resolveIdeaArtifactPaths = (
  outputPathsBySession: Map<string, IdeaContractSnapshot["outputPaths"]>,
  sessionId: string,
  artifact: IdeaCollectorArtifact
): IdeaArtifactPaths | null => {
  const outputPaths = outputPathsBySession.get(sessionId);
  const ideaPath = outputPaths?.idea ?? artifact.ideaPath;
  const virtualSimulationPath =
    outputPaths?.virtualSimulation ?? artifact.virtualSimulationPath;
  if (!(ideaPath && virtualSimulationPath)) {
    return null;
  }
  if (!outputPaths) {
    outputPathsBySession.set(sessionId, {
      idea: ideaPath,
      virtualSimulation: virtualSimulationPath,
    });
  }
  return { ideaPath, virtualSimulationPath };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const persistIdeaArtifacts = async (params: {
  readonly httpUrl: string;
  readonly sessionId: string;
  readonly artifact: IdeaCollectorArtifact;
  readonly paths: IdeaArtifactPaths;
}): Promise<PersistIdeaArtifactsResult> => {
  const payload: Record<string, unknown> = {
    sessionId: params.sessionId,
    nextAction: params.artifact.nextAction,
    ideaPath: params.paths.ideaPath,
    virtualSimulationPath: params.paths.virtualSimulationPath,
  };
  if (params.artifact.ideaMarkdown) {
    payload.ideaMarkdown = params.artifact.ideaMarkdown;
  }
  if (params.artifact.virtualSimulationMarkdown) {
    payload.virtualSimulationMarkdown =
      params.artifact.virtualSimulationMarkdown;
  }

  const response = await fetch(
    joinUrl(params.httpUrl, IDEA_ARTIFACT_ENDPOINT),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    const errorDetails = await tryReadCoreErrorDetails(response);
    return {
      ok: false,
      error: `HTTP ${response.status}${errorDetails ? `: ${errorDetails}` : ""}`,
    };
  }
  const responsePayload = (await response.json()) as unknown;
  const savedIdeaPath =
    isRecord(responsePayload) &&
    isRecord(responsePayload.paths) &&
    typeof responsePayload.paths.idea === "string"
      ? responsePayload.paths.idea
      : params.paths.ideaPath;
  const savedVirtualSimulationPath =
    isRecord(responsePayload) &&
    isRecord(responsePayload.paths) &&
    typeof responsePayload.paths.virtualSimulation === "string"
      ? responsePayload.paths.virtualSimulation
      : params.paths.virtualSimulationPath;
  return {
    ok: true,
    paths: {
      idea: savedIdeaPath,
      virtualSimulation: savedVirtualSimulationPath,
    },
  };
};

export const tryReadCoreErrorDetails = async (
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

export type { IdeaArtifactPaths, PersistIdeaArtifactsResult };
