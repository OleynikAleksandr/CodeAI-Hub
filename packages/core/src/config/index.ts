import { homedir } from "node:os";
import path from "node:path";
import {
  normalizeWorkspaceRuntimeSlug,
  resolveWorkspaceRuntimeCapsule,
} from "../workflow/runtime/workspace-runtime-capsule";
import {
  type CodexApprovalMode,
  type CodexReasoningEffort,
  type CodexSandboxMode,
  DEFAULT_CODEX_MODEL_ID,
  DEFAULT_CODEX_REASONING_EFFORT,
  normalizeCodexReasoningEffort,
  resolveClaudeContinuityRemainingPercentThreshold,
  resolveClaudeDefaultModel,
  toApprovalMode,
  toSandboxMode,
} from "./provider-defaults-resolver";

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
  readonly geminiSettingsPath?: string;
  readonly geminiThinkingLevelByModel?: Record<string, string>;
  readonly geminiWorkspacePath?: string;
  readonly globalSettingsPath?: string;
  readonly host: string;
  readonly idleTtlMinutes: number | null;
  readonly kimiDefaultModel?: string;
  readonly managedMode: string | null;
  readonly port: number;
  readonly shutdownGracePeriodMs: number;
  readonly templatesDir: string;
}

const DEFAULT_PORT = 8080;
const DEFAULT_GRACE_MS = 3_600_000;
const MILLISECONDS_IN_MINUTE = 60_000;
const DEFAULT_TEMPLATES_DIR = path.join(homedir(), ".codeai-hub", "templates");
const LEGACY_GLOBAL_SETTINGS_FILE = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  "settings.json"
);
const LEGACY_GLOBAL_SETTINGS_FILE_TILDE =
  "~/.codeai-hub/settings/settings.json";
const DEFAULT_CLAUDE_CONTINUITY_PREEMPT_THRESHOLD = 50;
const MIN_CLAUDE_CONTINUITY_PREEMPT_THRESHOLD = 0;
const MAX_CLAUDE_CONTINUITY_PREEMPT_THRESHOLD = 100;
const BOOLEAN_TRUTHY = new Set(["1", "true", "yes", "on"]);
const DEFAULT_PROJECT_SLUG = "default-workspace";

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

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }
  return BOOLEAN_TRUTHY.has(value.trim().toLowerCase());
};

const resolveProjectSlug = (options: {
  readonly explicitSlug?: string;
  readonly workspacePath?: string;
}): string => {
  const explicitSlug = options.explicitSlug?.trim();
  if (explicitSlug) {
    return normalizeWorkspaceRuntimeSlug(explicitSlug);
  }
  const workspacePath = options.workspacePath?.trim();
  if (workspacePath) {
    return normalizeWorkspaceRuntimeSlug(path.basename(workspacePath));
  }
  return DEFAULT_PROJECT_SLUG;
};

const isLegacyGlobalSettingsPath = (value: string): boolean => {
  const trimmedValue = value.trim();
  return (
    trimmedValue === LEGACY_GLOBAL_SETTINGS_FILE_TILDE ||
    path.normalize(trimmedValue) === LEGACY_GLOBAL_SETTINGS_FILE
  );
};

const resolveRuntimeSettingsPath = (
  configuredPath: string | undefined,
  fallbackPath: string
): string => {
  const trimmedPath = configuredPath?.trim();
  if (!trimmedPath || isLegacyGlobalSettingsPath(trimmedPath)) {
    return fallbackPath;
  }
  return trimmedPath;
};

export const resolveGlobalSettingsPath = (config?: {
  readonly claudeSettingsPath?: string;
  readonly globalSettingsPath?: string;
}): string =>
  config?.globalSettingsPath?.trim() ||
  process.env.CODEAI_GLOBAL_SETTINGS_PATH?.trim() ||
  config?.claudeSettingsPath?.trim() ||
  LEGACY_GLOBAL_SETTINGS_FILE;

const resolveGlobalAppRootPath = (config?: {
  readonly claudeSettingsPath?: string;
  readonly globalSettingsPath?: string;
}): string => path.dirname(path.dirname(resolveGlobalSettingsPath(config)));

export const resolveGlobalLocalizationRootPath = (config?: {
  readonly claudeSettingsPath?: string;
  readonly globalSettingsPath?: string;
}): string => path.join(resolveGlobalAppRootPath(config), "localization");

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
  const slug = resolveProjectSlug({
    explicitSlug: process.env.CLAUDE_PROJECT_SLUG,
    workspacePath,
  });
  const defaultWorkspaceSettingsPath = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: workspacePath ?? process.cwd(),
    workspaceSlug: slug,
  }).settingsFile.absolutePath;
  const codexWorkspacePath = process.env.CODEX_WORKSPACE_PATH ?? workspacePath;
  const claudeSettingsPath = resolveRuntimeSettingsPath(
    process.env.CLAUDE_SETTINGS_PATH,
    defaultWorkspaceSettingsPath
  );
  const globalSettingsPath = resolveGlobalSettingsPath();
  const claudeDefaultModel = resolveClaudeDefaultModel(
    process.env.CLAUDE_DEFAULT_MODEL
  );
  const codexSandboxMode = toSandboxMode(process.env.CODEX_SANDBOX_MODE);
  const codexApprovalMode = toApprovalMode(process.env.CODEX_APPROVAL_MODE);
  const codexSkipGitRepoCheck = toBoolean(
    process.env.CODEX_SKIP_GIT_REPO_CHECK,
    false
  );
  const codexDefaultModel =
    process.env.CODEX_DEFAULT_MODEL?.trim() || DEFAULT_CODEX_MODEL_ID;
  const codexDefaultReasoningEffort =
    normalizeCodexReasoningEffort(process.env.CODEX_DEFAULT_REASONING_EFFORT) ??
    DEFAULT_CODEX_REASONING_EFFORT;
  const geminiDefaultModel = process.env.GEMINI_DEFAULT_MODEL ?? undefined;
  const kimiDefaultModel = process.env.KIMI_DEFAULT_MODEL ?? undefined;
  const claudeContinuityRemainingPercentThreshold =
    resolveClaudeContinuityRemainingPercentThreshold(null);
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
    geminiDefaultModel,
    globalSettingsPath,
    kimiDefaultModel,
    claudeContinuityRemainingPercentThreshold,
    continuityPreemptRemainingPercentThreshold,
  };
};
