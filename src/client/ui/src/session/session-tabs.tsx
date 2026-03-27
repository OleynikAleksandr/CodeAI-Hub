import type { ProviderStackId } from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type { SessionKind, SessionRecord } from "../../../../types/session";
import { mapProviderTheme } from "./helpers";

const formatWorkflowStageLabel = (stage: string): string => {
  const normalized = stage.replace(/[-_]+/g, " ").trim();
  if (!normalized) {
    return stage;
  }
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

/**
 * Get display label for session agent based on sessionKind.
 * Falls back to stage/runSlug heuristics for backward compatibility.
 */
const getAgentLabel = (
  sessionKind: SessionKind | null | undefined,
  stage: string | null | undefined
): string | null => {
  if (stage && stage !== "description") {
    return formatWorkflowStageLabel(stage);
  }
  if (stage === "description") {
    return "Description";
  }
  if (sessionKind === "collector") {
    return "Agent";
  }
  if (stage) {
    return formatWorkflowStageLabel(stage);
  }
  return null;
};

interface TabDisplayData {
  readonly displaySummary: readonly string[];
  readonly fullSummary: string;
  readonly spokenSummary: string;
  readonly tabClassName: string;
}

const buildTabDisplayData = (
  session: SessionRecord,
  providerLabels: ReadonlyMap<ProviderStackId, string>,
  isActive: boolean
): TabDisplayData => {
  const agentLabel = getAgentLabel(session.sessionKind, session.stage);
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

interface SessionTabsProps {
  readonly activeSessionId: string | null;
  readonly onClose: (sessionId: string) => void;
  readonly onSelect: (sessionId: string) => void;
  readonly providerLabels: ReadonlyMap<ProviderStackId, string>;
  readonly sessions: readonly SessionRecord[];
}

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
