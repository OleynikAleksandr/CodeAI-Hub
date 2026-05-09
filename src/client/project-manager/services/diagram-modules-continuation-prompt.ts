export type DiagramModulesContinuationPromptInput = {
  readonly acceptedPartIds: readonly string[];
  readonly expectedArtifactPath: string;
  readonly partId: string;
};

export const buildDiagramModulesContinuationPrompt = (
  input: DiagramModulesContinuationPromptInput
): string =>
  [
    "Core accepted the previous Diagram Modules artifact.",
    "This Core continuation message is the authoritative scope for the current turn.",
    "If any earlier Core message reported aggregate missing Product Part artifacts, treat that older aggregate scope as superseded by the target below.",
    "",
    "Next target artifact:",
    `\`${input.expectedArtifactPath}\``,
    "",
    `Materialize only Product Part "${input.partId}".`,
    input.acceptedPartIds.length > 0
      ? `Already accepted Product Parts: ${input.acceptedPartIds.join(", ")}.`
      : "No Product Part artifacts have been accepted yet.",
    "Do not edit accepted Product Parts unless Core explicitly names them in this message.",
    "Existing sibling Product Part files do not expand this turn scope.",
    "Do not create or update any other Product Part file in this turn.",
    "Do not continue to the next Product Part by yourself.",
    "When ready, stop with a content-readiness note for Core acceptance.",
  ].join("\n");
