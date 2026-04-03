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
  readonly thinkingDisplaySyncEnabled?: unknown;
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
export interface RawLocalizationCategorySettings {
  readonly artifactsForTheUser?: unknown;
  readonly interactiveTemplates?: unknown;
  readonly messagesForTheUser?: unknown;
  readonly systemFeedback?: unknown;
  readonly uiHelperText?: unknown;
  readonly uiInterface?: unknown;
  readonly uiLabels?: unknown;
  readonly userGuidance?: unknown;
  readonly workflowTerms?: unknown;
}
export interface RawGeneralLocalizationSettings {
  readonly categories?: RawLocalizationCategorySettings;
  readonly defaultLanguage?: unknown;
  readonly engineId?: unknown;
  readonly glossaryEnabled?: unknown;
  readonly workflowTermsPolicy?: unknown;
}
export interface RawGeneralSettings {
  readonly coreControls?: RawCoreControlsSettings;
  readonly localization?: RawGeneralLocalizationSettings;
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
