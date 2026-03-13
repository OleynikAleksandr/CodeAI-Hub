export type RawThinkingSettings = {
  readonly enabled?: unknown;
  readonly maxTokens?: unknown;
};
export type RawAutoUpdateSettings = {
  readonly enabled?: unknown;
};
export type RawClaudeSessionContinuitySettings = {
  readonly remainingPercentThreshold?: unknown;
};
export type RawCodexSessionContinuitySettings = {
  readonly remainingPercentThreshold?: unknown;
};
export type RawGeminiSessionContinuitySettings = {
  readonly contextWindowTokenLimit?: unknown;
  readonly remainingPercentThreshold?: unknown;
};
export type RawClaudeSettings = {
  readonly thinking?: RawThinkingSettings;
  readonly autoUpdate?: RawAutoUpdateSettings;
  readonly defaultModel?: unknown;
  readonly sessionContinuity?: RawClaudeSessionContinuitySettings;
};
export type RawCodexSettings = {
  readonly autoUpdate?: RawAutoUpdateSettings;
  readonly defaultModel?: unknown;
  readonly reasoningByModel?: Record<string, unknown>;
  readonly sessionContinuity?: RawCodexSessionContinuitySettings;
};
export type RawGeminiSettings = {
  readonly autoUpdate?: RawAutoUpdateSettings;
  readonly defaultModel?: unknown;
  readonly thinkingLevelByModel?: Record<string, unknown>;
  readonly sessionContinuity?: RawGeminiSessionContinuitySettings;
};
export type RawCoreControlsSettings = {
  readonly allowRestart?: unknown;
};
export type RawGeneralStrictOutputSettings = {
  readonly schemaText?: unknown;
  readonly instructionText?: unknown;
};
export type RawGeneralResponsePolicySettings = {
  readonly mode?: unknown;
  readonly strictOutput?: RawGeneralStrictOutputSettings;
};
export type RawGeneralSettings = {
  readonly coreControls?: RawCoreControlsSettings;
  readonly responsePolicy?: RawGeneralResponsePolicySettings;
};
export type RawSettingsSnapshot = {
  readonly general?: RawGeneralSettings;
  readonly providers?: {
    readonly claude?: RawClaudeSettings;
    readonly codex?: RawCodexSettings;
    readonly gemini?: RawGeminiSettings;
  };
};
