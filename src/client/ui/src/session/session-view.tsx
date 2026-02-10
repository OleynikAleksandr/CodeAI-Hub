import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import DialogPanel from "./dialog-panel";
import EmptyState from "./empty-state";
import { mapProviderTheme } from "./helpers";
import InputPanel from "./input-panel";
import SessionIdBar from "./session-id-bar";
import {
  resolveContinuationChainOrEmpty,
  resolveVirtualConversationMessages,
  useQueuedSend,
} from "./session-view-helpers";
import StatusPanel from "./status-panel";
import {
  buildTokenDebugSummary,
  resolveActiveSessionSnapshot,
  resolveProviderDisplayLabel,
  SessionHeader,
} from "./virtual-conversation";

type ConnectionState = SessionSnapshot["status"]["connectionState"];

type SessionViewProps = {
  readonly allSessions?: readonly SessionRecord[];
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

const SessionViewBody = ({
  sessions,
  allSessions: allSessionsProp,
  providerLabels,
  activeSessionId,
  snapshots,
  coreConnectionStatus,
  coreConnectionDetail,
  onSelectSession,
  onCloseSession,
  onSendMessage,
}: SessionViewProps) => {
  const allSessions = allSessionsProp ?? sessions;
  const activeSession = resolveActiveSessionSnapshot({
    activeSessionId,
    snapshots,
  });
  const activeRecord = allSessions.find(
    (session) => session.id === activeSessionId
  );
  const primaryProviderId = activeRecord?.providerIds[0] ?? null;
  const providerTheme = mapProviderTheme(primaryProviderId);
  const providerDisplayLabel = resolveProviderDisplayLabel({
    providerId: primaryProviderId,
    providerLabels,
  });

  const header = (
    <SessionHeader
      activeSessionId={activeSessionId}
      onCloseSession={onCloseSession}
      onSelectSession={onSelectSession}
      providerLabels={providerLabels}
      sessions={sessions}
    />
  );

  const connectionState: ConnectionState =
    activeSession?.status.connectionState ?? "idle";
  const terminalNoResume =
    activeSession?.status.continuityLock?.reason === "terminal_no_resume";
  const continuityLockActive =
    activeSession?.status.continuityLock?.active === true ||
    connectionState === "blocked" ||
    terminalNoResume;
  const effectiveContinuityLockActive = continuityLockActive;
  const inputConnectionState: ConnectionState = effectiveContinuityLockActive
    ? "blocked"
    : connectionState;
  const { isQueued, submitMessage } = useQueuedSend({
    activeSessionId,
    connectionState: inputConnectionState,
    onSendMessage,
  });

  const continuationChain = resolveContinuationChainOrEmpty({
    sessions: allSessions,
    activeSessionId,
  });
  const virtualConversationMessages = resolveVirtualConversationMessages({
    activeSessionId,
    activeSession,
    continuationChain,
    snapshots,
  });

  if (!(activeSession && activeSessionId)) {
    return (
      <div className="session-app">
        {header}
        <div className="session-app__content" />
      </div>
    );
  }

  const tokenDebugSummary =
    buildTokenDebugSummary({
      chain: continuationChain,
      snapshots,
      activeSessionId,
    }) ?? undefined;

  return (
    <div className="session-app">
      {header}
      <SessionIdBar binding={activeSession.binding} />
      <div className="session-app__content">
        <div className="session-app__dialog">
          <DialogPanel
            messages={virtualConversationMessages}
            providerLabel={providerDisplayLabel}
            providerTheme={providerTheme}
          />
        </div>
        <div className="session-app__rails">
          {terminalNoResume ? (
            <div className="session-input__hint">
              This session is complete and read-only.
            </div>
          ) : null}
          <InputPanel
            connectionState={inputConnectionState}
            continuityLockActive={effectiveContinuityLockActive}
            draft={activeSession.draft}
            isQueued={isQueued}
            onSubmit={submitMessage}
            providerTheme={providerTheme}
          />
          <StatusPanel
            connectionDetail={coreConnectionDetail}
            connectionStatus={coreConnectionStatus}
            status={activeSession.status}
            tokenDebugSummary={tokenDebugSummary}
          />
        </div>
      </div>
    </div>
  );
};

const SessionView = (props: SessionViewProps) => {
  if (props.sessions.length === 0 && props.showEmptyState) {
    return (
      <div className="session-app">
        <EmptyState />
      </div>
    );
  }

  return <SessionViewBody {...props} />;
};

export default SessionView;
