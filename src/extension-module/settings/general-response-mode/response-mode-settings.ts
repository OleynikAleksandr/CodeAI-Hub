export type GeneralResponseMode = "strict" | "hybrid" | "debug_raw";

export type GeneralStrictOutputSettings = {
  readonly schemaText: string;
  readonly instructionText: string;
};

export type GeneralResponsePolicySettings = {
  readonly mode: GeneralResponseMode;
  readonly strictOutput: GeneralStrictOutputSettings;
};

export const DEFAULT_STRICT_OUTPUT_SCHEMA = {
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

export const DEFAULT_STRICT_OUTPUT_SCHEMA_TEXT = `${JSON.stringify(
  DEFAULT_STRICT_OUTPUT_SCHEMA,
  null,
  2
)}\n`;

export const DEFAULT_STRICT_OUTPUT_INSTRUCTION_TEXT = [
  "You must respond with a JSON object that matches the provided schema.",
  "Populate the field:",
  "- answer: the user-facing answer.",
  "Return only JSON, no extra text.",
  "",
  "User request:",
].join("\n");

export const DEFAULT_GENERAL_RESPONSE_POLICY: GeneralResponsePolicySettings = {
  mode: "hybrid",
  strictOutput: {
    schemaText: DEFAULT_STRICT_OUTPUT_SCHEMA_TEXT,
    instructionText: DEFAULT_STRICT_OUTPUT_INSTRUCTION_TEXT,
  },
};
