import type { RawLocalModelsSettings } from "./local-models-settings-state";
import type { RawOpenRouterSettings } from "./openrouter-settings-state";
import type { RawTextToSpeechSettings } from "./text-to-speech-settings";

export interface RawThinkingSettings {
  readonly effort?: unknown;
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
export interface RawKimiSettings {
  readonly autoUpdate?: RawAutoUpdateSettings;
  readonly defaultModel?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
  readonly thinkingEnabled?: unknown;
}
export interface RawGlmOpenCodeSettings {
  readonly apiKey?: unknown;
  readonly configPath?: unknown;
  readonly defaultModel?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
}
export interface RawGlmNativeSettings {
  readonly apiKey?: unknown;
  readonly baseUrl?: unknown;
  readonly defaultModel?: unknown;
  readonly reasoningEffort?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
  readonly thinkingEnabled?: unknown;
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
  readonly reasoning?: unknown;
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
  readonly reasoningEngineId?: unknown;
  readonly uiEngineId?: unknown;
  readonly workflowTermsPolicy?: unknown;
}
export interface RawGeneralSettings {
  readonly coreControls?: RawCoreControlsSettings;
  readonly localization?: RawGeneralLocalizationSettings;
  readonly responsePolicy?: RawGeneralResponsePolicySettings;
  readonly textToSpeech?: RawTextToSpeechSettings;
}
export interface RawSettingsSnapshot {
  readonly general?: RawGeneralSettings;
  readonly providers?: {
    readonly claude?: RawClaudeSettings;
    readonly codex?: RawCodexSettings;
    readonly kimi?: RawKimiSettings;
    readonly glmOpenCode?: RawGlmOpenCodeSettings;
    readonly glmNative?: RawGlmNativeSettings;
    readonly localModels?: RawLocalModelsSettings;
    readonly openRouter?: RawOpenRouterSettings;
  };
}
