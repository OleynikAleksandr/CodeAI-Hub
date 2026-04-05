type KnownContinuityStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "foundation_envelope";

export type ContinuityStageId = KnownContinuityStageId | "unknown";

const KNOWN_CONTINUITY_STAGE_IDS = new Set<KnownContinuityStageId>([
  "description",
  "virtual_simulation",
  "diagram_modules",
  "foundation_envelope",
]);

const isKnownContinuityStageId = (
  value: string | null | undefined
): value is KnownContinuityStageId =>
  typeof value === "string" &&
  KNOWN_CONTINUITY_STAGE_IDS.has(value as KnownContinuityStageId);

export const normalizeContinuityStageId = (
  value: string | null | undefined
): ContinuityStageId => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "unknown";
  }
  return isKnownContinuityStageId(trimmed) ? trimmed : "unknown";
};

export interface TokenUsageSnapshot {
  readonly limit: number;
  readonly updatedAt: string;
  readonly used: number;
}

export interface TokenUsageDecision {
  readonly remainingRatio: number;
  readonly shouldHandoff: boolean;
  readonly usedRatio: number;
}

export interface ContinuitySegment {
  readonly createdAt: string;
  readonly handoffReportPath?: string;
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly sessionId: string;
  readonly tokenUsage?: TokenUsageSnapshot;
}

export interface ContinuityChain {
  /**
   * Stable UI dialog key. Legacy chains may omit this field; treat as
   * `rootSessionId` when missing.
   */
  readonly dialogId?: string;
  readonly rootSessionId: string;
  readonly segments: readonly ContinuitySegment[];
  readonly stage: ContinuityStageId;
  readonly updatedAt: string;
  readonly workspaceSlug: string;
}

export interface ContinuityChainSummary {
  /**
   * Stable UI dialog key. Legacy chains may omit this field; treat as
   * `rootSessionId` when missing.
   */
  readonly dialogId?: string;
  readonly rootSessionId: string;
  readonly segments: readonly ContinuitySegment[];
  readonly stage: ContinuityStageId;
  readonly updatedAt: string;
  readonly workspaceSlug: string;
}

export interface HandoffReportSnapshot {
  readonly createdAt: string;
  readonly path: string;
}
