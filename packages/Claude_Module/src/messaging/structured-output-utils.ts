import type { ClaudeStreamMessage } from "../types";

export type VariantBArtifact = {
  readonly slot: string;
  readonly markdown: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const extractVariantBArtifacts = (
  message: ClaudeStreamMessage
): VariantBArtifact[] | null => {
  const payload =
    (message.structured_output as unknown) ??
    (message.structuredOutput as unknown);
  if (!(isRecord(payload) && Array.isArray(payload.artifacts))) {
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
