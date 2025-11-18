import type { DragEvent } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";

type SessionTabsProps = {
  readonly sessions: readonly SessionRecord[];
  readonly providerLabels: ReadonlyMap<ProviderStackId, string>;
  readonly activeSessionId: string | null;
  readonly detachedSessionIds: ReadonlySet<string>;
  readonly onSelect: (sessionId: string) => void;
  readonly onClose: (sessionId: string) => void;
  readonly onDetach: (sessionId: string) => void;
};

const SessionTabs = ({
  sessions,
  providerLabels,
  activeSessionId,
  detachedSessionIds,
  onSelect,
  onClose,
  onDetach,
}: SessionTabsProps) => {
  const visibleSessions = sessions.filter(
    (session) => !detachedSessionIds.has(session.id)
  );

  if (visibleSessions.length === 0) {
    return null;
  }

  return (
    <div className="session-tabs">
      {visibleSessions.map((session) => {
        const isActive = session.id === activeSessionId;
        const providerNames = session.providerIds.map((providerId) => {
          const label =
            providerLabels.get(providerId) ??
            getDefaultProviderTitle(providerId);
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
          .map(
            (providerId) =>
              providerLabels.get(providerId) ??
              getDefaultProviderTitle(providerId)
          )
          .join(" + ");

        const tabClassName = isActive
          ? "session-tab session-tab--active"
          : "session-tab";

        const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
          if (!event.shiftKey) {
            return;
          }
          event.preventDefault();
          onDetach(session.id);
        };

        return (
          <div className={tabClassName} key={session.id}>
            <button
              aria-label={`Detach session for ${spokenSummary}`}
              className="session-tab__detach"
              onClick={() => onDetach(session.id)}
              title="Detach this session (Shift + drag to quick-detach)"
              type="button"
            >
              <svg
                aria-hidden="true"
                className="session-tab__detach-icon"
                fill="none"
                focusable="false"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.25"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  height="7.5"
                  rx="1.25"
                  ry="1.25"
                  width="7.5"
                  x="2.75"
                  y="6.75"
                />
                <path d="M9.75 2.25h4v4" />
                <path d="M13.25 2.25 7 8.5" />
              </svg>
            </button>
            <button
              aria-label={`Activate session for ${spokenSummary}`}
              className="session-tab__select"
              draggable={true}
              onClick={() => onSelect(session.id)}
              onDragStart={handleDragStart}
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
