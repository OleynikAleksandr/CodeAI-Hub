import {
  DEFAULT_GENERAL_RESPONSE_POLICY,
  DEFAULT_STRICT_OUTPUT_SCHEMA_TEXT,
} from "./response-mode-settings";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeMultilineString = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim().length > 0 ? value : fallback;
};

export const normalizeStrictOutputSchemaText = (value: unknown): string => {
  const next = normalizeMultilineString(
    value,
    DEFAULT_GENERAL_RESPONSE_POLICY.strictOutput.schemaText
  );
  try {
    const parsed = JSON.parse(next) as unknown;
    if (!isRecord(parsed)) {
      return DEFAULT_STRICT_OUTPUT_SCHEMA_TEXT;
    }
    return `${JSON.stringify(parsed, null, 2)}\n`;
  } catch {
    return DEFAULT_STRICT_OUTPUT_SCHEMA_TEXT;
  }
};

export const normalizeStrictOutputInstructionText = (value: unknown): string =>
  normalizeMultilineString(
    value,
    DEFAULT_GENERAL_RESPONSE_POLICY.strictOutput.instructionText
  );
