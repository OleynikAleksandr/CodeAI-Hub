import type { ClaudeStreamMessage } from "../types";

import type { VariantBArtifact as VariantBArtifactType } from "./structured-output-utils";

type VariantBArtifact = VariantBArtifactType;

const QUESTION_SLOT_PATTERN = /^question\d*$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface VariantBPartition {
  readonly artifacts?: VariantBArtifact[];
  readonly questions: string[];
}

export const partitionVariantBArtifacts = (
  artifacts: VariantBArtifact[] | null
): VariantBPartition => {
  if (!Array.isArray(artifacts)) {
    return { questions: [] };
  }
  const keep: VariantBArtifact[] = [];
  const questions: string[] = [];
  for (const artifact of artifacts) {
    const slot = artifact.slot.trim();
    const markdown = artifact.markdown.trim();
    if (!(slot && markdown)) {
      continue;
    }
    if (QUESTION_SLOT_PATTERN.test(slot)) {
      questions.push(markdown);
      continue;
    }
    keep.push({ slot, markdown });
  }
  return {
    artifacts: keep.length > 0 ? keep : undefined,
    questions,
  };
};

export const appendQuestionsToSuggestedResponse = (
  suggestedResponse: string | null | undefined,
  questions: string[]
): string | null => {
  if (questions.length === 0) {
    return suggestedResponse ?? null;
  }
  const questionsBlock = `Вопросы:\n${questions
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n")}`;
  if (suggestedResponse && suggestedResponse.trim().length > 0) {
    return `${suggestedResponse}\n\n${questionsBlock}`;
  }
  return questionsBlock;
};

const readStructuredOutputField = (
  source: Record<string, unknown>
): Record<string, unknown> | null => {
  const candidate = source.structured_output ?? source.structuredOutput;
  return isRecord(candidate) ? candidate : null;
};

/**
 * Walk the raw claude assistant/result message shape (top-level,
 * payload.structured_output, result.structured_output, result.payload.structured_output)
 * and return a message with a resolved `structured_output` field when any
 * of those nested locations carry one.
 */
export const normalizeStructuredOutputMessage = (
  message: ClaudeStreamMessage
): ClaudeStreamMessage => {
  const raw = message as Record<string, unknown>;
  const direct = readStructuredOutputField(raw);
  if (direct) {
    return message;
  }
  const payload = isRecord(raw.payload) ? raw.payload : null;
  const payloadStructured = payload ? readStructuredOutputField(payload) : null;
  if (payloadStructured) {
    return { ...message, structured_output: payloadStructured };
  }
  const result = isRecord(raw.result) ? raw.result : null;
  if (!result) {
    return message;
  }
  const resultStructured = readStructuredOutputField(result);
  if (resultStructured) {
    return { ...message, structured_output: resultStructured };
  }
  const resultPayload = isRecord(result.payload) ? result.payload : null;
  const resultPayloadStructured = resultPayload
    ? readStructuredOutputField(resultPayload)
    : null;
  if (resultPayloadStructured) {
    return { ...message, structured_output: resultPayloadStructured };
  }
  return message;
};

export { extractVariantBArtifacts } from "./structured-output-utils";
export type { VariantBArtifact };
