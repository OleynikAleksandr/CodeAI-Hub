import { DEFAULT_CODEX_RESPONSE_POLICY } from "./response-policy-defaults";
import type {
  CodexResponseMode,
  CodexResponsePolicy,
} from "./response-policy-types";

const RESPONSE_MODES = new Set<CodexResponseMode>([
  "strict",
  "hybrid",
  "debug_raw",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeText = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const normalizeSchema = (
  value: unknown
): Pick<CodexResponsePolicy["strictOutput"], "schemaText" | "schemaObject"> => {
  const nextText = normalizeText(
    value,
    DEFAULT_CODEX_RESPONSE_POLICY.strictOutput.schemaText
  );
  try {
    const parsed = JSON.parse(nextText) as unknown;
    if (!isRecord(parsed)) {
      return DEFAULT_CODEX_RESPONSE_POLICY.strictOutput;
    }
    return {
      schemaText: `${JSON.stringify(parsed, null, 2)}\n`,
      schemaObject: parsed,
    };
  } catch {
    return DEFAULT_CODEX_RESPONSE_POLICY.strictOutput;
  }
};

export class CodexResponsePolicyFacade {
  resolve(value: unknown): CodexResponsePolicy {
    if (!isRecord(value)) {
      return DEFAULT_CODEX_RESPONSE_POLICY;
    }

    const strictOutput = isRecord(value.strictOutput) ? value.strictOutput : {};
    const normalizedSchema = normalizeSchema(strictOutput.schemaText);
    return {
      mode:
        typeof value.mode === "string" &&
        RESPONSE_MODES.has(value.mode as CodexResponseMode)
          ? (value.mode as CodexResponseMode)
          : DEFAULT_CODEX_RESPONSE_POLICY.mode,
      strictOutput: {
        ...normalizedSchema,
        instructionText: normalizeText(
          strictOutput.instructionText,
          DEFAULT_CODEX_RESPONSE_POLICY.strictOutput.instructionText
        ),
      },
    };
  }
}
