import { useCallback, useRef, useState } from "react";
import type {
  SessionBindingInfo,
  SessionRecord,
} from "../../../../types/session";
import type { SessionSnapshots } from "../session/helpers";
import type { ProviderLabels } from "./provider-picker-state";
import type { UseSessionStoreResult } from "./session-store.types";
import { useSessionStoreHandlers } from "./session-store-handlers";
import { useSessionWindowScope } from "./session-window-scope";

export type { UseSessionStoreResult } from "./session-store.types";

export const useSessionStore = (
  providerLabels: ProviderLabels
): UseSessionStoreResult => {
  const { acceptsSession, filteredSessionId, shouldFilterSessions } =
    useSessionWindowScope();

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    shouldFilterSessions ? filteredSessionId : null
  );
  const sessionsRef = useRef<SessionRecord[]>([]);
  const pendingBindingsRef = useRef<Record<string, SessionBindingInfo>>({});
  const detachedSessionsRef = useRef<Set<string>>(new Set());
  const [detachedSessionIds, setDetachedSessionIdsState] = useState<
    ReadonlySet<string>
  >(() => new Set());

  const syncSessionsRef = useCallback((current: SessionRecord[]) => {
    sessionsRef.current = current;
  }, []);

  const setDetachedSessionIds = useCallback((next: Set<string>) => {
    detachedSessionsRef.current = next;
    setDetachedSessionIdsState(new Set(next));
  }, []);

  const applyPendingBinding = useCallback(
    (session: SessionRecord): SessionRecord => {
      const pending = pendingBindingsRef.current[session.id];
      if (!pending) {
        return session;
      }
      delete pendingBindingsRef.current[session.id];
      return { ...session, binding: pending } satisfies SessionRecord;
    },
    []
  );

  const {
    handleSessionCreated,
    hydrateFromCoreState,
    handleSessionMessageEvent,
    handleSessionHistoryEvent,
    handleSessionBindingUpdate,
    handleSessionWindowState,
    clearSessions,
    focusLastSession,
    selectSession,
    handleSessionDeleted,
    closeSession,
    toggleTodo,
    sendMessage,
  } = useSessionStoreHandlers({
    providerLabels,
    acceptsSession,
    applyPendingBinding,
    filteredSessionId,
    shouldFilterSessions,
    sessionsRef,
    pendingBindingsRef,
    detachedSessionsRef,
    setSessions,
    setSnapshots,
    setActiveSessionId,
    setDetachedSessionIds,
    syncSessionsRef,
  });

  return {
    sessions,
    snapshots,
    activeSessionId,
    detachedSessionIds,
    handleSessionCreated,
    hydrateFromCoreState,
    handleSessionMessageEvent,
    handleSessionHistoryEvent,
    handleSessionDeleted,
    handleSessionBindingUpdate,
    handleSessionWindowState,
    clearSessions,
    focusLastSession,
    selectSession,
    closeSession,
    toggleTodo,
    sendMessage,
  };
};
