import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import { useProjectManagerCoreStatusHydrator } from "./status-hydrator";
import SessionView from "../../../ui/src/session/session-view";
import { createInitialSnapshot, mergeHistoryIntoSnapshots, type SessionSnapshots } from "../../../ui/src/session/helpers";
import { buildTokenDebugSummaryFromMessages } from "./dialog-segment-meta";
import { appendDedupedSessionMessageToSnapshots } from "./session-message-dedupe";
import {
  buildDialogSessionRecord,
  buildProviderLabels,
  convertHistoryToMessages,
  resolveDialogMatch,
  resolveProviderId,
  sanitizeDialogIndexEntry,
  type DialogIndexEntry,
  type DialogOpenIntent,
} from "./project-manager-dialog-session-view-helpers";
export type { DialogOpenIntent } from "./project-manager-dialog-session-view-helpers";
const createRequestId = (): string =>
  typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `pm-dialog-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;
const readCursor = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : null;
const createSystemMessage = (content: string) => ({ id: `system-${Date.now()}`, role: "system" as const, content, createdAt: Date.now() });
export const ProjectManagerDialogSessionView = (props: {
  readonly intent: DialogOpenIntent | null;
  readonly onExit: () => void;
}) => {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
  const [tokenDebugSummaryOverride, setTokenDebugSummaryOverride] = useState<
    string | undefined
  >(undefined);
  const loadedDialogIdsRef = useRef(new Set<string>());
  const dialogCursorRef = useRef(new Map<string, number>());
  const pendingHistoryCursorRef = useRef(new Map<string, number>());
  const queuedHistoryRefreshRef = useRef(new Set<string>());
  const pendingIntentRef = useRef<DialogOpenIntent | null>(null);
  const connection = useProjectManagerCoreStatusHydrator({
    onHydrate: () => {},
    onSessionHistory: () => {},
  });
  const providerLabels = useMemo(() => {
    const providerId = session?.providerIds[0] ?? null;
    return buildProviderLabels(providerId ?? null);
  }, [session]);
  const requestDialogList = useCallback((intent: DialogOpenIntent) => {
    api.dialogs.listDialogs(intent.workspaceSlug);
  }, []);
  const requestDialogHistory = useCallback(
    (
      intent: DialogOpenIntent,
      dialogId: string,
      cursor?: number | null,
      options?: { readonly force?: boolean } | null
    ) => {
      const resolvedCursor =
        typeof cursor === "number" && Number.isFinite(cursor)
          ? Math.max(0, Math.trunc(cursor))
          : 0;
      if (resolvedCursor === 0) {
        if (!options?.force && loadedDialogIdsRef.current.has(dialogId)) {
          return;
        }
        loadedDialogIdsRef.current.add(dialogId);
      }
      if (pendingHistoryCursorRef.current.has(dialogId)) {
        queuedHistoryRefreshRef.current.add(dialogId);
        return;
      }
      api.dialogs.requestDialogHistory(
        intent.workspaceSlug,
        dialogId,
        resolvedCursor > 0 ? { cursor: resolvedCursor } : undefined
      );
      pendingHistoryCursorRef.current.set(dialogId, resolvedCursor);
    },
    []
  );
  useEffect(() => {
    if (!props.intent) {
      return;
    }
    pendingIntentRef.current = props.intent;
    // Ensure Core scope is selected for this workspace so dialog commands are accepted.
    api.selectWorkspace({
      requestId: createRequestId(),
      workspaceRoot: props.intent.workspacePath,
      reason: "workspace_selected",
    });
    requestDialogList(props.intent);
  }, [props.intent, requestDialogList]);
  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type === "dialog:list:result") {
        const payload = message.payload as Record<string, unknown> | null;
        const workspaceSlug = readString(payload?.workspaceSlug);
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
        const intent = pendingIntentRef.current;
        if (!intent || intent.workspaceSlug !== workspaceSlug) {
          return;
        }
        const match = resolveDialogMatch({ intent, dialogs: parsed });
        if (!match) {
          return;
        }
        const providerId = resolveProviderId(match.providerId);
        const nextSession = buildDialogSessionRecord({
          dialogId: match.dialogId,
          providerId,
          providerSessionId: match.providerSessionId,
          intent,
        });
        setSession(nextSession);
        setSnapshots((previous) => {
          if (previous[nextSession.id]) {
            return previous;
          }
          const base = createInitialSnapshot(nextSession, providerLabels);
          return { ...previous, [nextSession.id]: base };
        });
        requestDialogHistory(intent, match.dialogId);
        return;
      }
      if (message.type === "dialog:history:result") {
        const payload = message.payload as Record<string, unknown> | null;
        const workspaceSlug = readString(payload?.workspaceSlug);
        const dialogId = readString(payload?.dialogId);
        const lastCursor = readCursor(payload?.lastCursor);
        const messages = payload?.messages;
        if (workspaceSlug === null || dialogId === null || !Array.isArray(messages)) {
          return;
        }
        const intent = pendingIntentRef.current;
        if (!intent || intent.workspaceSlug !== workspaceSlug) {
          return;
        }
        const requestedCursor =
          pendingHistoryCursorRef.current.get(dialogId) ?? 0;
        pendingHistoryCursorRef.current.delete(dialogId);
        const isTail = requestedCursor > 0;
        if (lastCursor !== null) {
          dialogCursorRef.current.set(dialogId, lastCursor);
        }
        const normalizedMessages = convertHistoryToMessages(messages);
        const summary = buildTokenDebugSummaryFromMessages(normalizedMessages);
        if (summary) {
          setTokenDebugSummaryOverride(summary);
        } else if (!isTail) {
          setTokenDebugSummaryOverride(undefined);
        }
        if (!isTail) {
          setSnapshots((previous) =>
            mergeHistoryIntoSnapshots(previous, {
              sessionId: dialogId,
              messages: normalizedMessages,
            })
          );
        } else {
          setSnapshots((previous) => {
            let updated = previous;
            for (const normalized of normalizedMessages) {
              updated = appendDedupedSessionMessageToSnapshots(updated, {
                sessionId: dialogId,
                message: normalized,
              });
            }
            return updated;
          });
        }
        if (queuedHistoryRefreshRef.current.has(dialogId)) {
          queuedHistoryRefreshRef.current.delete(dialogId);
          const cursor = dialogCursorRef.current.get(dialogId) ?? 0;
          requestDialogHistory(intent, dialogId, cursor, { force: cursor <= 0 });
        }
        return;
      }
      if (message.type === "dialog:send:ack") {
        const payload = message.payload as Record<string, unknown> | null;
        const workspaceSlug = readString(payload?.workspaceSlug);
        const dialogId = readString(payload?.dialogId);
        if (workspaceSlug === null || dialogId === null) {
          return;
        }
        const intent = pendingIntentRef.current;
        if (!intent || intent.workspaceSlug !== workspaceSlug) {
          return;
        }
        if (payload?.status === "sent") {
          const cursor = dialogCursorRef.current.get(dialogId) ?? 0;
          requestDialogHistory(intent, dialogId, cursor, { force: cursor <= 0 });
          return;
        }
        if (payload?.status === "rejected") {
          const errorCopy =
            typeof payload?.error === "string" && payload.error.trim().length > 0
              ? payload.error
              : "Dialog send rejected.";
          setSnapshots((previous) =>
            appendDedupedSessionMessageToSnapshots(previous, {
              sessionId: dialogId,
              message: createSystemMessage(errorCopy),
            })
          );
        }
        return;
      }
      if (message.type === "dialog:message") {
        const payload = message.payload as Record<string, unknown> | null;
        const dialogId = readString(payload?.dialogId);
        if (dialogId === null) {
          return;
        }
        if (!session || dialogId !== session.id) {
          return;
        }
        const intent = pendingIntentRef.current;
        if (!intent) {
          return;
        }
        const cursor = dialogCursorRef.current.get(dialogId) ?? 0;
        requestDialogHistory(intent, dialogId, cursor, { force: cursor <= 0 });
        return;
      }
      if (message.type === "core:state") {
        const intent = pendingIntentRef.current;
        if (!intent || !session) {
          return;
        }
        // Core restart while PM is open: replay history again to repopulate UI.
        loadedDialogIdsRef.current.delete(session.id);
        dialogCursorRef.current.delete(session.id);
        requestDialogHistory(intent, session.id);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [providerLabels, requestDialogHistory, session]);
  if (!session) {
    return (
      <SessionView
        activeSessionId={null}
        allSessions={[]}
        coreConnectionDetail={connection.detail}
        coreConnectionStatus={connection.status}
        onCloseSession={() => props.onExit()}
        onSelectSession={() => {}}
        onSendMessage={() => {}}
        providerLabels={new Map()}
        sessions={[]}
        showEmptyState={true}
        snapshots={{}}
        tokenDebugSummaryOverride={undefined}
      />
    );
  }
  return (
    <SessionView
      activeSessionId={session.id}
      allSessions={[session]}
      coreConnectionDetail={connection.detail}
      coreConnectionStatus={connection.status}
      onCloseSession={() => props.onExit()}
      onSelectSession={() => {}}
      onSendMessage={(sessionId, content) => {
        const intent = pendingIntentRef.current;
        if (!intent) {
          return;
        }
        api.dialogs.sendDialogMessage(intent.workspaceSlug, sessionId, content);
      }}
      providerLabels={providerLabels}
      sessions={[session]}
      showEmptyState={true}
      snapshots={snapshots}
      tokenDebugSummaryOverride={tokenDebugSummaryOverride}
    />
  );
};
export default ProjectManagerDialogSessionView;
