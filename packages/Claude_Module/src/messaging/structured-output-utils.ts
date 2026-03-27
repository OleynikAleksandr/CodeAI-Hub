import type { ClaudeStreamMessage } from "../types";

export interface VariantBArtifact {
  readonly markdown: string;
  readonly slot: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

export const extractVariantBArtifacts = (
  message: ClaudeStreamMessage
): VariantBArtifact[] | null => {
  const payload = readStructuredOutputPayload(message);
  if (!(payload && Array.isArray(payload.artifacts))) {
    return null;
  }

  const artifacts: VariantBArtifact[] = [];
  for (const entry of payload.artifacts) {
    if (!isRecord(entry)) {
      return null;
    }
    const slot = entry.slot;
    const markdown = entry.markdown;
    if (
      typeof slot !== "string" ||
      typeof markdown !== "string" ||
      !slot.trim() ||
      !markdown.trim()
    ) {
      return null;
    }
    artifacts.push({ slot, markdown });
  }

  return artifacts;
};
