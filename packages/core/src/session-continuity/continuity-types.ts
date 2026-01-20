export type ContinuityStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "diagram_facades"
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
};

export type ContinuityChain = {
  readonly rootSessionId: string;
  readonly workspaceSlug: string;
  readonly stage: ContinuityStageId;
  readonly segments: readonly ContinuitySegment[];
  readonly updatedAt: string;
};

export type ContinuityChainSummary = {
  readonly rootSessionId: string;
  readonly workspaceSlug: string;
  readonly stage: ContinuityStageId;
  readonly segments: readonly ContinuitySegment[];
  readonly updatedAt: string;
};
