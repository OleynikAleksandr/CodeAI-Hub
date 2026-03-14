import type {
  CompatibleSessionUsageLimitLabels,
  CompatibleSessionUsageLimits,
  ProviderUsageLimitsDiagnostics,
  ProviderUsageLimitsReadResult,
  ProviderUsageLimitsSnapshot,
  ProviderUsageLimitsStreamPayload,
} from "./provider-usage-limits-types";

const COMPAT_LABEL_KEYS = {
  primary: "currentSession",
  secondary: "currentWeekAllModels",
  tertiary: "currentWeekSonnetOnly",
} as const;

const hasUsageLimits = (
  usageLimits: CompatibleSessionUsageLimits
): usageLimits is NonNullable<CompatibleSessionUsageLimits> =>
  Boolean(
    usageLimits &&
      (usageLimits.currentSession ||
        usageLimits.currentWeekAllModels ||
        usageLimits.currentWeekSonnetOnly)
  );

const buildUsageLimitLabels = (
  snapshot: ProviderUsageLimitsSnapshot
): CompatibleSessionUsageLimitLabels => {
  const labels: Record<string, string> = {};
  for (const window of snapshot.windows) {
    const key = COMPAT_LABEL_KEYS[window.id];
    if (key && window.label.trim()) {
      labels[key] = window.label.trim();
    }
  }

  return Object.keys(labels).length > 0
    ? (labels as NonNullable<CompatibleSessionUsageLimitLabels>)
    : null;
};

const buildPayload = (
  snapshot: ProviderUsageLimitsSnapshot,
  usageLimits: CompatibleSessionUsageLimits,
  diagnostics?: ProviderUsageLimitsDiagnostics
): ProviderUsageLimitsStreamPayload => {
  const usageLimitLabels = buildUsageLimitLabels(snapshot);
  return {
    providerScopeKey: snapshot.providerScopeKey,
    usageLimits,
    data: {
      kind: "usage_limits",
      usageLimits,
      ...(usageLimitLabels ? { usageLimitLabels } : {}),
      providerScopeKey: snapshot.providerScopeKey,
      source: snapshot.source,
      collectedAt: snapshot.collectedAt,
      ...(diagnostics ? { diagnostics } : {}),
    },
  };
};

export const buildProviderUsageLimitsStreamPayload = (
  result: ProviderUsageLimitsReadResult
): ProviderUsageLimitsStreamPayload | null => {
  if (!result.snapshot) {
    return null;
  }

  const usageLimits = hasUsageLimits(result.compat) ? result.compat : null;
  return buildPayload(result.snapshot, usageLimits, result.diagnostics);
};
