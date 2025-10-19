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
        const providerNames = session.providerIds.map((providerId) => {
          const label = providerLabels.get(providerId) ?? providerId;
          const [primaryToken] = label.split(" ");
          return primaryToken ?? label;
        });
        const hasTwoProviders = providerNames.length === 2;
        let primaryLineLength: number;
        if (hasTwoProviders) {
          primaryLineLength = 2;
        } else if (providerNames.length <= 2) {
          primaryLineLength = 1;
        } else {
          primaryLineLength = Math.ceil(providerNames.length / 2);
        }
        const primaryLine = providerNames.slice(0, primaryLineLength).join("+");
        const secondaryTokens = providerNames.slice(primaryLineLength);
        const secondaryLine =
          secondaryTokens.length > 0 ? `+${secondaryTokens.join("+")}` : "";
        const displaySummary = secondaryLine
          ? [primaryLine, secondaryLine]
          : [primaryLine];
        const spokenSummary = providerNames.join(", ");
        const fullSummary = session.providerIds
          .map((providerId) => providerLabels.get(providerId) ?? providerId)
          .join(" + ");

        const tabClassName = isActive
          ? "session-tab session-tab--active"
          : "session-tab";

        return (
          <div className={tabClassName} key={session.id}>
            <button
              aria-label={`Activate session for ${spokenSummary}`}
              className="session-tab__select"
              onClick={() => onSelect(session.id)}
              title={fullSummary}
              type="button"
            >
              <span className="session-tab__providers">
                <span className="session-tab__providers-line session-tab__providers-line--primary">
                  {displaySummary[0]}
                </span>
                {displaySummary[1] ? (
                  <span className="session-tab__providers-line">
                    {displaySummary[1]}
                  </span>
                ) : null}
              </span>
            </button>
            <button
              aria-label={`Close session for ${spokenSummary}`}
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
