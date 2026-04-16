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
};

export interface LocalizationEngineAvailability {
  readonly disabled: boolean;
  readonly provider: ProviderStackDescriptor | null;
  readonly providerId: ProviderStackId | null;
}

const resolveLocalizationEngineProviderId = (
  engineId: string
): ProviderStackId | null => LOCALIZATION_ENGINE_PROVIDER_MAP[engineId] ?? null;

export const resolveLocalizationEngineAvailability = (options: {
  readonly engineId: string;
  readonly providers: readonly ProviderStackDescriptor[];
}): LocalizationEngineAvailability => {
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
