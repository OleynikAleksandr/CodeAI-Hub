import type { ClaudeSettingsSnapshot } from "./provider-settings-snapshot";

export type CodexReasoningEffort = "low" | "medium" | "high" | "xhigh";
export type CodexSandboxMode =
  | "read-only"
  | "workspace-write"
  | "danger-full-access";
export type CodexApprovalMode =
  | "never"
  | "on-request"
  | "on-failure"
  | "untrusted";

export const DEFAULT_CODEX_MODEL_ID = "gpt-5.3-codex";
export const DEFAULT_CODEX_REASONING_EFFORT: CodexReasoningEffort = "medium";

const CODEX_MODEL_IDS = new Set(["gpt-5.3-codex", "gpt-5.4"]);
const CODEX_REASONING_EFFORTS = new Set<CodexReasoningEffort>([
  "low",
  "medium",
  "high",
  "xhigh",
]);
const CLAUDE_MODEL_ALIAS_SET = new Set(["default", "sonnet", "opus", "haiku"]);
const DEFAULT_CLAUDE_MODEL_ALIAS = "sonnet";
const DEFAULT_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 30;
const MIN_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
const MAX_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeOptionalString = (
  value: string | undefined
): string | undefined => (value?.trim() ? value.trim() : undefined);

export const resolveClaudeDefaultModel = (
  value: string | undefined
): string => {
  if (value === "default") {
    // "default" is legacy. Persist and operate on explicit aliases.
    return "sonnet";
  }

  return value && CLAUDE_MODEL_ALIAS_SET.has(value)
    ? value
    : DEFAULT_CLAUDE_MODEL_ALIAS;
};

export const normalizeCodexReasoningEffort = (
  value: unknown
): CodexReasoningEffort | undefined =>
  typeof value === "string" &&
  CODEX_REASONING_EFFORTS.has(value as CodexReasoningEffort)
    ? (value as CodexReasoningEffort)
    : undefined;

export const normalizeCodexModelFromSettings = (
  value: unknown
): string | undefined =>
  typeof value === "string" && CODEX_MODEL_IDS.has(value) ? value : undefined;

export const resolvePreferredCodexDefaultModel = (options: {
  readonly settingsDefaultModel?: string;
  readonly envDefaultModel?: string;
  readonly fallbackModel: string;
}): string =>
  options.settingsDefaultModel ??
  normalizeOptionalString(options.envDefaultModel) ??
  options.fallbackModel;

export const resolveCodexReasoningFromSettings = (
  value: unknown
): Record<string, CodexReasoningEffort> => {
  if (!isRecord(value)) {
    return {};
  }

  const normalized: Record<string, CodexReasoningEffort> = {};
  for (const [modelId, reasoning] of Object.entries(value)) {
    const normalizedReasoning = normalizeCodexReasoningEffort(reasoning);
    if (normalizedReasoning) {
      normalized[modelId] = normalizedReasoning;
    }
  }

  return normalized;
};

export const resolveGeminiThinkingFromSettings = (
  value: unknown
): Record<string, string> => {
  if (!isRecord(value)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [modelId, level] of Object.entries(value)) {
    if (typeof level === "string") {
      normalized[modelId] = level;
    }
  }

  return normalized;
};

export const toSandboxMode = (
  value: string | undefined
): CodexSandboxMode | undefined => {
  if (!value) {
    return;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "read-only" ||
    normalized === "workspace-write" ||
    normalized === "danger-full-access"
  ) {
    return normalized;
  }

  return;
};

export const toApprovalMode = (
  value: string | undefined
): CodexApprovalMode | undefined => {
  if (!value) {
    return;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "never" ||
    normalized === "on-request" ||
    normalized === "on-failure" ||
    normalized === "untrusted"
  ) {
    return normalized;
  }

  return;
};

export const resolveClaudeContinuityRemainingPercentThreshold = (
  snapshot: ClaudeSettingsSnapshot | null
): number => {
  const value =
    snapshot?.providers?.claude?.sessionContinuity?.remainingPercentThreshold;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD;
  }

  return clampNumber(
    numeric,
    MIN_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    MAX_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD
  );
};
