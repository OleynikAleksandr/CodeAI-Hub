import type { ProviderStackId } from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type {
  SessionMessage,
  SessionModelBindingInfo,
  SessionRecord,
} from "../../../../types/session";
import type { WorkbenchOutgoingMessage } from "../../services/workbench-bridge-types";
import { providerIdSet } from "../../../ui/src/session/helpers";

export type DialogOpenIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly targetDialogId?: string | null;
  readonly targetRootSessionId?: string | null;
  readonly targetSessionId?: string | null;
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
  readonly modelBinding: SessionModelBindingInfo | null;
  readonly providerId: string | null;
  readonly providerSessionId: string | null;
  readonly worktreePath?: string;
};

type DialogHistoryRecord = {
  readonly messageId: string;
  readonly role: "system" | "user" | "assistant" | "thinking";
  readonly content: string;
  readonly localizedContent?: string;
  readonly timestamp: string;
  readonly tag?: string;
  readonly translationState?: SessionMessage["translationState"];
};

export interface SpeechStatePayload {
  readonly messageId: string | null;
  readonly sessionId: string | null;
  readonly status: string;
}

export interface DialogSpeechRequest {
  readonly messageId: string;
  readonly providerId?: string | null;
  readonly sessionId: string;
  readonly text: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const sanitizeDialogModelBinding = (
  value: unknown
): SessionModelBindingInfo | null => {
  if (!isRecord(value)) {
    return null;
  }
  const providerId = resolveProviderId(readOptionalString(value.providerId) ?? null);
  const modelId = readOptionalString(value.modelId);
  if (!(providerId && modelId)) {
    return null;
  }
  const baseModelId = readOptionalString(value.baseModelId);
  const reasoningEffort = readOptionalString(value.reasoningEffort);
  const source = readOptionalString(value.source);
  const thinkingLevel = readOptionalString(value.thinkingLevel);
  const boundAt = readOptionalString(value.boundAt);
  const updatedAt = readOptionalString(value.updatedAt);
  return {
    providerId,
    modelId,
    ...(baseModelId ? { baseModelId } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
    ...(source ? { source } : {}),
    ...(typeof value.thinkingEnabled === "boolean"
      ? { thinkingEnabled: value.thinkingEnabled }
      : {}),
    ...(thinkingLevel ? { thinkingLevel } : {}),
    ...(boundAt ? { boundAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
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
  const modelBinding = sanitizeDialogModelBinding(value.modelBinding);
  const worktreePath = readOptionalString(value.worktreePath);
  return {
    stage: value.stage,
    rootSessionId: value.rootSessionId,
    dialogId: value.dialogId,
    updatedAt: value.updatedAt,
    latestSessionId,
    modelBinding,
    providerId,
    providerSessionId,
    ...(worktreePath ? { worktreePath } : {}),
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
  const tag = typeof value.tag === "string" ? value.tag : undefined;
  const localizedContent =
    typeof value.localizedContent === "string" &&
    value.localizedContent.trim().length > 0
      ? value.localizedContent
      : undefined;
  const translationState =
    value.translationState === "pending" ? value.translationState : undefined;
  return {
    messageId: value.messageId,
    role,
    content: value.content,
    timestamp: value.timestamp,
    ...(localizedContent ? { localizedContent } : {}),
    ...(tag ? { tag } : {}),
    ...(translationState ? { translationState } : {}),
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
  const targeted = options.dialogs.find(
    (entry) =>
      (options.intent.targetDialogId &&
        entry.dialogId === options.intent.targetDialogId) ||
      (options.intent.targetRootSessionId &&
        entry.rootSessionId === options.intent.targetRootSessionId) ||
      (options.intent.targetSessionId &&
        (entry.latestSessionId === options.intent.targetSessionId ||
          entry.rootSessionId === options.intent.targetSessionId ||
          entry.dialogId === options.intent.targetSessionId))
  );
  if (targeted) {
    return targeted;
  }
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
  readonly modelBinding?: SessionModelBindingInfo | null;
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
  modelBinding: options.modelBinding ?? null,
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
    result.push({
      id: sanitized.messageId,
      role: sanitized.role,
      content: sanitized.content,
      createdAt,
      ...(sanitized.localizedContent
        ? { localizedContent: sanitized.localizedContent }
        : {}),
      ...(sanitized.tag ? { tag: sanitized.tag } : {}),
      ...(sanitized.translationState
        ? { translationState: sanitized.translationState }
        : {}),
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

export const resolveActiveSpeechMessageId = (
  state: SpeechStatePayload | null
): string | null =>
  state?.status === "speaking" ||
  state?.status === "starting" ||
  state?.status === "stopping"
    ? state.messageId
    : null;

export const buildDialogSpeechWorkbenchMessage = (options: {
  readonly activeSpeechMessageId: string | null;
  readonly rate: number;
  readonly request: DialogSpeechRequest;
}): WorkbenchOutgoingMessage => {
  if (options.activeSpeechMessageId === options.request.messageId) {
    return {
      type: "session:speech:stop",
      payload: {
        messageId: options.request.messageId,
        sessionId: options.request.sessionId,
      },
    };
  }
  return {
    type: "session:speech:speak-message",
    payload: {
      ...options.request,
      rate: options.rate,
    },
  };
};
