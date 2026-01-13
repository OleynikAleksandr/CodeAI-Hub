type IdeaCollectorArtifact = {
  readonly nextAction: "finalize";
  readonly ideaPath: string | null;
  readonly ideaMarkdown: string | null;
  readonly virtualSimulationPath: string | null;
  readonly virtualSimulationMarkdown: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringField = (
  record: Record<string, unknown>,
  key: string
): string | null => (typeof record[key] === "string" ? record[key] : null);

const readNextAction = (
  data: Record<string, unknown>
): IdeaCollectorArtifact["nextAction"] | null => {
  let nextAction: string | null = null;
  if (typeof data.nextAction === "string") {
    nextAction = data.nextAction;
  } else if (typeof data.next_action === "string") {
    nextAction = data.next_action;
  }
  if (nextAction === "finalize") {
    return nextAction;
  }
  return null;
};

const readArtifactPayload = (artifact: Record<string, unknown>) => {
  const ideaPath =
    readStringField(artifact, "ideaPath") ??
    readStringField(artifact, "idea_path") ??
    readStringField(artifact, "path");
  const virtualSimulationPath =
    readStringField(artifact, "virtualSimulationPath") ??
    readStringField(artifact, "virtual_simulation_path");
  const ideaMarkdown =
    readStringField(artifact, "ideaMarkdown") ??
    readStringField(artifact, "idea_markdown");
  const virtualSimulationMarkdown =
    readStringField(artifact, "virtualSimulationMarkdown") ??
    readStringField(artifact, "virtual_simulation_markdown");
  return {
    ideaPath,
    virtualSimulationPath,
    ideaMarkdown,
    virtualSimulationMarkdown,
  };
};

const isArtifactReady = (
  ideaMarkdown: string | null,
  virtualSimulationMarkdown: string | null
): boolean => Boolean(ideaMarkdown) && Boolean(virtualSimulationMarkdown);

export const extractIdeaCollectorArtifact = (
  event: unknown
): IdeaCollectorArtifact | null => {
  if (!isRecord(event)) {
    return null;
  }
  const data = event.data;
  if (!isRecord(data) || data.kind !== "structured_output") {
    return null;
  }
  const nextAction = readNextAction(data);
  if (!nextAction) {
    return null;
  }
  const artifact = data.artifact;
  if (!isRecord(artifact)) {
    return null;
  }
  const {
    ideaPath,
    virtualSimulationPath,
    ideaMarkdown,
    virtualSimulationMarkdown,
  } = readArtifactPayload(artifact);
  if (!isArtifactReady(ideaMarkdown, virtualSimulationMarkdown)) {
    return null;
  }
  return {
    nextAction,
    ideaPath,
    ideaMarkdown,
    virtualSimulationPath,
    virtualSimulationMarkdown,
  };
};

export type { IdeaCollectorArtifact };
