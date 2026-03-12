import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type CoreConfig = {
  readonly host: string;
  readonly port: number;
  readonly shutdownGracePeriodMs: number;
  readonly idleTtlMinutes: number | null;
  readonly managedMode: string | null;
  readonly templatesDir: string;
  readonly claudeWorkspacePath?: string;
  readonly claudeProjectSlug: string;
  readonly claudeSettingsPath: string;
  readonly codexWorkspacePath?: string;
  readonly codexSandboxMode?:
    | "read-only"
    | "workspace-write"
    | "danger-full-access";
  readonly codexApprovalMode?:
    | "never"
    | "on-request"
    | "on-failure"
    | "untrusted";
  readonly codexSkipGitRepoCheck: boolean;
  readonly codexDefaultModel?: string;
  readonly codexDefaultReasoningEffort?: CodexReasoningEffort;
  readonly geminiWorkspacePath?: string;
  readonly geminiDefaultModel?: string;
  readonly geminiThinkingLevelByModel: Record<string, string>;
  readonly geminiSettingsPath: string;
  readonly geminiCredentialsDirectory?: string;
  readonly claudeDefaultModel: string;
  readonly claudeContinuityRemainingPercentThreshold: number;
  readonly continuityPreemptRemainingPercentThreshold: number;
};

type CodexReasoningEffort = "low" | "medium" | "high" | "xhigh";

const DEFAULT_PORT = 8080;
const DEFAULT_GRACE_MS = 3_600_000;
const MILLISECONDS_IN_MINUTE = 60_000;
const DEFAULT_TEMPLATES_DIR = path.join(homedir(), ".codeai-hub", "templates");
const CLAUDE_SETTINGS_DIR = path.join(homedir(), ".codeai-hub", "settings");
const CLAUDE_SETTINGS_FILE = path.join(CLAUDE_SETTINGS_DIR, "settings.json");
const LEGACY_CLAUDE_SETTINGS_FILE = path.join(
  CLAUDE_SETTINGS_DIR,
  "claude.json"
);
const CODEX_SETTINGS_PATH = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  "settings.json"
);
const DEFAULT_CODEX_MODEL_ID = "gpt-5.3-codex";
const DEFAULT_CODEX_REASONING_EFFORT: CodexReasoningEffort = "medium";
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
const DEFAULT_CONTINUITY_PREEMPT_REMAINING_PERCENT_THRESHOLD = 50;
const MIN_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
const MAX_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;
const MIN_CONTINUITY_PREEMPT_REMAINING_PERCENT_THRESHOLD = 0;
const MAX_CONTINUITY_PREEMPT_REMAINING_PERCENT_THRESHOLD = 100;
const resolveClaudeDefaultModel = (value: string | undefined): string => {
  if (value === "default") {
    // "default" is legacy. Persist and operate on explicit aliases.
    return "sonnet";
  }

  return value && CLAUDE_MODEL_ALIAS_SET.has(value)
    ? value
    : DEFAULT_CLAUDE_MODEL_ALIAS;
};
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g;
const MULTIPLE_DASHES_REGEX = /-+/g;
const TRAILING_DASH_REGEX = /-$/;
const BOOLEAN_TRUTHY = new Set(["1", "true", "yes", "on"]);

type CodexSettingsSnapshot = {
  readonly defaultModel?: unknown;
  readonly reasoningByModel?: unknown;
};

type ClaudeSettingsSnapshot = {
  readonly providers?: {
    readonly claude?: {
      readonly sessionContinuity?: {
        readonly remainingPercentThreshold?: unknown;
      };
    };
  };
};

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
};

const sanitizeSlug = (input: string): string =>
  input
    .replace(NON_ALPHANUMERIC_REGEX, "-")
    .replace(MULTIPLE_DASHES_REGEX, "-")
    .replace(TRAILING_DASH_REGEX, "")
    .trim() || "default-workspace";

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }
  return BOOLEAN_TRUTHY.has(value.trim().toLowerCase());
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeCodexReasoningEffort = (
  value: unknown
): CodexReasoningEffort | undefined =>
  typeof value === "string" &&
  CODEX_REASONING_EFFORTS.has(value as CodexReasoningEffort)
    ? (value as CodexReasoningEffort)
    : undefined;

const normalizeCodexModelFromSettings = (value: unknown): string | undefined =>
  typeof value === "string" && CODEX_MODEL_IDS.has(value) ? value : undefined;

const normalizeOptionalString = (
  value: string | undefined
): string | undefined => (value?.trim() ? value.trim() : undefined);

