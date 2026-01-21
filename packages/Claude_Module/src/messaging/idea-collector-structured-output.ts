/**
 * Idea Collector Structured Output.
 *
 * NOTE: Provider modules are installed into `~/.codeai-hub/providers/**` without a
 * full workspace `node_modules` tree. To keep the Claude provider self-contained
 * in that environment, we implement a minimal parser here instead of importing
 * `@codeai-hub/idea-collector` at runtime.
 */

export type IdeaCollectorStructuredOutput = {
  readonly suggestedResponse: string | null;
  readonly nextAction: string | null;
  readonly artifact: Record<string, unknown> | null;
};

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
