type IdeaCollectorArtifact = {
  readonly suggestedResponse: string | null;
  readonly artifacts: readonly { slot: string; markdown: string }[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringField = (
  record: Record<string, unknown>,
  key: string
): string | null => (typeof record[key] === "string" ? record[key] : null);

const readNextAction = (
  data: Record<string, unknown>
): "finalize" | "revise_artifacts" | null => {
  let nextAction: string | null = null;
  if (typeof data.nextAction === "string") {
    nextAction = data.nextAction;
  } else if (typeof data.next_action === "string") {
    nextAction = data.next_action;
  }
  if (nextAction === "finalize" || nextAction === "revise_artifacts") {
    return nextAction;
  }
  return null;
};

const readSuggestedResponse = (data: Record<string, unknown>): string | null =>
  readStringField(data, "suggested_response") ??
  readStringField(data, "suggestedResponse");

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

const readArtifactsList = (
  data: Record<string, unknown>
): { slot: string; markdown: string }[] | null => {
  if (!Array.isArray(data.artifacts)) {
    return null;
  }

  const artifacts: { slot: string; markdown: string }[] = [];
  for (const entry of data.artifacts) {
    if (!isRecord(entry)) {
      return null;
    }
    const slot = readStringField(entry, "slot");
    const markdown = readStringField(entry, "markdown");
    if (!(slot && markdown)) {
      return null;
    }
    artifacts.push({ slot, markdown });
  }

  return artifacts;
};

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

  const suggestedResponse = readSuggestedResponse(data);

  const variantBArtifacts = readArtifactsList(data);
  if (variantBArtifacts && variantBArtifacts.length > 0) {
    return { suggestedResponse, artifacts: variantBArtifacts };
  }

  const nextAction = readNextAction(data);
  if (!nextAction) {
    return null;
  }

  const artifact = data.artifact;
  if (!isRecord(artifact)) {
    return null;
  }

  const { ideaMarkdown, virtualSimulationMarkdown } =
    readArtifactPayload(artifact);
  const legacyArtifacts: { slot: string; markdown: string }[] = [];
  if (ideaMarkdown) {
    legacyArtifacts.push({
      slot: "workspace.description",
      markdown: ideaMarkdown,
    });
  }
  if (virtualSimulationMarkdown) {
    legacyArtifacts.push({
      slot: "workspace.virtual_simulation",
      markdown: virtualSimulationMarkdown,
    });
  }

  if (legacyArtifacts.length === 0) {
    return null;
  }

  return { suggestedResponse, artifacts: legacyArtifacts };
};

export type { IdeaCollectorArtifact };
