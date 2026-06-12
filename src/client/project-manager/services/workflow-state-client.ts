import { buildWorkflowStateQuery } from "./workflow-state-query";
import {
  parseDevelopmentTreeSnapshot,
  type DevelopmentTreeContinuityStageId,
  type DevelopmentTreeSnapshot,
} from "./workflow-state-development-tree-client";
import { parseWorkflowGating, type WorkflowGatingSnapshot } from "./workflow-gating-client";
const WORKFLOW_STATE_ENDPOINT = "/api/v1/orchestrator/workflow-state";
export type {
  DevelopmentTreeClusterNode,
  DevelopmentTreeModuleNode,
  DevelopmentTreeNodeArtifact,
  DevelopmentTreeNodeSession,
  DevelopmentTreePartNode,
  DevelopmentTreeReadiness,
  DevelopmentTreeSnapshot,
} from "./workflow-state-development-tree-client";

export type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

export type ContinuityStageId =
  | WorkflowStageId
  | DevelopmentTreeContinuityStageId
  | "unknown";

export type WorkflowStageStatus =
  | "idle"
  | "in_progress"
  | "completed"
  | "invalid"
  | "outdated";

export type ContinuitySegmentSnapshot = {
  readonly sessionId: string;
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly createdAt: string;
  readonly handoffReportPath?: string;
};

export type ContinuityChainSnapshot = {
  readonly rootSessionId: string;
  readonly workspaceSlug: string;
  readonly stage: ContinuityStageId;
  readonly segments: readonly ContinuitySegmentSnapshot[];
  readonly updatedAt: string;
};

export type WorkflowContinuitySnapshot = {
  readonly chains: readonly ContinuityChainSnapshot[];
};

export type WorkflowLastActiveSnapshot = {
  readonly artifactPath?: string;
  readonly stage: WorkflowStageId;
  readonly updatedAt: string;
};

export type TechnicalStageRewriteBoundarySnapshot = {
  readonly active: boolean;
  readonly blockers: readonly string[];
  readonly readOnlyStages: readonly string[];
};

export type ManagedWorkflowPreviewStageSnapshot = {
  readonly controllerId: string;
  readonly currentPhase?: Record<string, unknown> | null;
  readonly displayName: string;
  readonly phaseTypes: readonly string[];
  readonly runStatus?: string;
  readonly startPolicy: "managed_dispatch" | "provider_direct" | "core_preview_boundary";
};

export type ManagedWorkflowPreviewSnapshot = {
  readonly active: true;
  readonly mode: "preview";
  readonly readOnlyStages: readonly string[];
  readonly reason: string;
  readonly stages: readonly ManagedWorkflowPreviewStageSnapshot[];
};

export type DiagramModulesSubturnSnapshot =
  | {
      readonly kind: "index";
      readonly status: "accepted" | "pending" | "repair_pending";
    }
  | {
      readonly kind: "product_part";
      readonly partId: string;
      readonly status: "accepted" | "pending" | "repair_pending";
    }
  | { readonly kind: "aggregate"; readonly status: "accepted" };

export type DiagramModulesProgressSnapshot = Record<string, unknown> & {
  readonly acceptedPartIds?: readonly string[];
  readonly activeSubturn?: DiagramModulesSubturnSnapshot;
  readonly currentPartId?: string;
  readonly generatedPartIds?: readonly string[];
  readonly plannedPartIds?: readonly string[];
};

export type DescriptionSessionRef = {
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly jsonlPath: string;
};

export type DescriptionBranchSnapshot = {
  readonly updatedAt: string;
  readonly questionnairePath?: string;
  readonly draftPath?: string;
  readonly finalPath?: string;
  readonly primarySession?: DescriptionSessionRef;
};

