import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";

type SessionTabsProps = {
  readonly sessions: readonly SessionRecord[];
  readonly providerLabels: ReadonlyMap<ProviderStackId, string>;
  readonly activeSessionId: string | null;
  readonly onSelect: (sessionId: string) => void;
  readonly onClose: (sessionId: string) => void;
};

const SessionTabs = ({
  sessions,
  providerLabels,
  activeSessionId,
  onSelect,
  onClose,
}: SessionTabsProps) => {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="session-tabs">
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId;
        const summary = session.providerIds
          .map((providerId) => providerLabels.get(providerId) ?? providerId)
          .join(" + ");

        const tabClassName = isActive
          ? "session-tab session-tab--active"
          : "session-tab";

        return (
          <div className={tabClassName} key={session.id}>
            <button
              className="session-tab__select"
              onClick={() => onSelect(session.id)}
              type="button"
            >
              <span className="session-tab__title">{session.title}</span>
              <span className="session-tab__providers">{summary}</span>
            </button>
            <button
              aria-label={`Close ${session.title}`}
              className="session-tab__close"
              onClick={() => onClose(session.id)}
              type="button"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SessionTabs;
