import type { ProviderStackId } from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type { SessionMessage, SessionRecord } from "../../../../types/session";
import { providerIdSet } from "../../../ui/src/session/helpers";
import type {
  WorkflowStageId,
  WorkflowStateSnapshot,
} from "../../services/workflow-state-client";

export type DialogOpenIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly sessionKind: "collector" | null;
  readonly runSlug: string | null;
};

export type DialogIndexEntry = {
  readonly stage: string;
  readonly rootSessionId: string;
  readonly dialogId: string;
  readonly updatedAt: string;
  readonly latestSessionId: string | null;
  readonly providerId: string | null;
  readonly providerSessionId: string | null;
};

type DialogHistoryRecord = {
  readonly messageId: string;
  readonly role: "system" | "user" | "assistant" | "thinking";
  readonly content: string;
  readonly timestamp: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const WORKFLOW_STAGE_ORDER: readonly WorkflowStageId[] = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "diagram_facades",
];

const isWorkflowStageId = (value: string | null): value is WorkflowStageId =>
  value !== null && WORKFLOW_STAGE_ORDER.includes(value as WorkflowStageId);

const resolveStageIndex = (stage: WorkflowStageId): number =>
  WORKFLOW_STAGE_ORDER.indexOf(stage);

const hasContinuitySegmentsForStage = (
  workflowState: WorkflowStateSnapshot,
  stage: WorkflowStageId
): boolean =>
  workflowState.continuity.chains.some(
    (chain) => chain.stage === stage && chain.segments.length > 0
  );

const hasDescriptionActivity = (
  workflowState: WorkflowStateSnapshot
): boolean =>
  Boolean(
    workflowState.description?.questionnairePath ||
      workflowState.description?.draftPath ||
      workflowState.description?.finalPath ||
      workflowState.description?.collectorSession ||
      workflowState.description?.session ||
      workflowState.stages.description !== "idle" ||
      hasContinuitySegmentsForStage(workflowState, "description")
  );

const hasStageActivity = (
  workflowState: WorkflowStateSnapshot,
  stage: WorkflowStageId
): boolean =>
  stage === "description"
    ? hasDescriptionActivity(workflowState)
    : workflowState.stages[stage] !== "idle" ||
      hasContinuitySegmentsForStage(workflowState, stage);

export const resolveLatestWorkflowStage = (
  workflowState: WorkflowStateSnapshot | null
): WorkflowStageId | null => {
  if (!workflowState) {
    return null;
  }
  for (let index = WORKFLOW_STAGE_ORDER.length - 1; index >= 0; index -= 1) {
    const stage = WORKFLOW_STAGE_ORDER[index];
    if (stage && hasStageActivity(workflowState, stage)) {
      return stage;
    }
  }
  return null;
};

export const shouldDiscardRestoredDialogIntent = (options: {
  readonly intent: DialogOpenIntent;
  readonly workflowState: WorkflowStateSnapshot | null;
}): boolean => {
  if (!isWorkflowStageId(options.intent.stage)) {
    return false;
  }
  const latestStage = resolveLatestWorkflowStage(options.workflowState);
  if (!latestStage) {
    return false;
  }
  return resolveStageIndex(latestStage) > resolveStageIndex(options.intent.stage);
};

export const sanitizeDialogIndexEntry = (value: unknown): DialogIndexEntry | null => {
  if (!isRecord(value)) {
    return null;
  }
  if (
    typeof value.stage !== "string" ||
    typeof value.rootSessionId !== "string" ||
    typeof value.dialogId !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }
  const latestSessionId =
    value.latestSessionId === null || typeof value.latestSessionId === "string"
      ? (value.latestSessionId as string | null)
      : null;
  const providerId =
    value.providerId === null || typeof value.providerId === "string"
      ? (value.providerId as string | null)
      : null;
  const providerSessionId =
    value.providerSessionId === null || typeof value.providerSessionId === "string"
      ? (value.providerSessionId as string | null)
      : null;
  return {
    stage: value.stage,
    rootSessionId: value.rootSessionId,
    dialogId: value.dialogId,
    updatedAt: value.updatedAt,
    latestSessionId,
    providerId,
    providerSessionId,
  };
};

