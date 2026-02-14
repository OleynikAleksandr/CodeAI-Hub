import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import { api } from "../../api";
import { useProjectManagerCoreStatusHydrator } from "./status-hydrator";
import SessionView from "../../../ui/src/session/session-view";
import { createInitialSnapshot, mergeHistoryIntoSnapshots, type SessionSnapshots } from "../../../ui/src/session/helpers";
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

export const ProjectManagerDialogSessionView = (props: {
  readonly intent: DialogOpenIntent | null;
  readonly onExit: () => void;
}) => {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
  const loadedDialogIdsRef = useRef(new Set<string>());
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

  const requestDialogHistory = useCallback((intent: DialogOpenIntent, dialogId: string) => {
    if (loadedDialogIdsRef.current.has(dialogId)) {
      return;
    }
    loadedDialogIdsRef.current.add(dialogId);
    api.dialogs.requestDialogHistory(intent.workspaceSlug, dialogId);
  }, []);

  useEffect(() => {
    if (!props.intent) {
      return;
    }
    pendingIntentRef.current = props.intent;
    requestDialogList(props.intent);
  }, [props.intent, requestDialogList]);

  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type === "dialog:list:result") {
        const payload = message.payload as {
          readonly workspaceSlug?: unknown;
          readonly dialogs?: unknown;
        };
        if (!payload || typeof payload.workspaceSlug !== "string" || !Array.isArray(payload.dialogs)) {
          return;
        }
        const parsed: DialogIndexEntry[] = [];
        for (const entry of payload.dialogs) {
          const sanitized = sanitizeDialogIndexEntry(entry);
          if (sanitized) {
            parsed.push(sanitized);
          }
        }
        const intent = pendingIntentRef.current;
        if (!intent || intent.workspaceSlug !== payload.workspaceSlug) {
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
          const blocked: SessionSnapshot = {
            ...base,
            status: {
              ...base.status,
              connectionState: "blocked",
              continuityLock: {
                active: true,
                reason: "dialog_mode_history_replay",
                updatedAt: Date.now(),
              },
              updatedAt: Date.now(),
            },
          };
          return { ...previous, [nextSession.id]: blocked };
        });
        requestDialogHistory(intent, match.dialogId);
        return;
      }
      if (message.type === "dialog:history:result") {
        const payload = message.payload as {
          readonly workspaceSlug?: unknown;
          readonly dialogId?: unknown;
          readonly messages?: unknown;
          readonly error?: unknown;
        };
        if (!payload || typeof payload.workspaceSlug !== "string" || typeof payload.dialogId !== "string" || !Array.isArray(payload.messages)) {
          return;
        }
        const intent = pendingIntentRef.current;
        if (!intent || intent.workspaceSlug !== payload.workspaceSlug) {
          return;
        }
        const normalizedMessages = convertHistoryToMessages(payload.messages);
        setSnapshots((previous) =>
          mergeHistoryIntoSnapshots(previous, {
            sessionId: payload.dialogId,
            messages: normalizedMessages,
          })
        );
      }
      if (message.type === "core:state") {
        const intent = pendingIntentRef.current;
        if (!intent || !session) {
          return;
        }
        // Core restart while PM is open: replay history again to repopulate UI.
        loadedDialogIdsRef.current.delete(session.id);
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
      onSendMessage={() => {}}
      providerLabels={providerLabels}
      sessions={[session]}
      showEmptyState={true}
      snapshots={snapshots}
    />
  );
};

export default ProjectManagerDialogSessionView;
