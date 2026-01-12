type IdeaCollectorArtifactPatchTarget = "idea" | "virtual_simulation";
type IdeaCollectorArtifactPatchOperation =
  | "replace"
  | "append"
  | "prepend"
  | "remove";

type IdeaCollectorArtifactPatch = {
  readonly target: IdeaCollectorArtifactPatchTarget;
  readonly section: string;
  readonly operation: IdeaCollectorArtifactPatchOperation;
  readonly content: string;
};

type IdeaCollectorArtifact = {
  readonly nextAction: "finalize" | "revise_artifacts";
  readonly ideaPath: string | null;
  readonly ideaMarkdown: string | null;
  readonly virtualSimulationPath: string | null;
  readonly virtualSimulationMarkdown: string | null;
  readonly patch: IdeaCollectorArtifactPatch[] | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringField = (
  record: Record<string, unknown>,
  key: string
): string | null => (typeof record[key] === "string" ? record[key] : null);

const PATCH_TARGETS = new Set<IdeaCollectorArtifactPatchTarget>([
  "idea",
  "virtual_simulation",
]);
const PATCH_OPERATIONS = new Set<IdeaCollectorArtifactPatchOperation>([
  "replace",
  "append",
  "prepend",
  "remove",
]);

const parsePatchEntry = (entry: unknown): IdeaCollectorArtifactPatch | null => {
  if (!isRecord(entry)) {
    return null;
  }
  const targetRaw = readStringField(entry, "target");
  if (
    !(
      targetRaw &&
      PATCH_TARGETS.has(targetRaw as IdeaCollectorArtifactPatchTarget)
    )
  ) {
    return null;
  }
  const section = readStringField(entry, "section");
  if (!section) {
    return null;
  }
  const operationRaw = readStringField(entry, "operation");
  if (
    !(
      operationRaw &&
      PATCH_OPERATIONS.has(operationRaw as IdeaCollectorArtifactPatchOperation)
    )
  ) {
    return null;
  }
  const content = readStringField(entry, "content");
  if (content === null) {
    return null;
  }
  return {
    target: targetRaw as IdeaCollectorArtifactPatchTarget,
    section,
    operation: operationRaw as IdeaCollectorArtifactPatchOperation,
    content,
  };
};

const parsePatchList = (
  patchValue: unknown
): IdeaCollectorArtifactPatch[] | null => {
  if (!Array.isArray(patchValue)) {
    return null;
  }
  const entries = patchValue
    .map((entry) => parsePatchEntry(entry))
    .filter((entry): entry is IdeaCollectorArtifactPatch => entry !== null);
  return entries.length > 0 ? entries : null;
};

const readNextAction = (
  data: Record<string, unknown>
): IdeaCollectorArtifact["nextAction"] | null => {
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
  const patch = parsePatchList(artifact.patch);
  return {
    ideaPath,
    virtualSimulationPath,
    ideaMarkdown,
    virtualSimulationMarkdown,
    patch,
  };
};

const isArtifactReady = (
  nextAction: IdeaCollectorArtifact["nextAction"],
  ideaMarkdown: string | null,
  virtualSimulationMarkdown: string | null,
  patch: IdeaCollectorArtifactPatch[] | null
): boolean => {
  const hasFull = Boolean(ideaMarkdown) && Boolean(virtualSimulationMarkdown);
  const hasPatch = Boolean(patch);
  if (nextAction === "finalize") {
    return hasFull;
  }
  return hasFull || hasPatch;
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
    patch,
  } = readArtifactPayload(artifact);
  if (
    !isArtifactReady(nextAction, ideaMarkdown, virtualSimulationMarkdown, patch)
  ) {
    return null;
  }
  return {
    nextAction,
    ideaPath,
    ideaMarkdown,
    virtualSimulationPath,
    virtualSimulationMarkdown,
    patch,
  };
};

export type { IdeaCollectorArtifact };
