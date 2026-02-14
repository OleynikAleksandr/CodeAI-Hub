import type { SessionRecord, SessionSnapshot } from "../../../../types/session";

export const buildTokenDebugSummary = (params: {
  readonly chain: readonly SessionRecord[];
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
  readonly activeSessionId: string;
}): string | null => {
  if (params.chain.length <= 1) {
    return null;
  }

  const formatRemainingPercent = (options: {
    readonly used: number;
    readonly limit: number;
  }): string => {
    if (!(Number.isFinite(options.used) && Number.isFinite(options.limit))) {
      return "—";
    }
    if (options.limit <= 0) {
      return "—";
    }
    const usedPercentage = Math.max(
      0,
      Math.min(100, Math.round((options.used / options.limit) * 100))
    );
    const remainingPercentage = Math.max(
      0,
      Math.min(100, 100 - usedPercentage)
    );
    return `${remainingPercentage}%`;
  };

  const parts: string[] = [];
  for (const [index, segment] of params.chain.entries()) {
    const snapshot = params.snapshots[segment.id];
    if (!snapshot) {
      continue;
    }

    const label = `#${index + 1}`;
    const remainingPercent = formatRemainingPercent({
      used: snapshot.status.tokenUsage.used,
      limit: snapshot.status.tokenUsage.limit,
    });
    parts.push(`${label} (${remainingPercent})`);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
};
