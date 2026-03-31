export interface RawThinkingSettings {
  readonly enabled?: unknown;
  readonly maxTokens?: unknown;
}
export interface RawAutoUpdateSettings {
  readonly enabled?: unknown;
}
export interface RawClaudeSessionContinuitySettings {
  readonly remainingPercentThreshold?: unknown;
}
export interface RawCodexSessionContinuitySettings {
  readonly remainingPercentThreshold?: unknown;
}
export interface RawGeminiSessionContinuitySettings {
  readonly contextWindowTokenLimit?: unknown;
  readonly remainingPercentThreshold?: unknown;
}
export interface RawClaudeSettings {
  readonly autoUpdate?: RawAutoUpdateSettings;
  readonly defaultModel?: unknown;
  readonly sessionContinuity?: RawClaudeSessionContinuitySettings;
  readonly thinking?: RawThinkingSettings;
}
export interface RawCodexSettings {
  readonly autoUpdate?: RawAutoUpdateSettings;
  readonly defaultModel?: unknown;
  readonly reasoningByModel?: Record<string, unknown>;
  readonly reasoningSummaryEnabled?: unknown;
  readonly sessionContinuity?: RawCodexSessionContinuitySettings;
  readonly thinkingDisplaySyncEnabled?: unknown;
}
export interface RawGeminiSettings {
  readonly autoUpdate?: RawAutoUpdateSettings;
  readonly defaultModel?: unknown;
  readonly sessionContinuity?: RawGeminiSessionContinuitySettings;
  readonly thinkingDisplaySyncEnabled?: unknown;
  readonly thinkingLevelByModel?: Record<string, unknown>;
}
export interface RawCoreControlsSettings {
  readonly allowRestart?: unknown;
}
export interface RawGeneralStrictOutputSettings {
  readonly instructionText?: unknown;
  readonly schemaText?: unknown;
}
export interface RawGeneralResponsePolicySettings {
  readonly mode?: unknown;
  readonly strictOutput?: RawGeneralStrictOutputSettings;
}
export interface RawGeneralSettings {
  readonly coreControls?: RawCoreControlsSettings;
  readonly responsePolicy?: RawGeneralResponsePolicySettings;
}
export interface RawSettingsSnapshot {
  readonly general?: RawGeneralSettings;
  readonly providers?: {
    readonly claude?: RawClaudeSettings;
    readonly codex?: RawCodexSettings;
    readonly gemini?: RawGeminiSettings;
  };
}
