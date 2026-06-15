import { DEFAULT_KIMI_MODEL_ID } from "../../../../../types/kimi-model-registry";
import type {
  RawAutoUpdateSettings,
  RawGlmClaudeCodeSettings,
  RawKimiSettings,
} from "./settings-state-raw";

interface AutoUpdateSettings {
  readonly enabled: boolean;
}

export interface KimiSettings {
  readonly autoUpdate: AutoUpdateSettings;
  readonly defaultModel: typeof DEFAULT_KIMI_MODEL_ID;
  readonly thinkingDisplaySyncEnabled: boolean;
}

export interface GlmClaudeCodeSettings {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly configPath: string;
  readonly defaultModel: string;
  readonly haikuModel: string;
  readonly opusModel: string;
  readonly sonnetModel: string;
  readonly thinkingDisplaySyncEnabled: boolean;
}

const DEFAULT_GLM_CLAUDE_CODE_CONFIG_PATH =
  "~/.codeai-hub/providers/glm-claude-code/config.json";
const DEFAULT_GLM_CLAUDE_CODE_BASE_URL = "https://api.z.ai/api/anthropic";
const DEFAULT_GLM_CLAUDE_CODE_OPUS_MODEL = "glm-5.2";
const DEFAULT_GLM_CLAUDE_CODE_SONNET_MODEL = "glm-5.2";
const DEFAULT_GLM_CLAUDE_CODE_HAIKU_MODEL = "glm-5.2";

const mapOptionalString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

export const mapKimiSettings = (
  value: RawKimiSettings | undefined,
  mapAutoUpdateSettings: (
    value: RawAutoUpdateSettings | undefined
  ) => AutoUpdateSettings,
  mapThinkingDisplaySyncEnabled: (value: unknown) => boolean
): KimiSettings => ({
  autoUpdate: mapAutoUpdateSettings(value?.autoUpdate),
  defaultModel: DEFAULT_KIMI_MODEL_ID,
  thinkingDisplaySyncEnabled: mapThinkingDisplaySyncEnabled(
    value?.thinkingDisplaySyncEnabled
  ),
});

export const mapGlmClaudeCodeSettings = (
  value: RawGlmClaudeCodeSettings | undefined,
  mapThinkingDisplaySyncEnabled: (value: unknown) => boolean
): GlmClaudeCodeSettings => ({
  apiKey: mapOptionalString(value?.apiKey, ""),
  baseUrl: mapOptionalString(value?.baseUrl, DEFAULT_GLM_CLAUDE_CODE_BASE_URL),
  configPath: mapOptionalString(
    value?.configPath,
    DEFAULT_GLM_CLAUDE_CODE_CONFIG_PATH
  ),
  defaultModel: mapOptionalString(
    value?.defaultModel,
    DEFAULT_GLM_CLAUDE_CODE_OPUS_MODEL
  ),
  haikuModel: mapOptionalString(
    value?.haikuModel,
    DEFAULT_GLM_CLAUDE_CODE_HAIKU_MODEL
  ),
  opusModel: mapOptionalString(
    value?.opusModel,
    DEFAULT_GLM_CLAUDE_CODE_OPUS_MODEL
  ),
  sonnetModel: mapOptionalString(
    value?.sonnetModel,
    DEFAULT_GLM_CLAUDE_CODE_SONNET_MODEL
  ),
  thinkingDisplaySyncEnabled: mapThinkingDisplaySyncEnabled(
    value?.thinkingDisplaySyncEnabled
  ),
});

export const areKimiProviderSettingsEqual = (
  left: KimiSettings | GlmClaudeCodeSettings | undefined,
  right: KimiSettings | GlmClaudeCodeSettings | undefined
): boolean => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
