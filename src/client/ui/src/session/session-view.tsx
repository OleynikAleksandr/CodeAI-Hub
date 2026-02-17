import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import DialogPanel from "./dialog-panel";
import { buildTokenDebugSummaryFromMessages } from "./dialog-segment-meta";
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
  readonly emptyStatePending?: boolean;
  readonly coreConnectionStatus: "connecting" | "ready" | "error";
  readonly coreConnectionDetail?: string;
  readonly tokenDebugSummaryOverride?: string;
  readonly onSelectSession: (sessionId: string) => void;
  readonly onCloseSession: (sessionId: string) => void;
  readonly onSendMessage: (sessionId: string, content: string) => void;
};

const ForceUnlockButton = ({
  onForceUnlock,
}: {
  readonly onForceUnlock: () => void;
}) => (
  <div className="session-app__force-unlock">
    <button onClick={onForceUnlock} title="Force unlock input" type="button">
      🔓
    </button>
  </div>
);

const resolveContinuityErrorCopy = (
  activeSession: SessionSnapshot | null
): string | null => {
  if (activeSession?.status.rollover?.phase !== "failed") {
    return null;
  }
  return activeSession.status.rollover?.error ?? "Rollover failed.";
};

const SessionViewBody = ({
  sessions,
  allSessions: allSessionsProp,
  providerLabels,
  activeSessionId,
  snapshots,
  coreConnectionStatus,
  coreConnectionDetail,
  tokenDebugSummaryOverride,
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
  const queueConnectionState: ConnectionState =
    effectiveContinuityLockActive && connectionState !== "running"
      ? "blocked"
      : connectionState;
  const continuityErrorCopy = resolveContinuityErrorCopy(activeSession);
  const { isQueued, submitMessage, clearQueuedMessage } = useQueuedSend({
    activeSessionId,
    connectionState: queueConnectionState,
    onSendMessage,
  });

  const [forceUnlocked, setForceUnlocked] = useState(false);
  const prevConnectionStateRef = useRef<ConnectionState>(connectionState);

  useEffect(() => {
    const prev = prevConnectionStateRef.current;
    if (connectionState === "running" && prev !== "running") {
      setForceUnlocked(false);
    }
    prevConnectionStateRef.current = connectionState;
  }, [connectionState]);

  const handleForceUnlock = useCallback(() => {
    setForceUnlocked(true);
    clearQueuedMessage();
  }, [clearQueuedMessage]);

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
      <div className="session-app" data-session-style-source="canonical">
        {header}
        <div className="session-app__content" />
      </div>
    );
  }

  const tokenDebugSummary =
    tokenDebugSummaryOverride ??
    buildTokenDebugSummary({
      chain: continuationChain,
      snapshots,
      activeSessionId,
    }) ??
    buildTokenDebugSummaryFromMessages(virtualConversationMessages) ??
    undefined;

  const coreLocked =
    connectionState !== "idle" || effectiveContinuityLockActive || isQueued;
  const showForceUnlock = coreLocked && !terminalNoResume && !forceUnlocked;

  return (
    <div className="session-app" data-session-style-source="canonical">
      {header}
      <SessionIdBar
        binding={activeSession.binding}
        status={activeSession.status}
      />
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
          {showForceUnlock ? (
            <ForceUnlockButton onForceUnlock={handleForceUnlock} />
          ) : null}
          <InputPanel
            connectionState={connectionState}
            continuityErrorCopy={continuityErrorCopy}
            continuityLockActive={effectiveContinuityLockActive}
            draft={activeSession.draft}
            forceUnlocked={forceUnlocked}
            isQueued={isQueued}
            onSubmit={submitMessage}
            providerTheme={providerTheme}
            terminalNoResume={terminalNoResume}
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
      <div className="session-app" data-session-style-source="canonical">
        <EmptyState pending={props.emptyStatePending === true} />
      </div>
    );
  }

  return <SessionViewBody {...props} />;
};

export default SessionView;
