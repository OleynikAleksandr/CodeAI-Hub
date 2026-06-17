import { DEFAULT_KIMI_MODEL_ID } from "../../../../../types/kimi-model-registry";
import type {
  RawAutoUpdateSettings,
  RawGlmNativeSettings,
  RawGlmOpenCodeSettings,
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

export type GlmOpenCodeModelId =
  | "zai-coding-plan/glm-5.2"
  | "kimi-for-coding/k2p7";

export interface GlmOpenCodeSettings {
  readonly apiKey: string;
  readonly configPath: string;
  readonly defaultModel: string;
  readonly thinkingDisplaySyncEnabled: boolean;
}

export interface GlmNativeSettings {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly defaultModel: "glm-5.2";
  readonly thinkingDisplaySyncEnabled: boolean;
}

const DEFAULT_GLM_OPENCODE_CONFIG_PATH =
  "~/.codeai-hub/providers/opencode/config.json";
const DEFAULT_GLM_NATIVE_BASE_URL = "https://api.z.ai/api/coding/paas/v4";
export const GLM_OPENCODE_MODEL_OPTIONS = [
  {
    description: "Z.AI Coding Plan selector",
    id: "zai-coding-plan/glm-5.2",
    label: "GLM 5.2",
  },
  {
    description: "Kimi for Coding selector",
    id: "kimi-for-coding/k2p7",
    label: "Kimi K2.7",
  },
] as const satisfies readonly {
  readonly description: string;
  readonly id: GlmOpenCodeModelId;
  readonly label: string;
}[];
const DEFAULT_GLM_OPENCODE_MODEL: GlmOpenCodeModelId =
  "zai-coding-plan/glm-5.2";
const GLM_OPENCODE_MODEL_IDS = new Set<string>(
  GLM_OPENCODE_MODEL_OPTIONS.map((option) => option.id)
);
const LEGACY_GLM_OPENCODE_MODEL_IDS = new Set([
  "glm-5.1",
  "glm-5-turbo",
  "glm-4.5-air",
  "glm-5.2",
]);

const mapOptionalString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

const mapGlmOpenCodeModel = (value: unknown): GlmOpenCodeModelId => {
  const modelId = mapOptionalString(value, DEFAULT_GLM_OPENCODE_MODEL);
  if (
    LEGACY_GLM_OPENCODE_MODEL_IDS.has(modelId) ||
    !GLM_OPENCODE_MODEL_IDS.has(modelId)
  ) {
    return DEFAULT_GLM_OPENCODE_MODEL;
  }
  return modelId as GlmOpenCodeModelId;
};

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

export const mapGlmOpenCodeSettings = (
  value: RawGlmOpenCodeSettings | undefined,
  mapThinkingDisplaySyncEnabled: (value: unknown) => boolean
): GlmOpenCodeSettings => ({
  apiKey: mapOptionalString(value?.apiKey, ""),
  configPath: mapOptionalString(
    value?.configPath,
    DEFAULT_GLM_OPENCODE_CONFIG_PATH
  ),
  defaultModel: mapGlmOpenCodeModel(value?.defaultModel),
  thinkingDisplaySyncEnabled: mapThinkingDisplaySyncEnabled(
    value?.thinkingDisplaySyncEnabled
  ),
});

export const mapGlmNativeSettings = (
  value: RawGlmNativeSettings | undefined,
  mapThinkingDisplaySyncEnabled: (value: unknown) => boolean
): GlmNativeSettings => ({
  apiKey: mapOptionalString(value?.apiKey, ""),
  baseUrl: mapOptionalString(value?.baseUrl, DEFAULT_GLM_NATIVE_BASE_URL),
  defaultModel: "glm-5.2",
  thinkingDisplaySyncEnabled: mapThinkingDisplaySyncEnabled(
    value?.thinkingDisplaySyncEnabled
  ),
});

export const areKimiProviderSettingsEqual = (
  left: KimiSettings | GlmOpenCodeSettings | GlmNativeSettings | undefined,
  right: KimiSettings | GlmOpenCodeSettings | GlmNativeSettings | undefined
): boolean => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
