import type { ProviderStackId } from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import DialogPanel from "./dialog-panel";
import EmptyState from "./empty-state";
import InfoPanel from "./info-panel";
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
  readonly coreConnectionStatus: "connecting" | "ready" | "error";
  readonly coreConnectionDetail?: string;
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
  coreConnectionStatus,
  coreConnectionDetail,
  onSelectSession,
  onCloseSession,
  onSendMessage,
  onToggleTodo,
}: SessionViewProps) => {
  const activeSession =
    activeSessionId && snapshots[activeSessionId]
      ? snapshots[activeSessionId]
      : null;
  const activeRecord = sessions.find(
    (session) => session.id === activeSessionId
  );
  const primaryProviderId = activeRecord?.providerIds[0] ?? null;
  const providerTheme = mapProviderTheme(primaryProviderId);
  const providerDisplayLabel =
    primaryProviderId != null
      ? (providerLabels.get(primaryProviderId) ??
        getDefaultProviderTitle(primaryProviderId))
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
      <div className="session-app__header">
        <SessionTabs
          activeSessionId={activeSessionId}
          onClose={onCloseSession}
          onSelect={onSelectSession}
          providerLabels={providerLabels}
          sessions={sessions}
        />
        {activeSession && activeSessionId ? (
          <InfoPanel binding={activeSession.binding} />
        ) : null}
      </div>

      {activeSession && activeSessionId ? (
        <div className="session-app__content">
          <div className="session-app__dialog">
            <DialogPanel
              messages={activeSession.messages}
              providerLabel={providerDisplayLabel}
              providerTheme={providerTheme}
            />
          </div>
          <div className="session-app__rails">
            <TodoPanel
              items={activeSession.todos}
              onToggle={(todoId) => onToggleTodo(activeSessionId, todoId)}
            />
            <InputPanel
              draft={activeSession.draft}
              onSubmit={(text) => onSendMessage(activeSessionId, text)}
            />
            <StatusPanel
              connectionDetail={coreConnectionDetail}
              connectionStatus={coreConnectionStatus}
              status={activeSession.status}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SessionView;

const mapProviderTheme = (
  providerId: ProviderStackId | null
): "claude" | "codex" | "gemini" | null => {
  switch (providerId) {
    case "claudeCodeCli":
      return "claude";
    case "codexCli":
      return "codex";
    case "geminiCli":
      return "gemini";
    default:
      return null;
  }
};
