import { useCallback, useRef, useState } from "react";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import { createInitialSnapshot, removeSnapshot } from "../session/helpers";
import type { ProviderLabels } from "./provider-picker-state";

type SessionSnapshots = Record<string, SessionSnapshot>;

type ToggleTodoHandler = (sessionId: string, todoId: string) => void;

type SendMessageHandler = (sessionId: string, content: string) => void;

type CloseSessionHandler = (sessionId: string) => void;

type SelectSessionHandler = (sessionId: string) => void;

type FocusLastSessionHandler = () => void;

type ClearSessionsHandler = () => void;

type SessionCreatedHandler = (session: SessionRecord) => void;

export type UseSessionStoreResult = {
  readonly sessions: readonly SessionRecord[];
  readonly snapshots: SessionSnapshots;
  readonly activeSessionId: string | null;
  readonly handleSessionCreated: SessionCreatedHandler;
  readonly clearSessions: ClearSessionsHandler;
  readonly focusLastSession: FocusLastSessionHandler;
  readonly selectSession: SelectSessionHandler;
  readonly closeSession: CloseSessionHandler;
  readonly toggleTodo: ToggleTodoHandler;
  readonly sendMessage: SendMessageHandler;
};

export const useSessionStore = (
  providerLabels: ProviderLabels
): UseSessionStoreResult => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const sessionsRef = useRef<SessionRecord[]>([]);

  const syncSessionsRef = useCallback((current: SessionRecord[]) => {
    sessionsRef.current = current;
  }, []);

  const handleSessionCreated = useCallback<SessionCreatedHandler>(
    (session) => {
      setSessions((previous) => {
        const next = [...previous, session];
        syncSessionsRef(next);
        return next;
      });
      setSnapshots((previous) => ({
        ...previous,
        [session.id]: createInitialSnapshot(session, providerLabels),
      }));
      setActiveSessionId(session.id);
    },
    [providerLabels, syncSessionsRef]
  );

  const clearSessions = useCallback<ClearSessionsHandler>(() => {
    setSessions(() => {
      syncSessionsRef([]);
      return [];
    });
    setSnapshots({});
    setActiveSessionId(null);
  }, [syncSessionsRef]);

  const focusLastSession = useCallback<FocusLastSessionHandler>(() => {
    const last = sessionsRef.current.at(-1);
    if (last) {
      setActiveSessionId(last.id);
    }
  }, []);

  const selectSession = useCallback<SelectSessionHandler>((sessionId) => {
    setActiveSessionId(sessionId);
  }, []);

  const closeSession = useCallback<CloseSessionHandler>(
    (sessionId) => {
      setSessions((previous) => {
        const next = previous.filter((session) => session.id !== sessionId);
        syncSessionsRef(next);
        return next;
      });
      setSnapshots((previous) => removeSnapshot(previous, sessionId));
      setActiveSessionId((current) => {
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
    [syncSessionsRef]
  );

  const toggleTodo = useCallback<ToggleTodoHandler>((sessionId, todoId) => {
    setSnapshots((previous) => {
      const current = previous[sessionId];
      if (!current) {
        return previous;
      }
      const todos = current.todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      );
      return {
        ...previous,
        [sessionId]: { ...current, todos },
      };
    });
  }, []);

  const sendMessage = useCallback<SendMessageHandler>((sessionId, content) => {
    setSnapshots((previous) => {
      const current = previous[sessionId];
      if (!current) {
        return previous;
      }
      const timestamp = Date.now();
      return {
        ...previous,
        [sessionId]: {
          ...current,
          draft: "",
          messages: [
            ...current.messages,
            {
              id: `message-${timestamp}`,
              role: "user",
              content,
              createdAt: timestamp,
            },
            {
              id: `message-${timestamp + 1}`,
              role: "assistant",
              content: `Awaiting orchestration response from ${current.status.providerSummary}.`,
              createdAt: timestamp,
            },
          ],
          status: {
            ...current.status,
            tokenUsage: {
              ...current.status.tokenUsage,
              used: Math.min(
                current.status.tokenUsage.limit,
                current.status.tokenUsage.used + content.length
              ),
            },
            updatedAt: timestamp,
          },
        },
      };
    });
  }, []);

  return {
    sessions,
    snapshots,
    activeSessionId,
    handleSessionCreated,
    clearSessions,
    focusLastSession,
    selectSession,
    closeSession,
    toggleTodo,
    sendMessage,
  };
};
