import type { ProviderStackId } from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import DialogPanel from "./dialog-panel";
import EmptyState from "./empty-state";
import { mapProviderTheme } from "./helpers";
import InfoPanel from "./info-panel";
import InputPanel from "./input-panel";
import SessionTabs from "./session-tabs";
import StatusPanel from "./status-panel";

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
}: SessionViewProps) => {
  const activeSession =
    activeSessionId && snapshots[activeSessionId]
      ? snapshots[activeSessionId]
      : null;
  const activeRecord = sessions.find(
    (session) => session.id === activeSessionId
  );
  const continuationIndex = (() => {
    if (!activeRecord) {
      return null;
    }
    if (!activeRecord.continuationParentId) {
      return 1;
    }
    const sessionsById = new Map(
      sessions.map((session) => [session.id, session] as const)
    );
    const visited = new Set<string>();
    let index = 1;
    let cursor: SessionRecord | undefined = activeRecord;
    while (cursor?.continuationParentId) {
      if (visited.has(cursor.id)) {
        break;
      }
      visited.add(cursor.id);
      index += 1;
      cursor = sessionsById.get(cursor.continuationParentId);
      if (!cursor) {
        break;
      }
    }
    return Math.max(index, 2);
  })();
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
          <InfoPanel
            binding={activeSession.binding}
            continuationIndex={continuationIndex}
          />
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
            {activeSession.status.connectionState === "blocked" ? (
              <output aria-live="polite" className="session-panel">
                Подготавливаю продолжение… (rollover)
              </output>
            ) : null}
            <InputPanel
              draft={activeSession.draft}
              isBlocked={activeSession.status.connectionState === "blocked"}
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
