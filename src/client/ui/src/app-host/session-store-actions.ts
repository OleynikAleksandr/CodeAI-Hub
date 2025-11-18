import { useCallback } from "react";
import {
  deleteSession as deleteSessionOnServer,
  sendChatMessage,
} from "../core-bridge/core-bridge";
import { removeSnapshot, toggleTodoInSnapshots } from "../session/helpers";
import type {
  ClearSessionsHandler,
  CloseSessionHandler,
  FocusLastSessionHandler,
  SelectSessionHandler,
  SendMessageHandler,
  SessionDeletedHandler,
  ToggleTodoHandler,
} from "./session-store.types";
import type { SessionStoreHandlerDeps } from "./session-store-handler-context";

export type SessionActionHandlers = {
  readonly clearSessions: ClearSessionsHandler;
  readonly focusLastSession: FocusLastSessionHandler;
  readonly selectSession: SelectSessionHandler;
  readonly handleSessionDeleted: SessionDeletedHandler;
  readonly closeSession: CloseSessionHandler;
  readonly toggleTodo: ToggleTodoHandler;
  readonly sendMessage: SendMessageHandler;
};

export const useSessionActionHandlers = (
  deps: SessionStoreHandlerDeps
): SessionActionHandlers => {
  const {
    acceptsSession,
    filteredSessionId,
    shouldFilterSessions,
    sessionsRef,
    detachedSessionsRef,
    setSessions,
    setSnapshots,
    setActiveSessionId,
    setDetachedSessionIds,
    syncSessionsRef,
  } = deps;

  const clearSessions = useCallback<ClearSessionsHandler>(() => {
    setSessions(() => {
      syncSessionsRef([]);
      return [];
    });
    setSnapshots({});
    setActiveSessionId(shouldFilterSessions ? filteredSessionId : null);
    setDetachedSessionIds(new Set());
    detachedSessionsRef.current = new Set();
  }, [
    filteredSessionId,
    detachedSessionsRef,
    setActiveSessionId,
    setSessions,
    setSnapshots,
    setDetachedSessionIds,
    shouldFilterSessions,
    syncSessionsRef,
  ]);

  const focusLastSession = useCallback<FocusLastSessionHandler>(() => {
    if (shouldFilterSessions && filteredSessionId) {
      setActiveSessionId(filteredSessionId);
      return;
    }
    const last = sessionsRef.current.at(-1);
    if (last) {
      setActiveSessionId(last.id);
    }
  }, [
    filteredSessionId,
    setActiveSessionId,
    sessionsRef,
    shouldFilterSessions,
  ]);

  const selectSession = useCallback<SelectSessionHandler>(
    (sessionId) => {
      if (shouldFilterSessions) {
        return;
      }
      setActiveSessionId(sessionId);
    },
    [setActiveSessionId, shouldFilterSessions]
  );

  const handleSessionDeleted = useCallback<SessionDeletedHandler>(
    (payload) => {
      const { sessionId } = payload;
      setSessions((previous) => {
        const next = previous.filter((session) => session.id !== sessionId);
        syncSessionsRef(next);
        return next;
      });
      setSnapshots((previous) => removeSnapshot(previous, sessionId));
      if (detachedSessionsRef.current.has(sessionId)) {
        const nextDetached = new Set(detachedSessionsRef.current);
        nextDetached.delete(sessionId);
        setDetachedSessionIds(nextDetached);
      }
      setActiveSessionId((current) => {
        if (shouldFilterSessions) {
          return filteredSessionId === sessionId ? null : current;
        }
        if (current !== sessionId) {
          return current;
        }
        const remaining = sessionsRef.current.filter(
          (session) => session.id !== sessionId
        );
        const last = remaining.at(-1);
        return last ? last.id : null;
      });
    },
    [
      filteredSessionId,
      detachedSessionsRef,
      setActiveSessionId,
      setSessions,
      setSnapshots,
      sessionsRef,
      setDetachedSessionIds,
      shouldFilterSessions,
      syncSessionsRef,
    ]
  );

  const closeSession = useCallback<CloseSessionHandler>(
    (sessionId) => {
      if (shouldFilterSessions) {
        return;
      }
      deleteSessionOnServer(sessionId);
    },
    [shouldFilterSessions]
  );

  const toggleTodo = useCallback<ToggleTodoHandler>(
    (sessionId, todoId) => {
      if (!acceptsSession(sessionId)) {
        return;
      }
      setSnapshots((previous) =>
        toggleTodoInSnapshots(previous, sessionId, todoId)
      );
    },
    [acceptsSession, setSnapshots]
  );

  const sendMessage = useCallback<SendMessageHandler>(
    (sessionId, content) => {
      if (!acceptsSession(sessionId)) {
        return;
      }
      setSnapshots((previous) => {
        const current = previous[sessionId];
        if (!current) {
          return previous;
        }
        return {
          ...previous,
          [sessionId]: {
            ...current,
            draft: "",
          },
        };
      });

      sendChatMessage(sessionId, content);
    },
    [acceptsSession, setSnapshots]
  );

  return {
    clearSessions,
    focusLastSession,
    selectSession,
    handleSessionDeleted,
    closeSession,
    toggleTodo,
    sendMessage,
  };
};
