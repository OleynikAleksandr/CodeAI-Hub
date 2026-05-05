import type { SessionModelBinding } from "../session-model-binding";

type KnownContinuityStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules";

type DevelopmentTreeContinuityStageId = `development_tree/${string}`;

export type ContinuityStageId =
  | DevelopmentTreeContinuityStageId
  | KnownContinuityStageId
  | "unknown";

const KNOWN_CONTINUITY_STAGE_IDS = new Set<KnownContinuityStageId>([
  "description",
  "virtual_simulation",
  "diagram_modules",
]);

const isKnownContinuityStageId = (
  value: string | null | undefined
): value is KnownContinuityStageId =>
  typeof value === "string" &&
  KNOWN_CONTINUITY_STAGE_IDS.has(value as KnownContinuityStageId);

const DEVELOPMENT_TREE_STAGE_PREFIX = "development_tree/";
const DEVELOPMENT_TREE_STAGE_ROOT = "development_tree";
const DEVELOPMENT_TREE_MATERIALIZED_SEGMENT = "materialized";
const STAGE_PATH_SEPARATOR_RE = /[\\/]+/;

const isSafeStageSegment = (segment: string): boolean =>
  segment.length > 0 && segment !== "." && segment !== "..";

const normalizeDevelopmentTreeStageId = (
  value: string
): DevelopmentTreeContinuityStageId | null => {
  if (!value.startsWith(DEVELOPMENT_TREE_STAGE_PREFIX)) {
    return null;
  }
  const segments = value.split(STAGE_PATH_SEPARATOR_RE).filter(Boolean);
  if (
    segments[0] !== DEVELOPMENT_TREE_STAGE_ROOT ||
    segments[1] !== DEVELOPMENT_TREE_MATERIALIZED_SEGMENT ||
    !segments.every(isSafeStageSegment)
  ) {
    return null;
  }
  return segments.join("/") as DevelopmentTreeContinuityStageId;
};

export const normalizeContinuityStageId = (
  value: string | null | undefined
): ContinuityStageId => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "unknown";
  }
  if (isKnownContinuityStageId(trimmed)) {
    return trimmed;
  }
  return normalizeDevelopmentTreeStageId(trimmed) ?? "unknown";
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
  readonly modelBinding?: SessionModelBinding | null;
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
