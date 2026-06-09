import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";
import type { CoreBridgeSessionMessageTranslationPayload } from "../../../ui/src/core-bridge/types";
import type { Settings } from "../../../ui/src/components/settings/settings-state-model";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";
import { buildTokenDebugSummaryFromMessages } from "./dialog-segment-meta";
import {
  buildDialogRestoreRequestKey,
  createDialogBootstrapSnapshots,
  shouldCreateRuntimeRestore,
} from "./dialog-session-bootstrap";
import { appendDedupedSessionMessageToSnapshots } from "./session-message-dedupe";
import {
  buildDialogSessionRecord,
  convertHistoryToMessages,
  createDialogSystemMessage,
  readDialogCursor,
  readDialogString,
  resolveDialogMatch,
  resolveProviderId,
  sanitizeDialogIndexEntry,
  type DialogIndexEntry,
  type DialogOpenIntent,
} from "./project-manager-dialog-session-view-helpers";
import { resolveRuntimeSessionFromWorkspaceSnapshot } from "./dialog-runtime-session-resolver";
import { useDiagramModulesOrchestration } from "./use-diagram-modules-orchestration";

type DialogHistoryRequestOptions = { readonly force?: boolean } | null | undefined;

type RequestDialogList = (intent: DialogOpenIntent) => void;
type RequestDialogHistory = (
  intent: DialogOpenIntent,
  dialogId: string,
  cursor?: number | null,
  options?: DialogHistoryRequestOptions
) => void;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sanitizeDialogMessageTranslationPayload = (
  payload: unknown
): {
  readonly dialogId: string;
  readonly translation: CoreBridgeSessionMessageTranslationPayload;
} | null => {
  if (!isRecord(payload) || typeof payload.dialogId !== "string") {
    return null;
  }
  const translation = payload.translation;
  if (
    !isRecord(translation) ||
    typeof translation.sessionId !== "string" ||
    typeof translation.messageId !== "string" ||
    typeof translation.localizedContent !== "string" ||
    typeof translation.sourceHash !== "string" ||
    typeof translation.targetLanguage !== "string"
  ) {
    return null;
  }
  const localizedContent = translation.localizedContent.trim();
  if (localizedContent.length === 0) {
    return null;
  }
  return {
    dialogId: payload.dialogId,
    translation: {
      sessionId: translation.sessionId,
      messageId: translation.messageId,
      localizedContent,
      sourceHash: translation.sourceHash,
      targetLanguage: translation.targetLanguage,
    },
  };
};

export const shouldSuppressIdleDialogRestoreRefresh = (options: {
  readonly latestSnapshot: WorkspaceSnapshotPushPayload | null;
  readonly workspacePath: string;
  readonly dialogId: string;
  readonly providerSessionId: string | null;
  readonly preferredSessionId: string;
}): boolean => {
  if (
    !options.latestSnapshot ||
    options.latestSnapshot.workspaceRoot !== options.workspacePath ||
    !options.providerSessionId
  ) {
    return false;
  }

  return !resolveRuntimeSessionFromWorkspaceSnapshot({
    payload: options.latestSnapshot,
    preferredSessionId: options.preferredSessionId,
    dialogId: options.dialogId,
    providerSessionId: options.providerSessionId,
  }).hasRuntimeSession;
};