export type WorkflowStateSnapshot = {
  readonly workspaceSlug: string;
  readonly updatedAt: string;
  readonly stages: Record<WorkflowStageId, WorkflowStageStatus>;
  readonly continuity: WorkflowContinuitySnapshot;
  readonly lastActive: WorkflowLastActiveSnapshot | null;
  readonly description: DescriptionBranchSnapshot | null;
  readonly gating: WorkflowGatingSnapshot;
  readonly technicalStageRewriteBoundary?: TechnicalStageRewriteBoundarySnapshot | null;
  readonly managedWorkflowPreview?: ManagedWorkflowPreviewSnapshot | null;
  readonly diagramModulesProgress?: DiagramModulesProgressSnapshot | null;
  readonly applicationSkeletonProgress?: Record<string, unknown> | null;
  readonly qualityGatesProgress?: Record<string, unknown> | null;
  readonly developmentTree?: DevelopmentTreeSnapshot | null;
  readonly userGateCursor?: Record<string, unknown> | null;
};

type WorkflowStateResponse = {
  readonly state: unknown;
  readonly continuity?: unknown;
  readonly lastActive?: unknown;
  readonly description?: unknown;
  readonly gating?: unknown;
  readonly technicalStageRewriteBoundary?: unknown;
  readonly managedWorkflowPreview?: unknown;
  readonly diagramModulesProgress?: unknown;
  readonly applicationSkeletonProgress?: unknown;
  readonly qualityGatesProgress?: unknown;
  readonly developmentTree?: unknown;
  readonly userGateCursor?: unknown;
};

const STAGE_ORDER: readonly WorkflowStageId[] = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
];

const DEFAULT_STAGE_STATUS: WorkflowStageStatus = "idle";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isWorkflowStageStatus = (value: unknown): value is WorkflowStageStatus =>
  value === "idle" ||
  value === "in_progress" ||
  value === "completed" ||
  value === "invalid" ||
    value === "outdated";

const isContinuityStageId = (value: unknown): value is ContinuityStageId =>
  value === "unknown" ||
  (typeof value === "string" && value.startsWith("development_tree/")) ||
  (typeof value === "string" &&
    STAGE_ORDER.includes(value as WorkflowStageId));

const buildDefaultStages = (): Record<WorkflowStageId, WorkflowStageStatus> =>
  STAGE_ORDER.reduce<Record<WorkflowStageId, WorkflowStageStatus>>(
    (accumulator, stage) => {
      accumulator[stage] = DEFAULT_STAGE_STATUS;
      return accumulator;
    },
    {} as Record<WorkflowStageId, WorkflowStageStatus>
  );

const parseContinuitySegment = (
  payload: unknown
): ContinuitySegmentSnapshot | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const sessionId = readNonEmptyString(payload.sessionId);
  const providerId = readNonEmptyString(payload.providerId);
  const providerSessionId = readNonEmptyString(payload.providerSessionId);
  const createdAt = readNonEmptyString(payload.createdAt);
  if (!(sessionId && providerId && providerSessionId && createdAt)) {
    return null;
  }
  const handoffReportPath = readNonEmptyString(payload.handoffReportPath);
  return {
    sessionId,
    providerId,
    providerSessionId,
    createdAt,
    handoffReportPath: handoffReportPath ?? undefined,
  };
};

const parseContinuityChain = (
  payload: unknown
): ContinuityChainSnapshot | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const rootSessionId = readNonEmptyString(payload.rootSessionId);
  const workspaceSlug = readNonEmptyString(payload.workspaceSlug);
  const stageValue = readNonEmptyString(payload.stage);
  const stage = isContinuityStageId(stageValue) ? stageValue : "unknown";
  const updatedAt = readNonEmptyString(payload.updatedAt);
  if (!(rootSessionId && workspaceSlug && updatedAt)) {
    return null;
  }
  const segmentsPayload = Array.isArray(payload.segments)
    ? payload.segments
    : [];
  const segments = segmentsPayload
    .map(parseContinuitySegment)
    .filter((segment): segment is ContinuitySegmentSnapshot => Boolean(segment));
  return {
    rootSessionId,
    workspaceSlug,
    stage,
    segments,
    updatedAt,
  };
};

