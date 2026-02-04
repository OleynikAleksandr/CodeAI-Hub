import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import DialogPanel from "./dialog-panel";
import EmptyState from "./empty-state";
import { mapProviderTheme } from "./helpers";
import InputPanel from "./input-panel";
import StatusPanel from "./status-panel";
import {
  buildTokenDebugSummary,
  buildVirtualConversationMessages,
  computeFallbackContinuationIndex,
  resolveActiveSessionSnapshot,
  resolveContinuationChain,
  resolveProviderDisplayLabel,
  SessionHeader,
  useAgentWorkingIndicator,
} from "./virtual-conversation";

type TokenUsage = {
  readonly used: number;
  readonly limit: number;
};

const computeRemainingPercent = (usage: TokenUsage): number => {
  const remaining = usage.limit - usage.used;
  if (!Number.isFinite(remaining) || usage.limit <= 0) {
    return 0;
  }
  return Math.round((remaining / usage.limit) * 100);
};

const buildSessionBanner = (options: {
  readonly session: SessionSnapshot;
  readonly continuationIndex: number | null;
}): JSX.Element | null => {
  const isRolloverBlocked =
    options.session.status.connectionState === "blocked";
  const rollover = options.session.status.rollover ?? null;
  const fallbackRemainingPercent = computeRemainingPercent(
    options.session.status.tokenUsage
  );
  const remainingPercent =
    typeof rollover?.remainingPercent === "number"
      ? rollover.remainingPercent
      : fallbackRemainingPercent;
  const thresholdPercent =
    typeof rollover?.thresholdPercent === "number"
      ? rollover.thresholdPercent
      : null;
  const shouldShowRestoringBanner =
    !isRolloverBlocked &&
    typeof options.continuationIndex === "number" &&
    options.continuationIndex >= 2 &&
    !options.session.messages.some((message) => message.role === "assistant");

  if (isRolloverBlocked) {
    return (
      <output aria-live="polite" className="session-panel">
        <div>
          Context is running low (~{remainingPercent}% remaining
          {thresholdPercent !== null ? `, threshold ${thresholdPercent}%` : ""}
          ). I'll now automatically move this work into a new segment to
          continue without losing quality.
        </div>
        <div>
          Steps: 1) generate a Continuity Report 2) open a new session 3)
          restore context (this can take up to ~6 minutes).
        </div>
      </output>
    );
  }

  if (shouldShowRestoringBanner) {
    return (
      <output aria-live="polite" className="session-panel">
        Continuation created. The agent is restoring context (reading the
        Continuity Report and key files)… Usually 1–6 minutes.
      </output>
    );
  }

  return null;
};

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
  const continuationIndex =
    typeof activeRecord?.continuationIndex === "number"
      ? activeRecord.continuationIndex
      : computeFallbackContinuationIndex({
          record: activeRecord ?? null,
          sessions: allSessions,
        });
  const primaryProviderId = activeRecord?.providerIds[0] ?? null;
  const providerTheme = mapProviderTheme(primaryProviderId);
  const providerDisplayLabel = resolveProviderDisplayLabel({
    providerId: primaryProviderId,
    providerLabels,
  });

  const lastMessage = activeSession?.messages.at(-1) ?? null;
  const lastMessageRole = lastMessage?.role ?? null;
  const lastMessageCreatedAt = lastMessage?.createdAt ?? null;
  const showAgentWorkingIndicator = useAgentWorkingIndicator({
    activeSessionId,
    lastMessageRole,
    lastMessageCreatedAt,
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

  if (!(activeSession && activeSessionId)) {
    return (
      <div className="session-app">
        {header}
        <div className="session-app__content" />
      </div>
    );
  }
  const continuationChain = activeRecord
    ? resolveContinuationChain({ sessions: allSessions, activeSessionId })
    : [];
  const virtualConversationMessages =
    continuationChain.length <= 1
      ? activeSession.messages
      : buildVirtualConversationMessages({
          chain: continuationChain,
          snapshots,
        });

  const tokenDebugSummary =
    buildTokenDebugSummary({
      chain: continuationChain,
      snapshots,
      activeSessionId,
    }) ?? undefined;

  const banner = buildSessionBanner({
    session: activeSession,
    continuationIndex,
  });
  const isRolloverBlocked = activeSession.status.connectionState === "blocked";

  const agentWorkingBanner =
    showAgentWorkingIndicator && !isRolloverBlocked ? (
      <output aria-live="polite" className="session-panel">
        Agent is working…
      </output>
    ) : null;

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
          {banner}
          {agentWorkingBanner}
          <InputPanel
            draft={activeSession.draft}
            isBlocked={isRolloverBlocked}
            onSubmit={(text) => onSendMessage(activeSessionId, text)}
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
