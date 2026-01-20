import type {
  TokenUsageDecision,
  TokenUsageSnapshot,
} from "./continuity-types";

const clampRatio = (value: number): number => {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
};

export class ContinuityMonitor {
  private readonly threshold: number;
  private readonly usageBySession = new Map<string, TokenUsageSnapshot>();
  private readonly triggered = new Set<string>();

  constructor(options?: { readonly remainingRatioThreshold?: number }) {
    this.threshold = options?.remainingRatioThreshold ?? 0.25;
  }

  record(sessionId: string, usage: TokenUsageSnapshot): TokenUsageDecision {
    this.usageBySession.set(sessionId, usage);

    const usedRatio = clampRatio(usage.used / usage.limit);
    const remainingRatio = clampRatio(1 - usedRatio);
    const shouldHandoff =
      remainingRatio <= this.threshold && !this.triggered.has(sessionId);

    if (shouldHandoff) {
      this.triggered.add(sessionId);
    }

    return {
      usedRatio,
      remainingRatio,
      shouldHandoff,
    };
  }

  reset(sessionId: string): void {
    this.usageBySession.delete(sessionId);
    this.triggered.delete(sessionId);
  }
}
