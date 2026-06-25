import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../../types/provider";

const LOCALIZATION_ENGINE_PROVIDER_MAP: Readonly<
  Partial<Record<string, ProviderStackId>>
> = {
  "anthropic-claude-haiku-4-5": "claudeCodeCli",
  "codex-gpt-5.3-codex-spark": "codexCli",
  "codex-gpt-5.4-mini": "codexCli",
  "google/gemini-2.5-flash-lite-preview-09-2025": "openRouter",
};

const APPLE_NATIVE_TRANSLATION_ENGINE_ID = "apple-native";
const GEMINI_FLASH_LITE_ENGINE_ID =
  "google/gemini-2.5-flash-lite-preview-09-2025";
const LM_STUDIO_TRANSLATION_ENGINE_PREFIX = "lmstudio:";
const MAC_PLATFORM_PATTERN = /mac/iu;

export interface LocalizationEngineAvailability {
  readonly disabled: boolean;
  readonly provider: ProviderStackDescriptor | null;
  readonly providerId: ProviderStackId | null;
}

const isAppleNativePlatform = (): boolean => {
  if (typeof navigator === "undefined") {
    return false;
  }
  return MAC_PLATFORM_PATTERN.test(
    `${navigator.platform} ${navigator.userAgent}`
  );
};

export const shouldExposeLocalizationEngineOption = (
  engineId: string
): boolean =>
  engineId !== APPLE_NATIVE_TRANSLATION_ENGINE_ID || isAppleNativePlatform();

export const formatUnknownLocalizationEngineLabel = (
  engineId: string
): string => {
  if (engineId === APPLE_NATIVE_TRANSLATION_ENGINE_ID) {
    return "Apple Native - On-Device";
  }
  if (engineId.startsWith("codex-")) {
    return `OpenAI Codex · ${engineId.slice("codex-".length)}`;
  }
  if (engineId === GEMINI_FLASH_LITE_ENGINE_ID) {
    return "OpenRouter · Gemini 2.5 Flash Lite Preview";
  }
  if (engineId.startsWith(LM_STUDIO_TRANSLATION_ENGINE_PREFIX)) {
    const modelKey = engineId.slice(LM_STUDIO_TRANSLATION_ENGINE_PREFIX.length);
    return `LM Studio · ${modelKey.split("/").pop() ?? modelKey}`;
  }
  return engineId;
};

const resolveLocalizationEngineProviderId = (
  engineId: string
): ProviderStackId | null => LOCALIZATION_ENGINE_PROVIDER_MAP[engineId] ?? null;

export const resolveLocalizationEngineAvailability = (options: {
  readonly engineId: string;
  readonly providers: readonly ProviderStackDescriptor[];
}): LocalizationEngineAvailability => {
  if (
    options.engineId === APPLE_NATIVE_TRANSLATION_ENGINE_ID &&
    !isAppleNativePlatform()
  ) {
    return {
      disabled: true,
      provider: null,
      providerId: null,
    };
  }

  const providerId = resolveLocalizationEngineProviderId(options.engineId);
  if (!providerId) {
    return {
      disabled: false,
      provider: null,
      providerId: null,
    };
  }

  const provider =
    options.providers.find((candidate) => candidate.id === providerId) ?? null;
  if (!provider) {
    return {
      disabled: false,
      provider: null,
      providerId,
    };
  }

  return {
    disabled: provider.connected === false,
    provider,
    providerId,
  };
};
