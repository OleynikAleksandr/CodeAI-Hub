import { isRecord } from "@codeai-hub/agent-shared";
import type { IdeaArtifact, IdeaStructuredOutput } from "./parser-types";

/**
 * Read a string field from a record, supporting both snake_case and camelCase.
 */
const readStringField = (
  record: Record<string, unknown>,
  snakeCase: string,
  camelCase: string
): string | null => {
  const value = record[snakeCase] ?? record[camelCase];
  return typeof value === "string" ? value : null;
};

/**
 * Parse idea collector output from a parsed JSON object.
 */
const parseIdeaOutput = (
  parsed: Record<string, unknown>
): IdeaStructuredOutput | null => {
  const suggestedResponse = readStringField(
    parsed,
    "suggested_response",
    "suggestedResponse"
  );
  const nextAction = readStringField(parsed, "next_action", "nextAction");
  const reasoningSummaryRu = readStringField(
    parsed,
    "reasoning_summary_ru",
    "reasoningSummaryRu"
  );
  const artifact = isRecord(parsed.artifact)
    ? (parsed.artifact as IdeaArtifact)
    : null;

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

/**
 * Parse structured output from raw text.
 * Expects JSON starting with '{'.
 *
 * @param text - Raw text output from LLM
 * @returns Parsed output or null if parsing fails
 */
export const parseIdeaOutputFromText = (
  text: string
): IdeaStructuredOutput | null => {
  if (!text.trim().startsWith("{")) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return isRecord(parsed) ? parseIdeaOutput(parsed) : null;
  } catch {
    return null;
  }
};

/**
 * Parse structured output from a result message object.
 * Supports both snake_case and camelCase field names.
 *
 * @param message - Message object with structured_output or structuredOutput field
 * @returns Parsed output or null if parsing fails
 */
export const parseIdeaOutputFromResultMessage = (
  message: unknown
): IdeaStructuredOutput | null => {
  if (!isRecord(message)) {
    return null;
  }
  const payload =
    (message.structured_output as unknown) ??
    (message.structuredOutput as unknown);
  return isRecord(payload) ? parseIdeaOutput(payload) : null;
};
