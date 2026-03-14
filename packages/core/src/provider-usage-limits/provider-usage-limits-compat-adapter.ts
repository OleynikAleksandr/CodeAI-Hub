import type {
  CompatibleSessionUsageLimits,
  ProviderUsageLimitBucket,
  ProviderUsageLimitsAdapter,
  ProviderUsageLimitsSnapshot,
  ProviderUsageLimitWindow,
} from "./provider-usage-limits-types";

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value);
};

const toCompatBucket = (
  window: ProviderUsageLimitWindow | undefined
): ProviderUsageLimitBucket | null => {
  if (!window) {
    return null;
  }

  return {
    percentUsed: clampPercent(window.percentUsed),
    resetsAt: window.resetsAt,
  };
};

const findWindowById = (
  snapshot: ProviderUsageLimitsSnapshot,
  id: ProviderUsageLimitWindow["id"]
): ProviderUsageLimitWindow | undefined =>
  snapshot.windows.find((window) => window.id === id);

export class ProviderUsageLimitsCompatAdapter
  implements ProviderUsageLimitsAdapter
{
  toCompat(
    snapshot: ProviderUsageLimitsSnapshot | null
  ): CompatibleSessionUsageLimits {
    if (!snapshot) {
      return null;
    }

    const currentSession = toCompatBucket(findWindowById(snapshot, "primary"));
    const currentWeekAllModels = toCompatBucket(
      findWindowById(snapshot, "secondary")
    );
    const currentWeekSonnetOnly = toCompatBucket(
      findWindowById(snapshot, "tertiary")
    );

    if (!(currentSession || currentWeekAllModels || currentWeekSonnetOnly)) {
      return null;
    }

    return {
      currentSession,
      currentWeekAllModels,
      currentWeekSonnetOnly,
    };
  }
}
