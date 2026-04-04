import {
  CLAUDE_THINKING_EFFORT_SET,
  type ClaudeThinkingEffort,
  DEFAULT_CLAUDE_THINKING_EFFORT,
} from "../../../../../types/claude-model-registry";
import type { RawThinkingSettings } from "./settings-state-raw";

export interface ClaudeThinkingSettingsState {
  readonly effort: ClaudeThinkingEffort;
  readonly enabled: boolean;
}

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

const mapClaudeThinkingEffort = (value: unknown): ClaudeThinkingEffort =>
  typeof value === "string" &&
  CLAUDE_THINKING_EFFORT_SET.has(value as ClaudeThinkingEffort)
    ? (value as ClaudeThinkingEffort)
    : resolveLegacyThinkingEffort(value);

export const mapClaudeThinkingSettings = (
  value: RawThinkingSettings | undefined
): ClaudeThinkingSettingsState => ({
  effort: mapClaudeThinkingEffort(value?.effort ?? value?.maxTokens),
  enabled: Boolean(value?.enabled),
});

export const areClaudeThinkingSettingsEqual = (
  left: ClaudeThinkingSettingsState,
  right: ClaudeThinkingSettingsState
): boolean => left.enabled === right.enabled && left.effort === right.effort;
