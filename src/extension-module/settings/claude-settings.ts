import {
  CLAUDE_MODEL_ALIAS_SET,
  type ClaudeModelAliasId,
  DEFAULT_CLAUDE_MODEL_ALIAS,
} from "../../types/claude-model-registry";
import {
  type AutoUpdateSettings,
  DEFAULT_AUTO_UPDATE_SETTINGS,
  normalizeAutoUpdateSettings,
} from "./auto-update-settings";
import { isRecord } from "./settings-utils";

export interface ClaudeThinkingSettings {
  readonly enabled: boolean;
  readonly maxTokens: number;
}

export interface ClaudeSessionContinuitySettings {
  readonly remainingPercentThreshold: number;
}

export interface ClaudeSettings {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: ClaudeModelAliasId;
  readonly sessionContinuity: ClaudeSessionContinuitySettings;
  readonly thinking: ClaudeThinkingSettings;
}

export const MIN_THINKING_TOKENS = 2000;
export const MAX_THINKING_TOKENS = 32_000;
export const MIN_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
export const MAX_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;

export const DEFAULT_CLAUDE_THINKING_SETTINGS: ClaudeThinkingSettings = {
  enabled: false,
  maxTokens: 4000,
};

export const DEFAULT_CLAUDE_SESSION_CONTINUITY_SETTINGS: ClaudeSessionContinuitySettings =
  {
    remainingPercentThreshold: 30,
  };

export const DEFAULT_CLAUDE_SETTINGS: ClaudeSettings = {
  thinking: DEFAULT_CLAUDE_THINKING_SETTINGS,
  autoUpdate: DEFAULT_AUTO_UPDATE_SETTINGS,
  defaultModel: DEFAULT_CLAUDE_MODEL_ALIAS,
  sessionContinuity: DEFAULT_CLAUDE_SESSION_CONTINUITY_SETTINGS,
};

const clampThinkingTokens = (value: number): number =>
  Math.min(MAX_THINKING_TOKENS, Math.max(MIN_THINKING_TOKENS, value));

const clampContinuityRemainingPercentThreshold = (value: number): number =>
  Math.min(
    MAX_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    Math.max(MIN_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD, value)
  );

export const normalizeClaudeThinkingSettings = (
  value: unknown
): ClaudeThinkingSettings => {
  if (!isRecord(value)) {
    return DEFAULT_CLAUDE_THINKING_SETTINGS;
  }

  const enabled =
    typeof value.enabled === "boolean"
      ? value.enabled
      : DEFAULT_CLAUDE_THINKING_SETTINGS.enabled;
  const numericMaxTokens = Number(value.maxTokens);
  const maxTokens = Number.isFinite(numericMaxTokens)
    ? clampThinkingTokens(numericMaxTokens)
    : DEFAULT_CLAUDE_THINKING_SETTINGS.maxTokens;

  return {
    enabled,
    maxTokens,
  };
};

export const normalizeClaudeSessionContinuitySettings = (
  value: unknown
): ClaudeSessionContinuitySettings => {
  if (!isRecord(value)) {
    return DEFAULT_CLAUDE_SESSION_CONTINUITY_SETTINGS;
  }

  const numericValue = Number(value.remainingPercentThreshold);
  const remainingPercentThreshold = Number.isFinite(numericValue)
    ? clampContinuityRemainingPercentThreshold(numericValue)
    : DEFAULT_CLAUDE_SESSION_CONTINUITY_SETTINGS.remainingPercentThreshold;

  return { remainingPercentThreshold };
};

const resolveClaudeDefaultModel = (value: unknown): ClaudeModelAliasId => {
  if (typeof value !== "string") {
    return DEFAULT_CLAUDE_MODEL_ALIAS;
  }

  const alias = value as ClaudeModelAliasId;
  return CLAUDE_MODEL_ALIAS_SET.has(alias) ? alias : DEFAULT_CLAUDE_MODEL_ALIAS;
};

export const normalizeClaudeSettings = (value: unknown): ClaudeSettings => {
  if (!isRecord(value)) {
    return DEFAULT_CLAUDE_SETTINGS;
  }

  return {
    thinking: normalizeClaudeThinkingSettings(value.thinking),
    autoUpdate: normalizeAutoUpdateSettings(value.autoUpdate),
    defaultModel: resolveClaudeDefaultModel(value.defaultModel),
    sessionContinuity: normalizeClaudeSessionContinuitySettings(
      value.sessionContinuity
    ),
  };
};
