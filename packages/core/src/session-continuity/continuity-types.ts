export type ContinuityStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "unknown";

export type TokenUsageSnapshot = {
  readonly used: number;
  readonly limit: number;
  readonly updatedAt: string;
};

export type TokenUsageDecision = {
  readonly usedRatio: number;
  readonly remainingRatio: number;
  readonly shouldHandoff: boolean;
};

export type ContinuitySegment = {
  readonly sessionId: string;
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly createdAt: string;
  readonly handoffReportPath?: string;
  readonly tokenUsage?: TokenUsageSnapshot;
};

export type ContinuityChain = {
  readonly rootSessionId: string;
  /**
   * Stable UI dialog key. Legacy chains may omit this field; treat as
   * `rootSessionId` when missing.
   */
  readonly dialogId?: string;
  readonly workspaceSlug: string;
  readonly stage: ContinuityStageId;
  readonly segments: readonly ContinuitySegment[];
  readonly updatedAt: string;
};

export type ContinuityChainSummary = {
  readonly rootSessionId: string;
  /**
   * Stable UI dialog key. Legacy chains may omit this field; treat as
   * `rootSessionId` when missing.
   */
  readonly dialogId?: string;
  readonly workspaceSlug: string;
  readonly stage: ContinuityStageId;
  readonly segments: readonly ContinuitySegment[];
  readonly updatedAt: string;
};

export type HandoffReportSnapshot = {
  readonly path: string;
  readonly createdAt: string;
};
