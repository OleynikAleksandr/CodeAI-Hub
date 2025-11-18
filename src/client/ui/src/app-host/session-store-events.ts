import { useCallback } from "react";
import type { SessionRecord } from "../../../../types/session";
import { logUiDiagnostic } from "../diagnostics/log";
import {
  appendMessageToSnapshots,
  createInitialSnapshot,
  mergeHistoryIntoSnapshots,
  normalizeBinding,
  type SessionSnapshots,
} from "../session/helpers";
import type {
  CoreStateHandler,
  SessionBindingHandler,
  SessionCreatedHandler,
  SessionHistoryHandler,
  SessionMessageHandler,
  SessionWindowStateHandler,
} from "./session-store.types";
import type { SessionStoreHandlerDeps } from "./session-store-handler-context";

export type SessionEventHandlers = {
  readonly handleSessionCreated: SessionCreatedHandler;
  readonly hydrateFromCoreState: CoreStateHandler;
  readonly handleSessionMessageEvent: SessionMessageHandler;
  readonly handleSessionHistoryEvent: SessionHistoryHandler;
  readonly handleSessionBindingUpdate: SessionBindingHandler;
  readonly handleSessionWindowState: SessionWindowStateHandler;
};

const findFallbackSessionId = (
  targetSessionId: string,
  sessions: readonly SessionRecord[],
  detachedSessionIds: ReadonlySet<string>
): string | null => {
  for (let index = sessions.length - 1; index >= 0; index -= 1) {
    const candidate = sessions[index];
    if (!candidate || candidate.id === targetSessionId) {
      continue;
    }
    if (detachedSessionIds.has(candidate.id)) {
      continue;
    }
    return candidate.id;
  }
  return null;
};

