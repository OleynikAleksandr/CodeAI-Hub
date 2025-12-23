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

export type ClaudeThinkingSettings = {
  readonly enabled: boolean;
  readonly maxTokens: number;
};

export type ClaudeSettings = {
  readonly thinking: ClaudeThinkingSettings;
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: ClaudeModelAliasId;
};

export const MIN_THINKING_TOKENS = 2000;
export const MAX_THINKING_TOKENS = 32_000;

export const DEFAULT_CLAUDE_THINKING_SETTINGS: ClaudeThinkingSettings = {
  enabled: false,
  maxTokens: 4000,
};

export const DEFAULT_CLAUDE_SETTINGS: ClaudeSettings = {
  thinking: DEFAULT_CLAUDE_THINKING_SETTINGS,
  autoUpdate: DEFAULT_AUTO_UPDATE_SETTINGS,
  defaultModel: DEFAULT_CLAUDE_MODEL_ALIAS,
};

const clampThinkingTokens = (value: number): number =>
  Math.min(MAX_THINKING_TOKENS, Math.max(MIN_THINKING_TOKENS, value));

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

const resolveClaudeDefaultModel = (value: unknown): ClaudeModelAliasId =>
  typeof value === "string" && CLAUDE_MODEL_ALIAS_SET.has(value)
    ? (value as ClaudeModelAliasId)
    : DEFAULT_CLAUDE_MODEL_ALIAS;

export const normalizeClaudeSettings = (value: unknown): ClaudeSettings => {
  if (!isRecord(value)) {
    return DEFAULT_CLAUDE_SETTINGS;
  }

  return {
    thinking: normalizeClaudeThinkingSettings(value.thinking),
    autoUpdate: normalizeAutoUpdateSettings(value.autoUpdate),
    defaultModel: resolveClaudeDefaultModel(value.defaultModel),
  };
};