const parseContinuitySnapshot = (
  payload: unknown
): WorkflowContinuitySnapshot => {
  if (!isRecord(payload)) {
    return { chains: [] };
  }
  const chainsPayload = Array.isArray(payload.chains) ? payload.chains : [];
  const chains = chainsPayload
    .map(parseContinuityChain)
    .filter((chain): chain is ContinuityChainSnapshot => Boolean(chain));
  return { chains };
};

const parseLastActiveSnapshot = (
  payload: unknown
): WorkflowLastActiveSnapshot | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const stageValue = readNonEmptyString(payload.stage);
  const updatedAt = readNonEmptyString(payload.updatedAt);
  if (!(stageValue && updatedAt && STAGE_ORDER.includes(stageValue as WorkflowStageId))) {
    return null;
  }
  return {
    artifactPath: readNonEmptyString(payload.artifactPath) ?? undefined,
    stage: stageValue as WorkflowStageId,
    updatedAt,
  };
};

const parseDescriptionSessionRef = (
  payload: unknown
): DescriptionSessionRef | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const providerId = readNonEmptyString(payload.providerId);
  const providerSessionId = readNonEmptyString(payload.providerSessionId);
  const jsonlPath = readNonEmptyString(payload.jsonlPath);
  if (!(providerId && providerSessionId && jsonlPath)) {
    return null;
  }
  return { providerId, providerSessionId, jsonlPath };
};

const parseDescriptionBranch = (
  payload: unknown
): DescriptionBranchSnapshot | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const updatedAt = readNonEmptyString(payload.updatedAt);
  if (!updatedAt) {
    return null;
  }
  const questionnairePath =
    readNonEmptyString(payload.questionnairePath) ?? undefined;
  const draftPath = readNonEmptyString(payload.draftPath) ?? undefined;
  const finalPath = readNonEmptyString(payload.finalPath) ?? undefined;
  const primarySession = parseDescriptionSessionRef(payload.primarySession);
  return {
    updatedAt,
    questionnairePath,
    draftPath,
    finalPath,
    primarySession: primarySession ?? undefined,
  };
};

const parseStringArray = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const parseTechnicalStageRewriteBoundary = (
  payload: unknown
): TechnicalStageRewriteBoundarySnapshot | null => {
  if (!isRecord(payload) || typeof payload.active !== "boolean") {
    return null;
  }
  return {
    active: payload.active,
    blockers: parseStringArray(payload.blockers),
    readOnlyStages: parseStringArray(payload.readOnlyStages),
  };
};

const parseManagedWorkflowPreviewStage = (
  payload: unknown
): ManagedWorkflowPreviewStageSnapshot | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const controllerId = readNonEmptyString(payload.controllerId);
  const displayName = readNonEmptyString(payload.displayName);
  if (!(controllerId && displayName)) {
    return null;
  }
  const startPolicy =
    payload.startPolicy === "provider_direct" ||
    payload.startPolicy === "managed_dispatch"
      ? payload.startPolicy
      : "core_preview_boundary";
  return {
    controllerId,
    currentPhase: isRecord(payload.currentPhase) ? payload.currentPhase : null,
    displayName,
    phaseTypes: parseStringArray(payload.phaseTypes),
    runStatus: readNonEmptyString(payload.runStatus) ?? undefined,
    startPolicy,
  };
};

const parseManagedWorkflowPreview = (
  payload: unknown
): ManagedWorkflowPreviewSnapshot | null => {
  if (!isRecord(payload) || payload.active !== true || payload.mode !== "preview") {
    return null;
  }
  const reason = readNonEmptyString(payload.reason);
  const stages = Array.isArray(payload.stages)
    ? payload.stages
        .map(parseManagedWorkflowPreviewStage)
        .filter((stage): stage is ManagedWorkflowPreviewStageSnapshot =>
          Boolean(stage)
        )
    : [];
  return reason
    ? {
        active: true,
        mode: "preview",
        readOnlyStages: parseStringArray(payload.readOnlyStages),
        reason,
        stages,
      }
    : null;
};

