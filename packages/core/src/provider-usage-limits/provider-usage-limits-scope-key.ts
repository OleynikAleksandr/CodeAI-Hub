import type { ProviderUsageLimitProviderId } from "./provider-usage-limits-types";

const GLOBAL_SCOPE_SUFFIX = "global";

const normalizeProviderId = (value: ProviderUsageLimitProviderId): string =>
  value.trim().toLowerCase();

const normalizeProviderSessionId = (value: string | null | undefined): string =>
  value?.trim() || GLOBAL_SCOPE_SUFFIX;

export const buildProviderUsageLimitScopeKey = (options: {
  readonly providerId: ProviderUsageLimitProviderId;
  readonly providerSessionId: string | null;
}): string =>
  `${normalizeProviderId(options.providerId)}:${normalizeProviderSessionId(options.providerSessionId)}`;

export const normalizeProviderUsageLimitScopeKey = (
  value: string | null | undefined
): string => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "";
  }

  const separatorIndex = trimmed.indexOf(":");
  if (separatorIndex <= 0) {
    return "";
  }

  const providerId = trimmed.slice(0, separatorIndex).trim().toLowerCase();
  const providerSessionId = trimmed.slice(separatorIndex + 1).trim();
  if (!providerId) {
    return "";
  }

  return `${providerId}:${providerSessionId || GLOBAL_SCOPE_SUFFIX}`;
};
