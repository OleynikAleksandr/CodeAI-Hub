const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readAppliedGeminiModelId = (
  turnOptions?: Record<string, unknown>
): string | undefined => {
  const candidate = turnOptions?.__codeaiAppliedTurnConfig;
  if (!isRecord(candidate) || candidate.providerId !== "geminiCli") {
    return undefined;
  }
  return typeof candidate.modelId === "string" &&
    candidate.modelId.trim().length > 0
    ? candidate.modelId.trim()
    : undefined;
};
