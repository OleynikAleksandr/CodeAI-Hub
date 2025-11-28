export type ClaudeThinkingSettings = {
	readonly enabled: boolean;
	readonly maxTokens: number;
};

export type SettingsSnapshot = {
	readonly thinking: ClaudeThinkingSettings;
};

export const DEFAULT_THINKING_SETTINGS: ClaudeThinkingSettings = {
	enabled: false,
	maxTokens: 4000,
};

export const DEFAULT_SETTINGS_SNAPSHOT: SettingsSnapshot = {
	thinking: DEFAULT_THINKING_SETTINGS,
};
