import { loadOpenRouterSettingsSnapshot } from "./provider-settings-snapshot";
import type {
  ProviderTurnConfigResolverOptions,
  ResolvedProviderTurnConfigEntry,
} from "./provider-turn-config-resolver";

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

export const resolveOpenRouterTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedProviderTurnConfigEntry => {
  const snapshot = loadOpenRouterSettingsSnapshot(options.settingsPath);
  const defaultModel =
    normalizeOptionalString(snapshot?.defaultModel) ??
    normalizeOptionalString(options.env.CODEAI_OPENROUTER_DEFAULT_MODEL) ??
    normalizeOptionalString(options.env.OPENROUTER_DEFAULT_MODEL);

  return {
    providerId: "openRouter",
    ...(defaultModel
      ? {
          baseModelId: defaultModel,
          defaultModel,
          effectiveModelId: defaultModel,
        }
      : {}),
  };
};
