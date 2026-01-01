export type IdeaCollectorStructuredOutput = {
  readonly suggestedResponse: string | null;
  readonly reasoningSummaryRu: string | null;
  readonly nextAction: string | null;
  readonly artifact: Record<string, unknown> | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringField = (
  record: Record<string, unknown>,
  key: string
): string | null => (typeof record[key] === "string" ? record[key] : null);

const parseIdeaCollectorOutput = (
  parsed: Record<string, unknown>
): IdeaCollectorStructuredOutput | null => {
  const suggestedResponse =
    readStringField(parsed, "suggested_response") ??
    readStringField(parsed, "suggestedResponse");
  const nextAction =
    readStringField(parsed, "next_action") ??
    readStringField(parsed, "nextAction");
  const reasoningSummaryRu =
    readStringField(parsed, "reasoning_summary_ru") ??
    readStringField(parsed, "reasoningSummaryRu");
  const artifact = isRecord(parsed.artifact) ? parsed.artifact : null;
  if (!(suggestedResponse || nextAction || artifact)) {
    return null;
  }
  return {
    suggestedResponse: suggestedResponse ?? null,
    reasoningSummaryRu: reasoningSummaryRu ?? null,
    nextAction: nextAction ?? null,
    artifact,
  };
};

export const parseIdeaCollectorOutputFromText = (
  text: string
): IdeaCollectorStructuredOutput | null => {
  if (!text.trim().startsWith("{")) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return isRecord(parsed) ? parseIdeaCollectorOutput(parsed) : null;
  } catch {
    return null;
  }
};

export const parseIdeaCollectorOutputFromResultMessage = (
  message: unknown
): IdeaCollectorStructuredOutput | null => {
  if (!isRecord(message)) {
    return null;
  }
  const payload =
    (message.structured_output as unknown) ??
    (message.structuredOutput as unknown);
  return isRecord(payload) ? parseIdeaCollectorOutput(payload) : null;
};