export const useSessionEventHandlers = (
  deps: SessionStoreHandlerDeps
): SessionEventHandlers => {
  const {
    providerLabels,
    acceptsSession,
    applyPendingBinding,
    filteredSessionId,
    shouldFilterSessions,
    sessionsRef,
    detachedSessionsRef,
    setSessions,
    setSnapshots,
    setActiveSessionId,
    setDetachedSessionIds,
    syncSessionsRef,
    pendingBindingsRef,
  } = deps;

  const handleSessionCreated = useCallback<SessionCreatedHandler>(
    (session) => {
      logUiDiagnostic(
        `[SessionStore] Session created event received for ${session.id}.`
      );
      if (!acceptsSession(session.id)) {
        return;
      }
      const sessionWithBinding = applyPendingBinding(session);
      setSessions((previous) => {
        const next = [...previous, sessionWithBinding];
        syncSessionsRef(next);
        return next;
      });
      setSnapshots((previous) => ({
        ...previous,
        [session.id]: createInitialSnapshot(sessionWithBinding, providerLabels),
      }));
      setActiveSessionId(session.id);
    },
    [
      acceptsSession,
      applyPendingBinding,
      providerLabels,
      setActiveSessionId,
      setSessions,
      setSnapshots,
      syncSessionsRef,
    ]
  );

  const hydrateFromCoreState = useCallback<CoreStateHandler>(
    (payload) => {
      const nextSessions = payload.sessions.map((record) =>
        applyPendingBinding(record as SessionRecord)
      );
      const filteredSessions = nextSessions.filter((session) =>
        acceptsSession(session.id)
      );
      logUiDiagnostic(
        `[SessionStore] Hydrating from core snapshot: total=${nextSessions.length}, accepted=${filteredSessions.length}.`
      );
      syncSessionsRef(filteredSessions);
      setSessions(filteredSessions);

      const nextSnapshots: SessionSnapshots = {};
      for (const session of filteredSessions) {
        nextSnapshots[session.id] = createInitialSnapshot(
          session,
          providerLabels
        );
      }
      setSnapshots(nextSnapshots);

      const detachedFromPayload = new Set<string>();
      if (Array.isArray(payload.detachedSessions)) {
        for (const sessionId of payload.detachedSessions) {
          if (typeof sessionId !== "string") {
            continue;
          }
          const sessionExists =
            filteredSessions.findIndex((session) => session.id === sessionId) >=
            0;
          if (sessionExists) {
            detachedFromPayload.add(sessionId);
          }
        }
      }
      setDetachedSessionIds(detachedFromPayload);

      setActiveSessionId((current) => {
        if (shouldFilterSessions && filteredSessionId) {
          return filteredSessionId;
        }
        if (current) {
          return current;
        }
        return filteredSessions.at(-1)?.id ?? null;
      });
    },
    [
      acceptsSession,
      applyPendingBinding,
      filteredSessionId,
      providerLabels,
      setActiveSessionId,
      setDetachedSessionIds,
      setSessions,
      setSnapshots,
      shouldFilterSessions,
      syncSessionsRef,
    ]
  );

  const handleSessionMessageEvent = useCallback<SessionMessageHandler>(
    (payload) => {
      if (!acceptsSession(payload.sessionId)) {
        return;
      }
      setSnapshots((previous) => appendMessageToSnapshots(previous, payload));
    },
    [acceptsSession, setSnapshots]
  );

  const handleSessionHistoryEvent = useCallback<SessionHistoryHandler>(
    (payload) => {
      if (!acceptsSession(payload.sessionId)) {
        return;
      }
      setSnapshots((previous) => mergeHistoryIntoSnapshots(previous, payload));
    },
    [acceptsSession, setSnapshots]
  );

  const handleSessionBindingUpdate = useCallback<SessionBindingHandler>(
    (payload) => {
      if (!acceptsSession(payload.sessionId)) {
        return;
      }
      const binding = normalizeBinding({
        providerSessionId: payload.providerSessionId,
        status: payload.status,
      });

      setSessions((current) => {
        let updated = false;
        const next = current.map((session) => {
          if (session.id !== payload.sessionId) {
            return session;
          }
          updated = true;
          return { ...session, binding };
        });
        if (!updated) {
          pendingBindingsRef.current[payload.sessionId] = binding;
          return current;
        }
        syncSessionsRef(next);
        return next;
      });

      setSnapshots((previous) => {
        const current = previous[payload.sessionId];
        if (!current) {
          pendingBindingsRef.current[payload.sessionId] = binding;
          return previous;
        }
        return {
          ...previous,
          [payload.sessionId]: {
            ...current,
            binding,
          },
        };
      });
    },
    [
      acceptsSession,
      pendingBindingsRef,
      setSessions,
      setSnapshots,
      syncSessionsRef,
    ]
  );

  const handleSessionWindowState = useCallback<SessionWindowStateHandler>(
    (payload) => {
      if (!acceptsSession(payload.sessionId)) {
        return;
      }
      const mode =
        payload.mode === "detached" ? "detached" : ("attached" as const);
      const nextDetached = new Set(detachedSessionsRef.current);
      if (mode === "detached") {
        nextDetached.add(payload.sessionId);
      } else {
        nextDetached.delete(payload.sessionId);
      }
      setDetachedSessionIds(nextDetached);

      if (shouldFilterSessions) {
        return;
      }

      if (mode === "detached") {
        setActiveSessionId((current) => {
          if (current !== payload.sessionId) {
            return current;
          }
          const fallback = findFallbackSessionId(
            payload.sessionId,
            sessionsRef.current,
            nextDetached
          );
          return fallback;
        });
        return;
      }

      setActiveSessionId((current) => current ?? payload.sessionId);
    },
    [
      acceptsSession,
      detachedSessionsRef,
      sessionsRef,
      setActiveSessionId,
      setDetachedSessionIds,
      shouldFilterSessions,
    ]
  );

  return {
    handleSessionCreated,
    hydrateFromCoreState,
    handleSessionMessageEvent,
    handleSessionHistoryEvent,
    handleSessionBindingUpdate,
    handleSessionWindowState,
  };
};
