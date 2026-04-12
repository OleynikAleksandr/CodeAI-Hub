import type { ProviderUsageLimitProviderId } from "./provider-usage-limits-types";

const GLOBAL_SCOPE_SUFFIX = "global";

const normalizeProviderId = (value: ProviderUsageLimitProviderId): string =>
  value.trim().toLowerCase();

export const buildProviderUsageLimitScopeKey = (options: {
  readonly providerId: ProviderUsageLimitProviderId;
  readonly providerSessionId: string | null;
}): string =>
  `${normalizeProviderId(options.providerId)}:${GLOBAL_SCOPE_SUFFIX}`;
