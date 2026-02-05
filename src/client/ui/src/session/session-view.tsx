import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import DialogPanel from "./dialog-panel";
import EmptyState from "./empty-state";
import { mapProviderTheme } from "./helpers";
import InputPanel from "./input-panel";
import {
  computeShouldShowWorkingCopy,
  resolveContinuationChainOrEmpty,
  resolveContinuationIndex,
  resolveLastThinkingOrAssistantAt,
  resolveVirtualConversationMessages,
  useAgentWorkingSilenceIndicator,
  useQueuedSend,
} from "./session-view-helpers";
import StatusPanel from "./status-panel";
import {
  buildTokenDebugSummary,
  resolveActiveSessionSnapshot,
  resolveProviderDisplayLabel,
  SessionHeader,
} from "./virtual-conversation";
import { WorkingStrip } from "./working-strip";

const AGENT_WORKING_SILENCE_MS = 5000;

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
  const continuationIndex = resolveContinuationIndex({
    record: activeRecord ?? null,
    sessions: allSessions,
  });
  const primaryProviderId = activeRecord?.providerIds[0] ?? null;
  const providerTheme = mapProviderTheme(primaryProviderId);
  const providerDisplayLabel = resolveProviderDisplayLabel({
    providerId: primaryProviderId,
    providerLabels,
  });

  const header = (
    <SessionHeader
      activeSession={activeSession}
      activeSessionId={activeSessionId}
      continuationIndex={continuationIndex}
      onCloseSession={onCloseSession}
      onSelectSession={onSelectSession}
      providerLabels={providerLabels}
      sessions={sessions}
    />
  );

  const connectionState: ConnectionState =
    activeSession?.status.connectionState ?? "idle";
  const isRolloverBlocked = connectionState === "blocked";
  const { isQueued, submitMessage } = useQueuedSend({
    activeSessionId,
    connectionState,
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
  const lastThinkingOrAssistantAt = resolveLastThinkingOrAssistantAt(
    virtualConversationMessages
  );
  const showAgentWorkingIndicator = useAgentWorkingSilenceIndicator({
    connectionState,
    isRolloverBlocked,
    lastThinkingOrAssistantAt,
    silenceMs: AGENT_WORKING_SILENCE_MS,
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

  const shouldShowWorkingCopy = computeShouldShowWorkingCopy({
    connectionState,
    isRolloverBlocked,
    showAgentWorkingIndicator,
    virtualConversationMessages,
  });

  return (
    <div className="session-app">
      {header}
      <div className="session-app__content">
        <div className="session-app__dialog">
          <DialogPanel
            messages={virtualConversationMessages}
            providerLabel={providerDisplayLabel}
            providerTheme={providerTheme}
          />
        </div>
        <div className="session-app__rails">
          <WorkingStrip
            isWorking={shouldShowWorkingCopy}
            providerTheme={providerTheme}
          />
          <InputPanel
            connectionState={connectionState}
            draft={activeSession.draft}
            isQueued={isQueued}
            onSubmit={submitMessage}
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
