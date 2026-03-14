import type {
  ProviderUsageLimitsSnapshot,
  ProviderUsageLimitWindow,
} from "./provider-usage-limits-types";

const areWindowsEqual = (
  left: ProviderUsageLimitWindow,
  right: ProviderUsageLimitWindow
): boolean =>
  left.id === right.id &&
  left.label === right.label &&
  left.percentUsed === right.percentUsed &&
  left.resetsAt === right.resetsAt &&
  left.windowKind === right.windowKind;

const hasDifferentMetadata = (
  previous: ProviderUsageLimitsSnapshot,
  next: ProviderUsageLimitsSnapshot
): boolean =>
  previous.providerId !== next.providerId ||
  previous.providerScopeKey !== next.providerScopeKey ||
  previous.source !== next.source ||
  previous.windows.length !== next.windows.length;

const hasDifferentWindows = (
  previous: ProviderUsageLimitsSnapshot,
  next: ProviderUsageLimitsSnapshot
): boolean => {
  for (const [index, previousWindow] of previous.windows.entries()) {
    const nextWindow = next.windows[index];
    if (!(nextWindow && areWindowsEqual(previousWindow, nextWindow))) {
      return true;
    }
  }
  return false;
};

export class ProviderUsageLimitsChangeDetector {
  hasChanged(
    previous: ProviderUsageLimitsSnapshot | null,
    next: ProviderUsageLimitsSnapshot | null
  ): boolean {
    if (!(previous || next)) {
      return false;
    }
    if (!(previous && next)) {
      return true;
    }
    if (hasDifferentMetadata(previous, next)) {
      return true;
    }
    return hasDifferentWindows(previous, next);
  }
}
