import type { IdeaCollectorArtifact } from "./idea-collector-artifact";
import type { IdeaContractSnapshot } from "./idea-collector-contract";

type IdeaArtifactPaths = {
  readonly ideaPath: string;
  readonly virtualSimulationPath: string;
};

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

export type { IdeaArtifactPaths };
