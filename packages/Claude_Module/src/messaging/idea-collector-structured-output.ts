/**
 * Idea Collector Structured Output.
 *
 * NOTE: Provider modules are installed into `~/.codeai-hub/providers/**` without a
 * full workspace `node_modules` tree. To keep the Claude provider self-contained
 * in that environment, we implement a minimal parser here instead of importing
 * `@codeai-hub/idea-collector` at runtime.
 */

export interface IdeaCollectorStructuredOutput {
  readonly artifact: Record<string, unknown> | null;
  readonly nextAction: string | null;
  readonly suggestedResponse: string | null;
}

const CODE_FENCE_PATTERN = /```(?:json)?\s*([\s\S]*?)```/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringField = (
  record: Record<string, unknown>,
  snakeCase: string,
  camelCase: string
): string | null => {
  const value = record[snakeCase] ?? record[camelCase];
  return typeof value === "string" ? value : null;
};

const parseIdeaCollectorOutput = (
  parsed: Record<string, unknown>
): IdeaCollectorStructuredOutput | null => {
  const suggestedResponse = readStringField(
    parsed,
    "suggested_response",
    "suggestedResponse"
  );
  const nextAction = readStringField(parsed, "next_action", "nextAction");
  const artifact = isRecord(parsed.artifact) ? parsed.artifact : null;

  if (!(suggestedResponse || nextAction || artifact)) {
    return null;
  }

  return {
    suggestedResponse: suggestedResponse ?? null,
    nextAction: nextAction ?? null,
    artifact,
  };
};

const parseIdeaCollectorOutputFromJson = (
  raw: string
): IdeaCollectorStructuredOutput | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parseIdeaCollectorOutput(parsed) : null;
  } catch {
    return null;
  }
};

const readStructuredOutputPayload = (
  source: Record<string, unknown>
): Record<string, unknown> | null => {
  const direct =
    (source.structured_output as unknown) ??
    (source.structuredOutput as unknown);
  if (isRecord(direct)) {
    return direct;
  }
  const payload = source.payload;
  if (isRecord(payload)) {
    const payloadDirect =
      (payload.structured_output as unknown) ??
      (payload.structuredOutput as unknown);
    if (isRecord(payloadDirect)) {
      return payloadDirect;
    }
  }
  const result = source.result;
  if (isRecord(result)) {
    return readStructuredOutputPayload(result);
  }
  return null;
};

export const parseIdeaCollectorOutputFromText = (
  text: string
): IdeaCollectorStructuredOutput | null => {
  const trimmed = text.trim();
  const direct =
    trimmed.startsWith("{") || trimmed.startsWith("[")
      ? parseIdeaCollectorOutputFromJson(trimmed)
      : null;
  if (direct) {
    return direct;
  }
  const fenced = CODE_FENCE_PATTERN.exec(trimmed)?.[1];
  if (!fenced) {
    return null;
  }
  return parseIdeaCollectorOutputFromJson(fenced.trim());
};

export const parseIdeaCollectorOutputFromResultMessage = (
  message: unknown
): IdeaCollectorStructuredOutput | null => {
  if (!isRecord(message)) {
    return null;
  }
  const payload = readStructuredOutputPayload(message);
  return payload ? parseIdeaCollectorOutput(payload) : null;
};
