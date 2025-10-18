import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import {
  defaultPickerState,
  ProviderPicker,
  type ProviderPickerState,
} from "./provider-picker";
import {
  buildProviderLabels,
  createInitialSnapshot,
  isSessionRecordCandidate,
  mergeCatalog,
  type ProviderCatalog,
  parseProviderList,
  removeSnapshot,
} from "./session/helpers";
import SessionView from "./session/session-view";
import { postVsCodeMessage } from "./vscode";

type ProviderPickerOpenMessage = {
  readonly type: "providerPicker:open";
  readonly payload?: {
    readonly providers?: unknown;
  };
};

type SessionCreatedMessage = {
  readonly type: "session:created";
  readonly payload?: unknown;
};

type SessionClearAllMessage = {
  readonly type: "session:clearAll";
};

type SessionFocusLastMessage = {
  readonly type: "session:focusLast";
};

type IncomingMessage =
  | ProviderPickerOpenMessage
  | SessionCreatedMessage
  | SessionClearAllMessage
  | SessionFocusLastMessage;

type SessionSnapshots = Record<string, SessionSnapshot>;

const activateRoot = () => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.classList.add("active");
  }
};

const AppHost = () => {
  const [pickerState, setPickerState] =
    useState<ProviderPickerState>(defaultPickerState);
  const [catalog, setCatalog] = useState<ProviderCatalog>({});
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [snapshots, setSnapshots] = useState<SessionSnapshots>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const sessionsRef = useRef<SessionRecord[]>([]);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const providerLabels = buildProviderLabels(catalog);

  const openPicker = useCallback(
    (providers: readonly ProviderStackDescriptor[]) => {
      setCatalog((previous) => mergeCatalog(previous, providers));
      setPickerState({
        visible: true,
        providers,
      });
    },
    []
  );

  const handleSessionCreated = useCallback(
    (session: SessionRecord) => {
      activateRoot();
      setPickerState(defaultPickerState);
      setSessions((previous) => [...previous, session]);
      setSnapshots((previous) => ({
        ...previous,
        [session.id]: createInitialSnapshot(session, providerLabels),
      }));
      setActiveSessionId(session.id);
    },
    [providerLabels]
  );

  const clearSessions = useCallback(() => {
    setSessions([]);
    setSnapshots({});
    setActiveSessionId(null);
  }, []);

  const focusLastSession = useCallback(() => {
    const last = sessionsRef.current.at(-1);
    if (last) {
      setActiveSessionId(last.id);
    }
  }, []);

  const handleIncomingMessage = useCallback(
    (event: MessageEvent<unknown>) => {
      const message = event.data as IncomingMessage;
      if (!message || typeof message !== "object" || !("type" in message)) {
        return;
      }

      switch (message.type) {
        case "providerPicker:open": {
          const providers = parseProviderList(message.payload?.providers);
          if (providers.length > 0) {
            activateRoot();
            openPicker(providers);
          }
          break;
        }
        case "session:created": {
          if (isSessionRecordCandidate(message.payload)) {
            handleSessionCreated(message.payload);
          }
          break;
        }
        case "session:clearAll": {
          clearSessions();
          break;
        }
        case "session:focusLast": {
          focusLastSession();
          break;
        }
        default:
          break;
      }
    },
    [clearSessions, focusLastSession, handleSessionCreated, openPicker]
  );

  useEffect(() => {
    window.addEventListener("message", handleIncomingMessage);
    return () => window.removeEventListener("message", handleIncomingMessage);
  }, [handleIncomingMessage]);

  const handlePickerConfirm = useCallback(
    (providerIds: readonly ProviderStackId[]) => {
      postVsCodeMessage({
        type: "providerPicker:confirm",
        payload: { providerIds },
      });
      setPickerState(defaultPickerState);
    },
    []
  );

  const handlePickerCancel = useCallback(() => {
    postVsCodeMessage({ type: "providerPicker:cancel" });
    setPickerState(defaultPickerState);
  }, []);

  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const handleCloseSession = useCallback((sessionId: string) => {
    setSessions((previous) =>
      previous.filter((session) => session.id !== sessionId)
    );
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
  }, []);

  const handleToggleTodo = useCallback((sessionId: string, todoId: string) => {
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

  const handleSendMessage = useCallback(
    (sessionId: string, content: string) => {
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
    },
    []
  );

  return (
    <>
      <SessionView
        activeSessionId={activeSessionId}
        onCloseSession={handleCloseSession}
        onSelectSession={handleSelectSession}
        onSendMessage={handleSendMessage}
        onToggleTodo={handleToggleTodo}
        providerLabels={providerLabels}
        sessions={sessions}
        snapshots={snapshots}
      />
      <ProviderPicker
        onCancel={handlePickerCancel}
        onConfirm={handlePickerConfirm}
        providers={pickerState.providers}
        visible={pickerState.visible}
      />
    </>
  );
};

const mount = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    return;
  }

  activateRoot();

  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <AppHost />
    </StrictMode>
  );
};

mount();
