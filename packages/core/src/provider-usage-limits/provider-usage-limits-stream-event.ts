import type {
  CompatibleSessionUsageLimits,
  ProviderUsageLimitsReadResult,
  ProviderUsageLimitsSnapshot,
  ProviderUsageLimitsStreamPayload,
} from "./provider-usage-limits-types";

const hasUsageLimits = (
  usageLimits: CompatibleSessionUsageLimits
): usageLimits is NonNullable<CompatibleSessionUsageLimits> =>
  Boolean(
    usageLimits &&
      (usageLimits.currentSession ||
        usageLimits.currentWeekAllModels ||
        usageLimits.currentWeekSonnetOnly)
  );

const buildPayload = (
  snapshot: ProviderUsageLimitsSnapshot,
  usageLimits: CompatibleSessionUsageLimits
): ProviderUsageLimitsStreamPayload => ({
  providerScopeKey: snapshot.providerScopeKey,
  usageLimits,
  data: {
    kind: "usage_limits",
    usageLimits,
    providerScopeKey: snapshot.providerScopeKey,
    source: snapshot.source,
    collectedAt: snapshot.collectedAt,
  },
});

export const buildProviderUsageLimitsStreamPayload = (
  result: ProviderUsageLimitsReadResult
): ProviderUsageLimitsStreamPayload | null => {
  if (!result.snapshot) {
    return null;
  }

  const usageLimits = hasUsageLimits(result.compat) ? result.compat : null;
  return buildPayload(result.snapshot, usageLimits);
};