export const useProjectManagerDialogCoreEvents = (options: {
  readonly applyMessageTranslation: (
    payload: CoreBridgeSessionMessageTranslationPayload
  ) => void;
  readonly requestDialogList: RequestDialogList;
  readonly requestDialogHistory: RequestDialogHistory;
  readonly latestWorkspaceSnapshotRef: MutableRefObject<WorkspaceSnapshotPushPayload | null>;
  readonly settingsRef: MutableRefObject<Settings | null>;
  readonly sessionRef: MutableRefObject<SessionRecord | null>;
  readonly pendingIntentRef: MutableRefObject<DialogOpenIntent | null>;
  readonly dialogIdRef: MutableRefObject<string | null>;
  readonly loadedDialogIdsRef: MutableRefObject<Set<string>>;
  readonly dialogCursorRef: MutableRefObject<Map<string, number>>;
  readonly pendingHistoryCursorRef: MutableRefObject<Map<string, number>>;
  readonly queuedHistoryRefreshRef: MutableRefObject<Set<string>>;
  readonly restoreRequestInFlightRef: MutableRefObject<Map<string, number>>;
  readonly setSession: Dispatch<SetStateAction<SessionRecord | null>>;
  readonly setSnapshots: Dispatch<SetStateAction<SessionSnapshots>>;
  readonly setTokenDebugSummaryOverride: Dispatch<SetStateAction<string | undefined>>;
}) => {
  useDiagramModulesOrchestration(options);
  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type === "dialog:list:result") {
        const payload = message.payload as Record<string, unknown> | null;
        const workspaceSlug = readDialogString(payload?.workspaceSlug);
        const dialogs = payload?.dialogs;
        if (workspaceSlug === null || !Array.isArray(dialogs)) {
          return;
        }
        const parsed: DialogIndexEntry[] = [];
        for (const entry of dialogs) {
          const sanitized = sanitizeDialogIndexEntry(entry);
          if (sanitized) {
            parsed.push(sanitized);
          }
        }
        const intent = options.pendingIntentRef.current;
        if (!intent || intent.workspaceSlug !== workspaceSlug) {
          return;
        }
        const match = resolveDialogMatch({ intent, dialogs: parsed });
        if (!match) {
          return;
        }
        // Skip re-bootstrap if this dialog was already matched and
        // bootstrapped — retry dialog:list:result responses must not
        // overwrite messages that were already loaded by the first
        // dialog:history:result.
        if (options.dialogIdRef.current === match.dialogId && options.sessionRef.current) {
          return;
        }
        const providerId =
          resolveProviderId(match.providerId) ?? resolveProviderId(intent.providerId);
        const preferredRuntimeSessionId =
          match.latestSessionId ?? match.rootSessionId;
        const dialogWorkspacePath = match.worktreePath ?? intent.workspacePath;
        const dialogIntent = { ...intent, workspacePath: dialogWorkspacePath };
        options.pendingIntentRef.current = dialogIntent;
        const latestSnapshot = options.latestWorkspaceSnapshotRef.current;
        const runtimeSession = resolveRuntimeSessionFromWorkspaceSnapshot({
          payload:
            latestSnapshot?.workspaceRoot === dialogWorkspacePath
              ? latestSnapshot
              : null,
          preferredSessionId: preferredRuntimeSessionId,
          dialogId: match.dialogId,
          providerSessionId: match.providerSessionId,
        });
        const shouldKeepIdleDialogBootstrapReady =
          shouldSuppressIdleDialogRestoreRefresh({
            latestSnapshot,
            workspacePath: dialogWorkspacePath,
            dialogId: match.dialogId,
            providerSessionId: match.providerSessionId,
            preferredSessionId: preferredRuntimeSessionId,
          });
        const bootstrapSession = buildDialogSessionRecord({
          runtimeSessionId: runtimeSession.runtimeSessionId,
          dialogId: match.dialogId,
          modelBinding: match.modelBinding,
          providerId,
          providerSessionId: match.providerSessionId,
          intent: dialogIntent,
        });
        const nextSession =
          runtimeSession.hasRuntimeSession || shouldKeepIdleDialogBootstrapReady
          ? bootstrapSession
          : {
              ...bootstrapSession,
              binding: {
                ...bootstrapSession.binding,
                status: "pending" as const,
              },
            };
        const restoreKey = buildDialogRestoreRequestKey({
          workspacePath: dialogWorkspacePath,
          dialogId: match.dialogId,
          providerSessionId: match.providerSessionId,
        });
        const shouldRequestRestore =
          !shouldKeepIdleDialogBootstrapReady &&
          match.providerSessionId &&
          shouldCreateRuntimeRestore({
            requests: options.restoreRequestInFlightRef.current,
            restoreKey,
            hasRuntimeSession: runtimeSession.hasRuntimeSession,
            now: Date.now(),
          });
        api.logDiagnostic({
          channel: "usage-limits",
          event: "pm.dialog.bootstrap.resolved",
          context: {
            dialogId: match.dialogId,
            hasRuntimeSession: runtimeSession.hasRuntimeSession,
            intentProviderId: intent.providerId,
            matchedProviderId: match.providerId,
            matchedProviderSessionId: match.providerSessionId,
            preferredRuntimeSessionId,
            resolvedRuntimeSessionId: runtimeSession.runtimeSessionId,
            seededProviderId: providerId ?? intent.providerId,
            restoreRequested: Boolean(shouldRequestRestore),
            stage: intent.stage ?? match.stage,
            workspacePath: dialogWorkspacePath,
          },
        });
        if (shouldRequestRestore) {
          api.createSession({
            providerId: providerId ?? intent.providerId,
            providerSessionId: match.providerSessionId,
            workspacePath: dialogWorkspacePath,
            initiativeSlug: intent.initiativeSlug ?? intent.workspaceSlug,
            stage: intent.stage ?? match.stage,
            sessionKind: intent.sessionKind,
            runSlug: intent.runSlug,
          });
        }
        options.dialogIdRef.current = match.dialogId;
        options.sessionRef.current = nextSession;
        options.setSession(nextSession);
        options.setSnapshots((previous) =>
          createDialogBootstrapSnapshots({
            previous,
            nextSession,
            providerId,
            settings: options.settingsRef.current,
            latestSnapshot: options.latestWorkspaceSnapshotRef.current,
          })
        );
        if (providerId && match.providerSessionId) {
          api.refreshUsageLimits({
            lifecycleTrigger: "dialog_opened",
            providerId,
            providerSessionId: match.providerSessionId,
            sessionId: nextSession.id,
          });
        }
        options.requestDialogHistory(dialogIntent, match.dialogId);
        return;
      }

      if (message.type === "dialog:history:result") {
        const payload = message.payload as Record<string, unknown> | null;
        const workspaceSlug = readDialogString(payload?.workspaceSlug);
        const dialogId = readDialogString(payload?.dialogId);
        const lastCursor = readDialogCursor(payload?.lastCursor);
        const messages = payload?.messages;
        if (workspaceSlug === null || dialogId === null || !Array.isArray(messages)) {
          return;
        }
        const intent = options.pendingIntentRef.current;
        const currentDialogId = options.dialogIdRef.current;
        const currentSession = options.sessionRef.current;
        if (!intent || intent.workspaceSlug !== workspaceSlug) {
          return;
        }
        if (currentDialogId && currentDialogId !== dialogId) {
          return;
        }
        if (!currentSession) {
          return;
        }
        const requestedCursor = options.pendingHistoryCursorRef.current.get(dialogId) ?? 0;
        options.pendingHistoryCursorRef.current.delete(dialogId);
        const isTail = requestedCursor > 0;
        if (lastCursor !== null) {
          options.dialogCursorRef.current.set(dialogId, lastCursor);
        }

        const normalizedMessages = convertHistoryToMessages(messages);
        const summary = buildTokenDebugSummaryFromMessages(normalizedMessages);
        if (summary) {
          options.setTokenDebugSummaryOverride(summary);
        } else if (!isTail) {
          options.setTokenDebugSummaryOverride(undefined);
        }
        if (!isTail) {
          options.setSnapshots((previous) => {
            let updated = previous;
            for (const normalized of normalizedMessages) {
              updated = appendDedupedSessionMessageToSnapshots(updated, {
                sessionId: currentSession.id,
                message: normalized,
              });
            }
            return updated;
          });
        } else {
          options.setSnapshots((previous) => {
            let updated = previous;
            for (const normalized of normalizedMessages) {
              updated = appendDedupedSessionMessageToSnapshots(updated, {
                sessionId: currentSession.id,
                message: normalized,
              });
            }
            return updated;
          });
        }
        if (options.queuedHistoryRefreshRef.current.has(dialogId)) {
          options.queuedHistoryRefreshRef.current.delete(dialogId);
          const cursor = options.dialogCursorRef.current.get(dialogId) ?? 0;
          options.requestDialogHistory(intent, dialogId, cursor, { force: cursor <= 0 });
        }
        return;
      }

      if (message.type === "dialog:send:ack") {
        const payload = message.payload as Record<string, unknown> | null;
        const workspaceSlug = readDialogString(payload?.workspaceSlug);
        const dialogId = readDialogString(payload?.dialogId);
        if (workspaceSlug === null || dialogId === null) {
          return;
        }
        const intent = options.pendingIntentRef.current;
        const currentDialogId = options.dialogIdRef.current;
        if (!intent || intent.workspaceSlug !== workspaceSlug) {
          return;
        }
        if (currentDialogId && currentDialogId !== dialogId) {
          return;
        }
        if (payload?.status === "sent") {
          const cursor = options.dialogCursorRef.current.get(dialogId) ?? 0;
          options.requestDialogHistory(intent, dialogId, cursor, { force: cursor <= 0 });
          options.requestDialogList(intent);
          return;
        }

        if (payload?.status === "rejected") {
          const errorCopy =
            typeof payload?.error === "string" && payload.error.trim().length > 0
              ? payload.error
              : "Dialog send rejected.";
          const currentSessionId = options.sessionRef.current?.id ?? dialogId;
          options.setSnapshots((previous) =>
            appendDedupedSessionMessageToSnapshots(previous, {
              sessionId: currentSessionId,
              message: createDialogSystemMessage(errorCopy),
            })
          );
        }
        return;
      }

      if (message.type === "dialog:message") {
        const payload = message.payload as Record<string, unknown> | null;
        const incomingDialogId = readDialogString(payload?.dialogId);
        if (incomingDialogId === null) {
          return;
        }
        const currentSession = options.sessionRef.current;
        const currentDialogId = options.dialogIdRef.current;
        if (!currentSession || !currentDialogId || incomingDialogId !== currentDialogId) {
          return;
        }
        const intent = options.pendingIntentRef.current;
        if (!intent) {
          return;
        }
        const incomingSessionId = readDialogString(payload?.sessionId);
        if (
          currentSession.id === currentDialogId &&
          currentSession.binding.status === "ready" &&
          shouldSuppressIdleDialogRestoreRefresh({
            latestSnapshot: options.latestWorkspaceSnapshotRef.current,
            workspacePath: intent.workspacePath,
            dialogId: currentDialogId,
            providerSessionId: currentSession.binding.providerSessionId,
            preferredSessionId: incomingSessionId ?? currentSession.id,
          })
        ) {
          return;
        }
        const cursor = options.dialogCursorRef.current.get(incomingDialogId) ?? 0;
        options.requestDialogHistory(intent, incomingDialogId, cursor, { force: cursor <= 0 });
        options.requestDialogList(intent);
        return;
      }

      if (message.type === "dialog:message_translation") {
        const payload = sanitizeDialogMessageTranslationPayload(message.payload);
        if (!payload) {
          return;
        }
        const currentSession = options.sessionRef.current;
        const currentDialogId = options.dialogIdRef.current;
        if (!currentSession || !currentDialogId || payload.dialogId !== currentDialogId) {
          return;
        }
        options.applyMessageTranslation({
          ...payload.translation,
          sessionId: currentSession.id,
        });
        return;
      }

      if (message.type === "core:state") {
        const intent = options.pendingIntentRef.current;
        const currentDialogId = options.dialogIdRef.current;
        const currentSession = options.sessionRef.current;
        if (!intent || !currentSession || !currentDialogId) {
          return;
        }
        // Core restart while PM is open: replay history again to repopulate UI.
        options.loadedDialogIdsRef.current.delete(currentDialogId);
        options.dialogCursorRef.current.delete(currentDialogId);
        options.requestDialogHistory(intent, currentDialogId);
        options.requestDialogList(intent);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [
    options.applyMessageTranslation,
    options.requestDialogHistory,
    options.requestDialogList,
    options.settingsRef,
    options.sessionRef,
    options.pendingIntentRef,
    options.dialogIdRef,
    options.loadedDialogIdsRef,
    options.dialogCursorRef,
    options.pendingHistoryCursorRef,
    options.queuedHistoryRefreshRef,
    options.restoreRequestInFlightRef,
    options.setSession,
    options.setSnapshots,
    options.setTokenDebugSummaryOverride,
  ]);
};
