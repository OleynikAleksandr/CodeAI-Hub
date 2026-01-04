type IdeaCollectorArtifact = {
  readonly ideaPath: string;
  readonly ideaMarkdown: string;
  readonly virtualSimulationPath: string;
  readonly virtualSimulationMarkdown: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringField = (
  record: Record<string, unknown>,
  key: string
): string | null => (typeof record[key] === "string" ? record[key] : null);

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
  let nextAction: string | null = null;
  if (typeof data.nextAction === "string") {
    nextAction = data.nextAction;
  } else if (typeof data.next_action === "string") {
    nextAction = data.next_action;
  }
  if (nextAction !== "finalize") {
    return null;
  }
  const artifact = data.artifact;
  if (!isRecord(artifact)) {
    return null;
  }
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
  if (
    !(
      ideaPath &&
      ideaMarkdown &&
      virtualSimulationPath &&
      virtualSimulationMarkdown
    )
  ) {
    return null;
  }
  return {
    ideaPath,
    ideaMarkdown,
    virtualSimulationPath,
    virtualSimulationMarkdown,
  };
};

export type { IdeaCollectorArtifact };
