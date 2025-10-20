import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import DialogPanel from "./dialog-panel";
import InputPanel from "./input-panel";
import SessionTabs from "./session-tabs";
import StatusPanel from "./status-panel";
import TodoPanel from "./todo-panel";

type SessionViewProps = {
  readonly sessions: readonly SessionRecord[];
  readonly providerLabels: ReadonlyMap<ProviderStackId, string>;
  readonly activeSessionId: string | null;
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
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
  onSelectSession,
  onCloseSession,
  onSendMessage,
  onToggleTodo,
}: SessionViewProps) => {
  const activeSession =
    activeSessionId && snapshots[activeSessionId]
      ? snapshots[activeSessionId]
      : null;

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
