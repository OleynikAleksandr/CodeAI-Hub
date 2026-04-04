import {
  CLAUDE_MODEL_ALIAS_SET,
  CLAUDE_THINKING_EFFORT_SET,
  type ClaudeModelAliasId,
  type ClaudeThinkingEffort,
  DEFAULT_CLAUDE_MODEL_ALIAS,
  DEFAULT_CLAUDE_THINKING_EFFORT,
} from "../../types/claude-model-registry";
import {
  type AutoUpdateSettings,
  DEFAULT_AUTO_UPDATE_SETTINGS,
  normalizeAutoUpdateSettings,
} from "./auto-update-settings";
import { isRecord } from "./settings-utils";

export interface ClaudeThinkingSettings {
  readonly effort: ClaudeThinkingEffort;
  readonly enabled: boolean;
}

export interface ClaudeSessionContinuitySettings {
  readonly remainingPercentThreshold: number;
}

export interface ClaudeSettings {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: ClaudeModelAliasId;
  readonly sessionContinuity: ClaudeSessionContinuitySettings;
  readonly thinking: ClaudeThinkingSettings;
  readonly thinkingDisplaySyncEnabled: boolean;
}

const MIN_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
const MAX_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;

const DEFAULT_CLAUDE_THINKING_SETTINGS: ClaudeThinkingSettings = {
  enabled: false,
  effort: DEFAULT_CLAUDE_THINKING_EFFORT,
};

const DEFAULT_CLAUDE_SESSION_CONTINUITY_SETTINGS: ClaudeSessionContinuitySettings =
  {
    remainingPercentThreshold: 30,
  };

export const DEFAULT_CLAUDE_SETTINGS: ClaudeSettings = {
  thinking: DEFAULT_CLAUDE_THINKING_SETTINGS,
  autoUpdate: DEFAULT_AUTO_UPDATE_SETTINGS,
  defaultModel: DEFAULT_CLAUDE_MODEL_ALIAS,
  sessionContinuity: DEFAULT_CLAUDE_SESSION_CONTINUITY_SETTINGS,
  thinkingDisplaySyncEnabled: true,
};

const clampContinuityRemainingPercentThreshold = (value: number): number =>
  Math.min(
    MAX_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    Math.max(MIN_CLAUDE_CONTINUITY_REMAINING_PERCENT_THRESHOLD, value)
  );

const LEGACY_THINKING_TOKEN_ANCHORS: readonly {
  readonly effort: ClaudeThinkingEffort;
  readonly maxTokens: number;
}[] = [
  { effort: "low", maxTokens: 2000 },
  { effort: "medium", maxTokens: 4000 },
  { effort: "high", maxTokens: 10_000 },
  { effort: "max", maxTokens: 32_000 },
];

const resolveLegacyThinkingEffort = (value: unknown): ClaudeThinkingEffort => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return DEFAULT_CLAUDE_THINKING_EFFORT;
  }

  return LEGACY_THINKING_TOKEN_ANCHORS.reduce(
    (closest, candidate) =>
      Math.abs(candidate.maxTokens - numericValue) <
      Math.abs(closest.maxTokens - numericValue)
        ? candidate
        : closest,
    LEGACY_THINKING_TOKEN_ANCHORS[0]
  ).effort;
};

const normalizeClaudeThinkingEffort = (value: unknown): ClaudeThinkingEffort =>
  typeof value === "string" &&
  CLAUDE_THINKING_EFFORT_SET.has(value as ClaudeThinkingEffort)
    ? (value as ClaudeThinkingEffort)
    : resolveLegacyThinkingEffort(value);

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
  const effort = normalizeClaudeThinkingEffort(value.effort ?? value.maxTokens);

  return {
    enabled,
    effort,
  };
};

const normalizeClaudeSessionContinuitySettings = (
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
    thinkingDisplaySyncEnabled:
      typeof value.thinkingDisplaySyncEnabled === "boolean"
        ? value.thinkingDisplaySyncEnabled
        : DEFAULT_CLAUDE_SETTINGS.thinkingDisplaySyncEnabled,
  };
};
