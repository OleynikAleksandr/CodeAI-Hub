import type { RawGeneralResponsePolicySettings } from "../settings-state-raw";
import {
  type GeneralResponseMode,
  RESPONSE_MODE_OPTIONS,
} from "./response-mode-copy";

export type { GeneralResponseMode } from "./response-mode-copy";

export interface GeneralStrictOutputSettings {
  readonly instructionText: string;
  readonly schemaText: string;
}

export interface GeneralResponsePolicySettings {
  readonly mode: GeneralResponseMode;
  readonly strictOutput: GeneralStrictOutputSettings;
}

const DEFAULT_STRICT_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: {
      type: "string",
      description: "Final answer for the user. Markdown allowed.",
    },
  },
  required: ["answer"],
} as const;

const DEFAULT_STRICT_OUTPUT_SCHEMA_TEXT = `${JSON.stringify(
  DEFAULT_STRICT_OUTPUT_SCHEMA,
  null,
  2
)}\n`;

const DEFAULT_STRICT_OUTPUT_INSTRUCTION_TEXT = [
  "You must respond with a JSON object that matches the provided schema.",
  "Populate the field:",
  "- answer: the user-facing answer.",
  "Return only JSON, no extra text.",
  "",
  "User request:",
].join("\n");

const DEFAULT_GENERAL_RESPONSE_POLICY: GeneralResponsePolicySettings = {
  mode: "hybrid",
  strictOutput: {
    schemaText: DEFAULT_STRICT_OUTPUT_SCHEMA_TEXT,
    instructionText: DEFAULT_STRICT_OUTPUT_INSTRUCTION_TEXT,
  },
};

const RESPONSE_MODE_IDS = new Set(
  RESPONSE_MODE_OPTIONS.map((option) => option.id)
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeText = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const normalizeSchemaText = (value: unknown): string => {
  const next = normalizeText(
    value,
    DEFAULT_GENERAL_RESPONSE_POLICY.strictOutput.schemaText
  );
  try {
    const parsed = JSON.parse(next) as unknown;
    if (!isRecord(parsed)) {
      return DEFAULT_GENERAL_RESPONSE_POLICY.strictOutput.schemaText;
    }
    return `${JSON.stringify(parsed, null, 2)}\n`;
  } catch {
    return DEFAULT_GENERAL_RESPONSE_POLICY.strictOutput.schemaText;
  }
};

export const mapGeneralResponsePolicy = (
  value: RawGeneralResponsePolicySettings | undefined
): GeneralResponsePolicySettings => ({
  mode:
    typeof value?.mode === "string" &&
    RESPONSE_MODE_IDS.has(value.mode as GeneralResponseMode)
      ? (value.mode as GeneralResponseMode)
      : DEFAULT_GENERAL_RESPONSE_POLICY.mode,
  strictOutput: {
    schemaText: normalizeSchemaText(value?.strictOutput?.schemaText),
    instructionText: normalizeText(
      value?.strictOutput?.instructionText,
      DEFAULT_GENERAL_RESPONSE_POLICY.strictOutput.instructionText
    ),
  },
});

export const areGeneralResponsePolicyEqual = (
  left: GeneralResponsePolicySettings,
  right: GeneralResponsePolicySettings
): boolean =>
  left.mode === right.mode &&
  left.strictOutput.schemaText === right.strictOutput.schemaText &&
  left.strictOutput.instructionText === right.strictOutput.instructionText;