const loadCodexSettingsSnapshot = (): CodexSettingsSnapshot | null => {
  try {
    const raw = readFileSync(CODEX_SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    const providers = isRecord(parsed.providers) ? parsed.providers : null;
    const codex =
      providers && isRecord(providers.codex) ? providers.codex : null;
    if (!codex) {
      return null;
    }
    return {
      defaultModel: codex.defaultModel,
      reasoningByModel: codex.reasoningByModel,
    };
  } catch {
    return null;
  }
};

const resolveCodexReasoningFromSettings = (
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

type GeminiSettingsSnapshot = {
  readonly defaultModel?: unknown;
  readonly thinkingLevelByModel?: unknown;
};

const loadGeminiSettingsSnapshot = (): GeminiSettingsSnapshot | null => {
  try {
    const raw = readFileSync(CLAUDE_SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    const providers = isRecord(parsed.providers) ? parsed.providers : null;
    const gemini =
      providers && isRecord(providers.gemini) ? providers.gemini : null;
    if (!gemini) {
      return null;
    }
    return {
      defaultModel: gemini.defaultModel,
      thinkingLevelByModel: gemini.thinkingLevelByModel,
    };
  } catch {
    return null;
  }
};

const resolveGeminiThinkingFromSettings = (
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

const toSandboxMode = (
  value: string | undefined
): CoreConfig["codexSandboxMode"] => {
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

const toApprovalMode = (
  value: string | undefined
): CoreConfig["codexApprovalMode"] => {
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

const loadClaudeSettingsSnapshot = (
  settingsPath: string
): ClaudeSettingsSnapshot | null => {
  try {
    const raw = readFileSync(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    return parsed as ClaudeSettingsSnapshot;
  } catch {
    return null;
  }
};

const resolveClaudeContinuityRemainingPercentThreshold = (
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

export const loadConfig = (): CoreConfig => {
  const host = process.env.CORE_HOST ?? "127.0.0.1";
  const port = toNumber(process.env.CORE_PORT, DEFAULT_PORT);
  const shutdownGracePeriodMs = toNumber(
    process.env.CORE_SHUTDOWN_GRACE_MS,
    DEFAULT_GRACE_MS
  );
  const idleTtlMinutes =
    shutdownGracePeriodMs <= 0
      ? null
      : Math.round(shutdownGracePeriodMs / MILLISECONDS_IN_MINUTE);
  const managedMode = process.env.CORE_MANAGED_MODE ?? null;
  const templatesDir = process.env.CORE_TEMPLATES_DIR ?? DEFAULT_TEMPLATES_DIR;
  const workspacePath = process.env.CLAUDE_WORKSPACE_PATH;
  const slug =
    process.env.CLAUDE_PROJECT_SLUG ??
    (workspacePath ? sanitizeSlug(workspacePath) : "default-workspace");
  const codexWorkspacePath = process.env.CODEX_WORKSPACE_PATH ?? workspacePath;
  const claudeSettingsPath =
    process.env.CLAUDE_SETTINGS_PATH ??
    (existsSync(CLAUDE_SETTINGS_FILE)
      ? CLAUDE_SETTINGS_FILE
      : LEGACY_CLAUDE_SETTINGS_FILE);
  const claudeDefaultModel = resolveClaudeDefaultModel(
    process.env.CLAUDE_DEFAULT_MODEL
  );
  const codexSandboxMode = toSandboxMode(process.env.CODEX_SANDBOX_MODE);
  const codexApprovalMode = toApprovalMode(process.env.CODEX_APPROVAL_MODE);
  const codexSkipGitRepoCheck = toBoolean(
    process.env.CODEX_SKIP_GIT_REPO_CHECK,
    false
  );
  const codexSettings = loadCodexSettingsSnapshot();
  const codexSettingsDefaultModel = normalizeCodexModelFromSettings(
    codexSettings?.defaultModel
  );
  const codexSettingsReasoningByModel = resolveCodexReasoningFromSettings(
    codexSettings?.reasoningByModel
  );
  const codexDefaultModel =
    normalizeOptionalString(process.env.CODEX_DEFAULT_MODEL) ??
    codexSettingsDefaultModel ??
    DEFAULT_CODEX_MODEL_ID;
  const codexDefaultReasoningEffort =
    normalizeCodexReasoningEffort(process.env.CODEX_DEFAULT_REASONING_EFFORT) ??
    codexSettingsReasoningByModel[codexDefaultModel] ??
    DEFAULT_CODEX_REASONING_EFFORT;
  const geminiWorkspacePath =
    process.env.GEMINI_WORKSPACE_PATH ?? workspacePath;
  const geminiDefaultModel = process.env.GEMINI_DEFAULT_MODEL ?? undefined;
  const geminiSettingsPath = claudeSettingsPath;
  const geminiCredentialsDirectory =
    process.env.GEMINI_CREDENTIALS_DIRECTORY ??
    process.env.GEMINI_CREDENTIALS_DIR ??
    undefined;

  const geminiSettings = loadGeminiSettingsSnapshot();
  const geminiThinkingLevelByModel = resolveGeminiThinkingFromSettings(
    geminiSettings?.thinkingLevelByModel
  );
  const claudeSettings = loadClaudeSettingsSnapshot(claudeSettingsPath);
  const claudeContinuityRemainingPercentThreshold =
    resolveClaudeContinuityRemainingPercentThreshold(claudeSettings);
  const continuityPreemptRemainingPercentThreshold = clampNumber(
    toNumber(
      process.env.CONTINUITY_PREEMPT_REMAINING_PERCENT_THRESHOLD,
      DEFAULT_CONTINUITY_PREEMPT_REMAINING_PERCENT_THRESHOLD
    ),
    MIN_CONTINUITY_PREEMPT_REMAINING_PERCENT_THRESHOLD,
    MAX_CONTINUITY_PREEMPT_REMAINING_PERCENT_THRESHOLD
  );

  return {
    host,
    port,
    shutdownGracePeriodMs,
    idleTtlMinutes,
    managedMode,
    templatesDir,
    claudeWorkspacePath: workspacePath,
    claudeProjectSlug: slug,
    claudeSettingsPath,
    claudeDefaultModel,
    codexWorkspacePath,
    codexSandboxMode,
    codexApprovalMode,
    codexSkipGitRepoCheck,
    codexDefaultModel,
    codexDefaultReasoningEffort,
    geminiWorkspacePath,
    geminiDefaultModel,
    geminiThinkingLevelByModel,
    geminiSettingsPath,
    geminiCredentialsDirectory,
    claudeContinuityRemainingPercentThreshold,
    continuityPreemptRemainingPercentThreshold,
  };
};
