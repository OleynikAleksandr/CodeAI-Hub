import type { ProviderStackId } from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type { SessionKind, SessionRecord } from "../../../../types/session";
import { mapProviderTheme } from "./helpers";

/**
 * Get display label for session agent based on sessionKind.
 * Falls back to stage/runSlug heuristics for backward compatibility.
 */
const getAgentLabel = (
  sessionKind: SessionKind | null | undefined,
  stage: string | null | undefined,
  runSlug: string | null | undefined
): string | null => {
  if (sessionKind === "reviewer") {
    return "Reviewer";
  }
  if (stage === "description") {
    return runSlug === "reviewer" ? "Reviewer" : "Description";
  }
  if (sessionKind === "collector") {
    return "Agent";
  }
  // Fallback to stage name for other workflow stages.
  if (stage) {
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  }
  return null;
};

type TabDisplayData = {
  readonly displaySummary: readonly string[];
  readonly spokenSummary: string;
  readonly fullSummary: string;
  readonly tabClassName: string;
};

const buildTabDisplayData = (
  session: SessionRecord,
  providerLabels: ReadonlyMap<ProviderStackId, string>,
  isActive: boolean
): TabDisplayData => {
  const agentLabel = getAgentLabel(
    session.sessionKind,
    session.stage,
    session.runSlug
  );
  const providerNames = session.providerIds.map((providerId) => {
    const label =
      providerLabels.get(providerId) ?? getDefaultProviderTitle(providerId);
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
  const providerLine = providerNames.slice(0, primaryLineLength).join("+");
  const primaryLine = agentLabel
    ? `${agentLabel} ${providerLine}`
    : providerLine;
  const secondaryTokens = providerNames.slice(primaryLineLength);
  const secondaryLine =
    secondaryTokens.length > 0 ? `+${secondaryTokens.join("+")}` : "";
  const displaySummary = secondaryLine
    ? [primaryLine, secondaryLine]
    : [primaryLine];
  const spokenSummary = agentLabel
    ? `${agentLabel} ${providerNames.join(", ")}`
    : providerNames.join(", ");
  const providerFullNames = session.providerIds
    .map(
      (providerId) =>
        providerLabels.get(providerId) ?? getDefaultProviderTitle(providerId)
    )
    .join(" + ");
  const fullSummary = agentLabel
    ? `${agentLabel}: ${providerFullNames}`
    : providerFullNames;
  const primaryProviderId = session.providerIds[0] ?? null;
  const tabProviderTheme = mapProviderTheme(primaryProviderId);
  const tabClassName = [
    "session-tab",
    isActive ? "session-tab--active" : null,
    tabProviderTheme ? `session-tab--${tabProviderTheme}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return { displaySummary, spokenSummary, fullSummary, tabClassName };
};

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
        const { displaySummary, spokenSummary, fullSummary, tabClassName } =
          buildTabDisplayData(session, providerLabels, isActive);

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
