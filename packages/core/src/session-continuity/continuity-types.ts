export type ContinuityStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "unknown";

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
