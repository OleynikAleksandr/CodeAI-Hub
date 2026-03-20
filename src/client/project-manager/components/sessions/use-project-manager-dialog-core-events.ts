import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";
import type { Settings } from "../../../ui/src/components/settings/settings-state-model";
import {
  mergeHistoryIntoSnapshots,
  type SessionSnapshots,
} from "../../../ui/src/session/helpers";
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

type DialogHistoryRequestOptions = { readonly force?: boolean } | null | undefined;

type RequestDialogList = (intent: DialogOpenIntent) => void;
type RequestDialogHistory = (
  intent: DialogOpenIntent,
  dialogId: string,
  cursor?: number | null,
  options?: DialogHistoryRequestOptions
) => void;

export const useProjectManagerDialogCoreEvents = (options: {
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
        const providerId = resolveProviderId(match.providerId);
        const preferredRuntimeSessionId =
          match.latestSessionId ?? match.rootSessionId;
        const latestSnapshot = options.latestWorkspaceSnapshotRef.current;
        const runtimeSession = resolveRuntimeSessionFromWorkspaceSnapshot({
          payload:
            latestSnapshot?.workspaceRoot === intent.workspacePath
              ? latestSnapshot
              : null,
          preferredSessionId: preferredRuntimeSessionId,
          dialogId: match.dialogId,
          providerSessionId: match.providerSessionId,
        });
        const nextSession = buildDialogSessionRecord({
          runtimeSessionId: runtimeSession.runtimeSessionId,
          dialogId: match.dialogId,
          providerId,
          providerSessionId: match.providerSessionId,
          intent,
        });
        const restoreKey = buildDialogRestoreRequestKey({
          workspacePath: intent.workspacePath,
          dialogId: match.dialogId,
          providerSessionId: match.providerSessionId,
        });
        if (
          match.providerSessionId &&
          shouldCreateRuntimeRestore({
            requests: options.restoreRequestInFlightRef.current,
            restoreKey,
            hasRuntimeSession: runtimeSession.hasRuntimeSession,
            now: Date.now(),
          })
        ) {
          api.createSession({
            providerId: match.providerId ?? intent.providerId,
            providerSessionId: match.providerSessionId,
            workspacePath: intent.workspacePath,
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
        options.requestDialogHistory(intent, match.dialogId);
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
          options.setSnapshots((previous) =>
            mergeHistoryIntoSnapshots(previous, {
              sessionId: currentSession.id,
              messages: normalizedMessages,
            })
          );
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
        const cursor = options.dialogCursorRef.current.get(incomingDialogId) ?? 0;
        options.requestDialogHistory(intent, incomingDialogId, cursor, { force: cursor <= 0 });
        options.requestDialogList(intent);
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
