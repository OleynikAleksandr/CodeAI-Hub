import { useCallback, useRef, useState } from "react";
import type {
  SessionMessage,
  SessionRecord,
  SessionSnapshot,
} from "../../../../types/session";
import { sendChatMessage } from "../core-bridge/core-bridge";
import type {
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
} from "../core-bridge/types";
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
type CoreStateHandler = (payload: CoreBridgeStatePayload) => void;
type SessionMessageHandler = (payload: CoreBridgeSessionMessagePayload) => void;

export type UseSessionStoreResult = {
  readonly sessions: readonly SessionRecord[];
  readonly snapshots: SessionSnapshots;
  readonly activeSessionId: string | null;
  readonly handleSessionCreated: SessionCreatedHandler;
  readonly hydrateFromCoreState: CoreStateHandler;
  readonly handleSessionMessageEvent: SessionMessageHandler;
  readonly clearSessions: ClearSessionsHandler;
  readonly focusLastSession: FocusLastSessionHandler;
  readonly selectSession: SelectSessionHandler;
  readonly closeSession: CloseSessionHandler;
  readonly toggleTodo: ToggleTodoHandler;
  readonly sendMessage: SendMessageHandler;
};

const buildSnapshotFromMessages = (
  session: SessionRecord,
  providerLabels: ProviderLabels,
  messages: readonly SessionMessage[]
): SessionSnapshot => {
  const base = createInitialSnapshot(session, providerLabels);
  const updatedAt = messages.at(-1)?.createdAt ?? base.status.updatedAt;
  const tokenUsage = messages.reduce(
    (total, message) => total + message.content.length,
    0
  );

  return {
    ...base,
    messages: [...messages],
    status: {
      ...base.status,
      updatedAt,
      tokenUsage: {
        ...base.status.tokenUsage,
        used: Math.min(base.status.tokenUsage.limit, tokenUsage),
      },
    },
  };
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

  const hydrateFromCoreState = useCallback<CoreStateHandler>(
    (payload) => {
      const nextSessions = payload.sessions.map((entry) => entry.record);
      syncSessionsRef(nextSessions);
      setSessions(nextSessions);

      const nextSnapshots: SessionSnapshots = {};
      for (const entry of payload.sessions) {
        nextSnapshots[entry.record.id] = buildSnapshotFromMessages(
          entry.record,
          providerLabels,
          entry.messages
        );
      }
      setSnapshots(nextSnapshots);

      setActiveSessionId((current) => {
        if (current) {
          return current;
        }
        return nextSessions.at(-1)?.id ?? null;
      });
    },
    [providerLabels, syncSessionsRef]
  );

  const handleSessionMessageEvent = useCallback<SessionMessageHandler>(
    (payload) => {
      setSnapshots((previous) => {
        const session = sessionsRef.current.find(
          (item) => item.id === payload.sessionId
        );
        if (!session) {
          return previous;
        }

        const current = previous[payload.sessionId] ?? {
          ...createInitialSnapshot(session, providerLabels),
          messages: [],
        };

        const nextMessages = [...current.messages, payload.message];
        return {
          ...previous,
          [payload.sessionId]: buildSnapshotFromMessages(
            session,
            providerLabels,
            nextMessages
          ),
        };
      });
    },
    [providerLabels]
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
      return {
        ...previous,
        [sessionId]: {
          ...current,
          draft: "",
        },
      };
    });

    sendChatMessage(sessionId, content);
  }, []);

  return {
    sessions,
    snapshots,
    activeSessionId,
    handleSessionCreated,
    hydrateFromCoreState,
    handleSessionMessageEvent,
    clearSessions,
    focusLastSession,
    selectSession,
    closeSession,
    toggleTodo,
    sendMessage,
  };
};
