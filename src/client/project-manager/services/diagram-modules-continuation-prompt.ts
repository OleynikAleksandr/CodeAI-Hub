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
    "",
    "Next target artifact:",
    `\`${input.expectedArtifactPath}\``,
    "",
    `Materialize only Product Part "${input.partId}".`,
    input.acceptedPartIds.length > 0
      ? `Already accepted Product Parts: ${input.acceptedPartIds.join(", ")}.`
      : "No Product Part artifacts have been accepted yet.",
    "Do not edit accepted Product Parts unless Core explicitly names them in this message.",
    "Do not create or update any other Product Part file in this turn.",
    "Do not continue to the next Product Part by yourself.",
    "When ready, stop with a content-readiness note for Core acceptance.",
  ].join("\n");
