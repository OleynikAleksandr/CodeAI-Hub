import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  type CodexApprovalMode,
  type CodexReasoningEffort,
  type CodexSandboxMode,
  DEFAULT_CODEX_MODEL_ID,
  DEFAULT_CODEX_REASONING_EFFORT,
  resolveClaudeContinuityRemainingPercentThreshold,
  resolveClaudeDefaultModel,
  toApprovalMode,
  toSandboxMode,
} from "./provider-defaults-resolver";
import { loadClaudeSettingsSnapshot } from "./provider-settings-snapshot";
import { resolveProviderTurnConfig } from "./provider-turn-config-resolver";

export { resolvePreferredCodexDefaultModel } from "./provider-defaults-resolver";

export interface CoreConfig {
  readonly claudeContinuityRemainingPercentThreshold: number;
  readonly claudeDefaultModel: string;
  readonly claudeProjectSlug: string;
  readonly claudeSettingsPath: string;
  readonly claudeWorkspacePath?: string;
  readonly codexApprovalMode?: CodexApprovalMode;
  readonly codexDefaultModel?: string;
  readonly codexDefaultReasoningEffort?: CodexReasoningEffort;
  readonly codexSandboxMode?: CodexSandboxMode;
  readonly codexSkipGitRepoCheck: boolean;
  readonly codexWorkspacePath?: string;
  readonly continuityPreemptRemainingPercentThreshold: number;
  readonly geminiCredentialsDirectory?: string;
  readonly geminiDefaultModel?: string;
  readonly geminiSettingsPath: string;
  readonly geminiThinkingLevelByModel: Record<string, string>;
  readonly geminiWorkspacePath?: string;
  readonly host: string;
  readonly idleTtlMinutes: number | null;
  readonly managedMode: string | null;
  readonly port: number;
  readonly shutdownGracePeriodMs: number;
  readonly templatesDir: string;
}

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
const DEFAULT_CLAUDE_CONTINUITY_PREEMPT_THRESHOLD = 50;
const MIN_CLAUDE_CONTINUITY_PREEMPT_THRESHOLD = 0;
const MAX_CLAUDE_CONTINUITY_PREEMPT_THRESHOLD = 100;
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g;
const MULTIPLE_DASHES_REGEX = /-+/g;
const TRAILING_DASH_REGEX = /-$/;
const BOOLEAN_TRUTHY = new Set(["1", "true", "yes", "on"]);

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
  const providerTurnConfig = resolveProviderTurnConfig({
    settingsPath: CODEX_SETTINGS_PATH,
    env: process.env,
    fallbackCodexModel: DEFAULT_CODEX_MODEL_ID,
    fallbackCodexReasoningEffort: DEFAULT_CODEX_REASONING_EFFORT,
    fallbackGeminiModel: process.env.GEMINI_DEFAULT_MODEL ?? undefined,
  });
  const codexDefaultModel = providerTurnConfig.codex.defaultModel;
  const codexDefaultReasoningEffort =
    providerTurnConfig.codex.defaultReasoningEffort;
  const geminiWorkspacePath =
    process.env.GEMINI_WORKSPACE_PATH ?? workspacePath;
  const geminiDefaultModel = providerTurnConfig.gemini.defaultModel;
  const geminiSettingsPath = claudeSettingsPath;
  const geminiCredentialsDirectory =
    process.env.GEMINI_CREDENTIALS_DIRECTORY ??
    process.env.GEMINI_CREDENTIALS_DIR ??
    undefined;
  const geminiThinkingLevelByModel =
    providerTurnConfig.gemini.thinkingLevelByModel;
  const claudeSettings = loadClaudeSettingsSnapshot(claudeSettingsPath);
  const claudeContinuityRemainingPercentThreshold =
    resolveClaudeContinuityRemainingPercentThreshold(claudeSettings);
  const continuityPreemptRemainingPercentThreshold = Math.min(
    MAX_CLAUDE_CONTINUITY_PREEMPT_THRESHOLD,
    Math.max(
      MIN_CLAUDE_CONTINUITY_PREEMPT_THRESHOLD,
      toNumber(
        process.env.CONTINUITY_PREEMPT_REMAINING_PERCENT_THRESHOLD,
        DEFAULT_CLAUDE_CONTINUITY_PREEMPT_THRESHOLD
      )
    )
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