const parseWorkflowState = (
  payload: unknown
): WorkflowStateSnapshot | null => {
  const response = isRecord(payload) ? (payload as WorkflowStateResponse) : null;
  const state = response && "state" in response ? response.state : payload;
  if (!isRecord(state)) {
    return null;
  }
  const workspaceSlug = readNonEmptyString(state.workspaceSlug);
  if (!workspaceSlug) {
    return null;
  }
  const updatedAt = readNonEmptyString(state.updatedAt) ?? new Date().toISOString();
  const stagesPayload = state.stages;
  const stages = buildDefaultStages();
  const continuity = parseContinuitySnapshot(response?.continuity);
  const lastActive = parseLastActiveSnapshot(response?.lastActive);
  const description = parseDescriptionBranch(response?.description);
  const gating = parseWorkflowGating({ payload: response?.gating, stageOrder: STAGE_ORDER });
  const technicalStageRewriteBoundary = parseTechnicalStageRewriteBoundary(
    response?.technicalStageRewriteBoundary
  );
  const managedWorkflowPreview = parseManagedWorkflowPreview(
    response?.managedWorkflowPreview
  );
  const diagramModulesProgress = isRecord(response?.diagramModulesProgress)
    ? (response.diagramModulesProgress as DiagramModulesProgressSnapshot)
    : null;
  const applicationSkeletonProgress = isRecord(
    response?.applicationSkeletonProgress
  )
    ? response.applicationSkeletonProgress
    : null;
  const qualityGatesProgress = isRecord(response?.qualityGatesProgress)
    ? response.qualityGatesProgress
    : null;
  const developmentTree = parseDevelopmentTreeSnapshot(
    response?.developmentTree
  );
  const userGateCursor = isRecord(response?.userGateCursor)
    ? response.userGateCursor
    : null;
  if (isRecord(stagesPayload)) {
    for (const stage of STAGE_ORDER) {
      const stageState = stagesPayload[stage];
      if (!isRecord(stageState)) {
        continue;
      }
      const status = stageState.status;
      if (isWorkflowStageStatus(status)) {
        stages[stage] = status;
      }
    }
  }

  return {
    workspaceSlug,
    updatedAt,
    stages,
    continuity,
    lastActive,
    description,
    gating,
    technicalStageRewriteBoundary,
    managedWorkflowPreview,
    diagramModulesProgress,
    applicationSkeletonProgress,
    qualityGatesProgress,
    developmentTree,
    userGateCursor,
  };
};

const joinUrl = (baseUrl: string, path: string): string =>
  baseUrl.endsWith("/") ? `${baseUrl.slice(0, -1)}${path}` : `${baseUrl}${path}`;

export const fetchWorkflowState = async (params: {
  readonly httpUrl: string;
  readonly workspaceSlug: string;
  readonly workspacePath?: string;
}): Promise<WorkflowStateSnapshot | null> => {
  try {
    const response = await fetch(
      joinUrl(
        params.httpUrl,
        `${WORKFLOW_STATE_ENDPOINT}?${buildWorkflowStateQuery({
          workspaceSlug: params.workspaceSlug,
          workspacePath: params.workspacePath,
        })}`
      ),
      { method: "GET" }
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as unknown;
    const parsed = parseWorkflowState(payload);
    if (!parsed) {
      return null;
    }
    return parsed.workspaceSlug === params.workspaceSlug ? parsed : null;
  } catch {
    return null;
  }
};

export const toWorkflowWorkspaceSlug = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return slug.length > 0 ? slug : "workspace";
};

export const WORKFLOW_STAGE_ORDER = STAGE_ORDER;
