import { useEffect, useRef, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import { AnimatedDots } from "./animated-dots";
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
} from "./virtual-conversation";

type TokenUsage = {
  readonly used: number;
  readonly limit: number;
};

const AGENT_WORKING_SILENCE_MS = 10_000;

type ConnectionState = SessionSnapshot["status"]["connectionState"];

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
  readonly providerTheme: ReturnType<typeof mapProviderTheme>;
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
  const bannerClasses = [
    "session-panel",
    "session-banner",
    options.providerTheme ? `session-banner--${options.providerTheme}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  if (isRolloverBlocked) {
    return (
      <output aria-live="polite" className={bannerClasses}>
        <div>
          Context is running low (~{remainingPercent}% remaining
          {thresholdPercent !== null ? `, threshold ${thresholdPercent}%` : ""}
          ). Preparing a continuation to keep quality high.
        </div>
      </output>
    );
  }

  if (shouldShowRestoringBanner) {
    return (
      <output aria-live="polite" className={bannerClasses}>
        Continuation created. Restoring context…
      </output>
    );
  }

  return null;
};

const resolveLastThinkingOrAssistantAt = (
  messages: readonly SessionSnapshot["messages"][number][]
): number | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "thinking" || message?.role === "assistant") {
      return message.createdAt;
    }
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
  const [showAgentWorkingIndicator, setShowAgentWorkingIndicator] =
    useState(false);
  const previousConnectionStateRef = useRef<ConnectionState>(connectionState);
  const runningStartedAtRef = useRef<number | null>(null);

  const continuationChain =
    activeRecord && activeSessionId
      ? resolveContinuationChain({ sessions: allSessions, activeSessionId })
      : [];
  const virtualConversationMessages =
    activeSession && activeSessionId && continuationChain.length > 1
      ? buildVirtualConversationMessages({
          chain: continuationChain,
          snapshots,
        })
      : (activeSession?.messages ?? []);
  const lastThinkingOrAssistantAt = resolveLastThinkingOrAssistantAt(
    virtualConversationMessages
  );

  useEffect(() => {
    const previous = previousConnectionStateRef.current;
    if (connectionState === "running" && previous !== "running") {
      runningStartedAtRef.current = Date.now();
    }
    if (connectionState !== "running") {
      runningStartedAtRef.current = null;
    }
    previousConnectionStateRef.current = connectionState;
  }, [connectionState]);

  useEffect(() => {
    setShowAgentWorkingIndicator(false);
    if (connectionState !== "running" || isRolloverBlocked) {
      return;
    }

    const runningStartedAt = runningStartedAtRef.current ?? Date.now();
    const baseAt = Math.max(runningStartedAt, lastThinkingOrAssistantAt ?? 0);
    const elapsedMs = Date.now() - baseAt;
    const delayMs = Math.max(0, AGENT_WORKING_SILENCE_MS - elapsedMs);
    const timer = window.setTimeout(() => {
      setShowAgentWorkingIndicator(true);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [connectionState, isRolloverBlocked, lastThinkingOrAssistantAt]);

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

  const banner = buildSessionBanner({
    session: activeSession,
    continuationIndex,
    providerTheme,
  });

  const agentWorkingBanner =
    showAgentWorkingIndicator && !isRolloverBlocked ? (
      <output aria-live="polite" className="session-panel">
        <span>Agent is working</span>
        <AnimatedDots theme={providerTheme} />
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
            connectionState={connectionState}
            draft={activeSession.draft}
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
