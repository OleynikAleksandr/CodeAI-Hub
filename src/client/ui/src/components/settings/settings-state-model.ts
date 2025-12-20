export type ProviderId = "claude" | "codex" | "gemini";

type ThinkingSettings = {
  readonly enabled: boolean;
  readonly maxTokens: number;
};

type AutoUpdateSettings = {
  readonly enabled: boolean;
};

type CoreControlsSettings = {
  readonly allowRestart: boolean;
};

type GeneralSettings = {
  readonly coreControls: CoreControlsSettings;
};

type ClaudeSettings = {
  readonly thinking: ThinkingSettings;
  readonly autoUpdate: AutoUpdateSettings;
};

type CodexSettings = {
  readonly autoUpdate: AutoUpdateSettings;
};

type GeminiSettings = {
  readonly autoUpdate: AutoUpdateSettings;
};

export type Settings = {
  readonly general: GeneralSettings;
  readonly providers: {
    readonly claude: ClaudeSettings;
    readonly codex: CodexSettings;
    readonly gemini: GeminiSettings;
  };
};

export type VersionEntry = {
  readonly packageName: string;
  readonly currentVersion: string | null;
  readonly latestVersion: string | null;
  readonly source: "global";
  readonly error?: string | null;
};

export type ProviderVersions = {
  readonly claude: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly codex: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly gemini: {
    readonly cli: VersionEntry;
    readonly core: VersionEntry;
  };
  readonly checkedAt?: string;
};

type RawThinkingSettings = {
  readonly enabled?: unknown;
  readonly maxTokens?: unknown;
};

type RawAutoUpdateSettings = {
  readonly enabled?: unknown;
};

type RawClaudeSettings = {
  readonly thinking?: RawThinkingSettings;
  readonly autoUpdate?: RawAutoUpdateSettings;
};

type RawCodexSettings = {
  readonly autoUpdate?: RawAutoUpdateSettings;
};

type RawGeminiSettings = {
  readonly autoUpdate?: RawAutoUpdateSettings;
};

type RawCoreControlsSettings = {
  readonly allowRestart?: unknown;
};

type RawGeneralSettings = {
  readonly coreControls?: RawCoreControlsSettings;
};

export type RawSettingsSnapshot = {
  readonly general?: RawGeneralSettings;
  readonly providers?: {
    readonly claude?: RawClaudeSettings;
    readonly codex?: RawCodexSettings;
    readonly gemini?: RawGeminiSettings;
  };
};

const DEFAULT_THINKING_MAX_TOKENS = 4000;
const DEFAULT_AUTO_UPDATE_ENABLED = true;
const DEFAULT_CORE_RESTART_ENABLED = true;

const mapThinkingSettings = (
  value: RawThinkingSettings | undefined
): ThinkingSettings => {
  const numericValue = Number(value?.maxTokens);
  return {
    enabled: Boolean(value?.enabled),
    maxTokens: Number.isFinite(numericValue)
      ? numericValue
      : DEFAULT_THINKING_MAX_TOKENS,
  };
};

const mapAutoUpdateSettings = (
  value: RawAutoUpdateSettings | undefined
): AutoUpdateSettings => ({
  enabled:
    typeof value?.enabled === "boolean"
      ? value.enabled
      : DEFAULT_AUTO_UPDATE_ENABLED,
});

const mapGeneralSettings = (
  value: RawGeneralSettings | undefined
): GeneralSettings => ({
  coreControls: {
    allowRestart:
      typeof value?.coreControls?.allowRestart === "boolean"
        ? value.coreControls.allowRestart
        : DEFAULT_CORE_RESTART_ENABLED,
  },
});

const mapClaudeSettings = (
  value: RawClaudeSettings | undefined
): ClaudeSettings => ({
  thinking: mapThinkingSettings(value?.thinking),
  autoUpdate: mapAutoUpdateSettings(value?.autoUpdate),
});

const mapCodexSettings = (
  value: RawCodexSettings | undefined
): CodexSettings => ({
  autoUpdate: mapAutoUpdateSettings(value?.autoUpdate),
});

const mapGeminiSettings = (
  value: RawGeminiSettings | undefined
): GeminiSettings => ({
  autoUpdate: mapAutoUpdateSettings(value?.autoUpdate),
});

export const mapSettingsSnapshot = (
  value: RawSettingsSnapshot | undefined
): Settings => ({
  general: mapGeneralSettings(value?.general),
  providers: {
    claude: mapClaudeSettings(value?.providers?.claude),
    codex: mapCodexSettings(value?.providers?.codex),
    gemini: mapGeminiSettings(value?.providers?.gemini),
  },
});

export const createDefaultSettings = (): Settings =>
  mapSettingsSnapshot(undefined);

const areAutoUpdateSettingsEqual = (
  left: AutoUpdateSettings,
  right: AutoUpdateSettings
): boolean => left.enabled === right.enabled;

const areThinkingSettingsEqual = (
  left: ThinkingSettings,
  right: ThinkingSettings
): boolean =>
  left.enabled === right.enabled && left.maxTokens === right.maxTokens;

const areGeneralSettingsEqual = (
  left: GeneralSettings,
  right: GeneralSettings
): boolean =>
  left.coreControls.allowRestart === right.coreControls.allowRestart;

const areClaudeSettingsEqual = (
  left: ClaudeSettings,
  right: ClaudeSettings
): boolean =>
  areThinkingSettingsEqual(left.thinking, right.thinking) &&
  areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate);

const areCodexSettingsEqual = (
  left: CodexSettings,
  right: CodexSettings
): boolean => areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate);

const areGeminiSettingsEqual = (
  left: GeminiSettings,
  right: GeminiSettings
): boolean => areAutoUpdateSettingsEqual(left.autoUpdate, right.autoUpdate);

export const areSettingsEqual = (left: Settings, right: Settings): boolean =>
  areGeneralSettingsEqual(left.general, right.general) &&
  areClaudeSettingsEqual(left.providers.claude, right.providers.claude) &&
  areCodexSettingsEqual(left.providers.codex, right.providers.codex) &&
  areGeminiSettingsEqual(left.providers.gemini, right.providers.gemini);
