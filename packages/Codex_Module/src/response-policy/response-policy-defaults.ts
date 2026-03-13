import type { CodexResponsePolicy } from "./response-policy-types";

export const DEFAULT_STRICT_OUTPUT_SCHEMA_OBJECT = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: {
      type: "string",
      description: "Final answer for the user. Markdown allowed.",
    },
  },
  required: ["answer"],
} as const satisfies Record<string, unknown>;

export const DEFAULT_STRICT_OUTPUT_SCHEMA_TEXT = `${JSON.stringify(
  DEFAULT_STRICT_OUTPUT_SCHEMA_OBJECT,
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

export const DEFAULT_CODEX_RESPONSE_POLICY: CodexResponsePolicy = {
  mode: "hybrid",
  strictOutput: {
    schemaText: DEFAULT_STRICT_OUTPUT_SCHEMA_TEXT,
    instructionText: DEFAULT_STRICT_OUTPUT_INSTRUCTION_TEXT,
    schemaObject: DEFAULT_STRICT_OUTPUT_SCHEMA_OBJECT,
  },
};