const sanitizeDialogHistoryRecord = (value: unknown): DialogHistoryRecord | null => {
  if (!isRecord(value)) {
    return null;
  }
  if (
    typeof value.messageId !== "string" ||
    typeof value.content !== "string" ||
    typeof value.timestamp !== "string"
  ) {
    return null;
  }
  const role = value.role;
  if (
    role !== "system" &&
    role !== "user" &&
    role !== "assistant" &&
    role !== "thinking"
  ) {
    return null;
  }
  return {
    messageId: value.messageId,
    role,
    content: value.content,
    timestamp: value.timestamp,
  };
};

export const resolveProviderId = (providerId: string | null): ProviderStackId | null => {
  if (!providerId) {
    return null;
  }
  return providerIdSet.has(providerId as ProviderStackId)
    ? (providerId as ProviderStackId)
    : null;
};

export const resolveDialogMatch = (options: {
  readonly intent: DialogOpenIntent;
  readonly dialogs: readonly DialogIndexEntry[];
}): DialogIndexEntry | null => {
  const stage = options.intent.stage;
  const providerId = options.intent.providerId;
  const providerSessionId = options.intent.providerSessionId;
  const candidates = options.dialogs.filter(
    (entry) =>
      entry.providerId === providerId &&
      (stage ? entry.stage === stage : true)
  );
  if (candidates.length === 0) {
    return null;
  }
  if (providerSessionId) {
    const exact = candidates.find(
      (entry) => entry.providerSessionId === providerSessionId
    );
    if (exact) {
      return exact;
    }
  }
  return candidates.reduce((latest, current) =>
    current.updatedAt > latest.updatedAt ? current : latest
  );
};

export const buildProviderLabels = (providerId: ProviderStackId | null) =>
  new Map<ProviderStackId, string>(
    providerId ? [[providerId, getDefaultProviderTitle(providerId)]] : []
  );

export const buildDialogSessionRecord = (options: {
  readonly dialogId: string;
  readonly runtimeSessionId?: string | null;
  readonly providerId: ProviderStackId | null;
  readonly providerSessionId: string | null;
  readonly intent: DialogOpenIntent;
}): SessionRecord => ({
  id: options.runtimeSessionId ?? options.dialogId,
  title: `Dialog ${options.dialogId.slice(0, 8)}`,
  providerIds: options.providerId ? [options.providerId] : [],
  workspacePath: options.intent.workspacePath,
  initiativeSlug: options.intent.initiativeSlug,
  stage: options.intent.stage ?? null,
  runSlug: options.intent.runSlug ?? null,
  sessionKind: options.intent.sessionKind,
  continuationParentId: null,
  continuationIndex: null,
  createdAt: Date.now(),
  binding: {
    providerSessionId: options.providerSessionId,
    status: "ready",
  },
});

export const convertHistoryToMessages = (records: readonly unknown[]): SessionMessage[] => {
  const result: SessionMessage[] = [];
  for (const record of records) {
    const sanitized = sanitizeDialogHistoryRecord(record);
    if (!sanitized) {
      continue;
    }
    const createdAt = Number.isNaN(Date.parse(sanitized.timestamp))
      ? Date.now()
      : Date.parse(sanitized.timestamp);
    const stableId = `${sanitized.timestamp}::${sanitized.role}::${sanitized.messageId}`;
    result.push({
      id: stableId,
      role: sanitized.role,
      content: sanitized.content,
      createdAt,
    });
  }
  result.sort((a, b) => a.createdAt - b.createdAt);
  return result;
};

export const createDialogRequestId = (): string =>
  typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `pm-dialog-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const readDialogString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export const readDialogCursor = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : null;

export const createDialogSystemMessage = (content: string): SessionMessage => ({
  id: `system-${Date.now()}`,
  role: "system",
  content,
  createdAt: Date.now(),
});
