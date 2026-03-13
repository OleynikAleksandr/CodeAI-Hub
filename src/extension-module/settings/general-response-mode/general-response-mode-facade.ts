import { isRecord } from "../settings-utils";
import {
  normalizeStrictOutputInstructionText,
  normalizeStrictOutputSchemaText,
} from "./response-mode-schema";
import {
  DEFAULT_GENERAL_RESPONSE_POLICY,
  type GeneralResponseMode,
  type GeneralResponsePolicySettings,
} from "./response-mode-settings";

const GENERAL_RESPONSE_MODES = new Set<GeneralResponseMode>([
  "strict",
  "hybrid",
  "debug_raw",
]);

const normalizeResponseMode = (value: unknown): GeneralResponseMode =>
  typeof value === "string" &&
  GENERAL_RESPONSE_MODES.has(value as GeneralResponseMode)
    ? (value as GeneralResponseMode)
    : DEFAULT_GENERAL_RESPONSE_POLICY.mode;

export const createDefaultGeneralResponsePolicy =
  (): GeneralResponsePolicySettings => ({
    ...DEFAULT_GENERAL_RESPONSE_POLICY,
    strictOutput: {
      ...DEFAULT_GENERAL_RESPONSE_POLICY.strictOutput,
    },
  });

export const normalizeGeneralResponsePolicy = (
  value: unknown
): GeneralResponsePolicySettings => {
  if (!isRecord(value)) {
    return createDefaultGeneralResponsePolicy();
  }

  const strictOutput = isRecord(value.strictOutput) ? value.strictOutput : {};
  return {
    mode: normalizeResponseMode(value.mode),
    strictOutput: {
      schemaText: normalizeStrictOutputSchemaText(strictOutput.schemaText),
      instructionText: normalizeStrictOutputInstructionText(
        strictOutput.instructionText
      ),
    },
  };
};
