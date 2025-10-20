import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import DialogPanel from "./dialog-panel";
import EmptyState from "./empty-state";
import InputPanel from "./input-panel";
import SessionTabs from "./session-tabs";
import StatusPanel from "./status-panel";
import TodoPanel from "./todo-panel";

type SessionViewProps = {
  readonly sessions: readonly SessionRecord[];
  readonly providerLabels: ReadonlyMap<ProviderStackId, string>;
  readonly activeSessionId: string | null;
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
  readonly showEmptyState: boolean;
  readonly onSelectSession: (sessionId: string) => void;
  readonly onCloseSession: (sessionId: string) => void;
  readonly onSendMessage: (sessionId: string, content: string) => void;
  readonly onToggleTodo: (sessionId: string, todoId: string) => void;
};

const SessionView = ({
  sessions,
  providerLabels,
  activeSessionId,
  snapshots,
  showEmptyState,
  onSelectSession,
  onCloseSession,
  onSendMessage,
  onToggleTodo,
}: SessionViewProps) => {
  const activeSession =
    activeSessionId && snapshots[activeSessionId]
      ? snapshots[activeSessionId]
      : null;

  if (sessions.length === 0 && showEmptyState) {
    return (
      <div className="session-app">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="session-app">
      <SessionTabs
        activeSessionId={activeSessionId}
        onClose={onCloseSession}
        onSelect={onSelectSession}
        providerLabels={providerLabels}
        sessions={sessions}
      />

      {activeSession && activeSessionId && (
        <div className="session-grid">
          <DialogPanel messages={activeSession.messages} />
          <TodoPanel
            items={activeSession.todos}
            onToggle={(todoId) => onToggleTodo(activeSessionId, todoId)}
          />
          <InputPanel
            draft={activeSession.draft}
            onSubmit={(text) => onSendMessage(activeSessionId, text)}
          />
          <StatusPanel status={activeSession.status} />
        </div>
      )}
    </div>
  );
};

export default SessionView;
