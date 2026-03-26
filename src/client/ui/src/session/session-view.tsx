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
import { SwitchRecoveryBanner } from "./switch-recovery-banner";
import {
  buildTokenDebugSummary,
  resolveActiveSessionSnapshot,
  resolveProviderDisplayLabel,
  SessionHeader,
} from "./virtual-conversation";

type ConnectionState = SessionSnapshot["status"]["connectionState"];

const RESUMING_LOCK_REASONS = new Set([
  "context_check_pending",
  "threshold_reached",
  "report_in_progress",
  "resume_bootstrap",
] as const);

const resolveInputConnectionState = (options: {
  readonly connectionState: ConnectionState;
  readonly bindingStatus: "pending" | "ready" | "failed" | null;
  readonly continuityLockActive: boolean;
  readonly continuityLockReason: string | undefined;
}): ConnectionState => {
  if (options.connectionState !== "running") {
    return options.connectionState;
  }
  if (options.bindingStatus === "pending") {
    return "blocked";
  }
  if (
    options.continuityLockActive &&
    options.continuityLockReason &&
    RESUMING_LOCK_REASONS.has(options.continuityLockReason as never)
  ) {
    return "blocked";
  }
  return options.connectionState;
};

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
  readonly switchOffer?: SwitchOfferProp | null;
  readonly onDismissSwitchOffer?: () => void;
};

type SwitchOfferProp = {
  readonly reason: string;
  readonly canRetryInPlace: boolean;
  readonly recommendedTarget: SwitchTargetProp | null;
  readonly alternativeTargets: readonly SwitchTargetProp[];
};

type SwitchTargetProp = {
  readonly providerId: string;
  readonly modelId: string | null;
  readonly mode: "retry_in_place" | "switch_model" | "switch_provider";
};

const SwitchOfferBanner = ({
  offer,
  onDismiss,
}: {
  readonly offer: SwitchOfferProp;
  readonly onDismiss?: () => void;
}) => (
  <SwitchRecoveryBanner
    alternativeTargets={offer.alternativeTargets.map((t) => ({
      ...t,
      label: t.providerId,
    }))}
    canRetryInPlace={offer.canRetryInPlace}
    onDismiss={onDismiss}
    onRetryInPlace={offer.canRetryInPlace ? onDismiss : undefined}
    onSelectTarget={() => onDismiss?.()}
    reason={offer.reason}
    recommendedTarget={
      offer.recommendedTarget
        ? {
            ...offer.recommendedTarget,
            label: offer.recommendedTarget.providerId,
          }
        : null
    }
  />
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
  switchOffer,
  onDismissSwitchOffer,
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
  const continuityLockReason = activeSession?.status.continuityLock?.reason;
  const terminalNoResume = continuityLockReason === "terminal_no_resume";
  const continuityLockActive =
    activeSession?.status.continuityLock?.active === true ||
    connectionState === "blocked" ||
    terminalNoResume;
  const inputConnectionState = resolveInputConnectionState({
    connectionState,
    bindingStatus: activeSession?.binding.status ?? null,
    continuityLockActive,
    continuityLockReason,
  });
  const effectiveContinuityLockActive = continuityLockActive;
  const queueConnectionState: ConnectionState =
    effectiveContinuityLockActive && connectionState !== "running"
      ? "blocked"
      : connectionState;
  const continuityErrorCopy = resolveContinuityErrorCopy(activeSession);

  const { isQueued, submitMessage } = useQueuedSend({
    activeSessionId,
    connectionState: queueConnectionState,
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
          {switchOffer ? (
            <SwitchOfferBanner
              offer={switchOffer}
              onDismiss={onDismissSwitchOffer}
            />
          ) : null}
          {terminalNoResume ? (
            <div className="session-input__hint">
              This session is complete and read-only.
            </div>
          ) : null}
          <InputPanel
            connectionState={inputConnectionState}
            continuityErrorCopy={continuityErrorCopy}
            continuityLockActive={effectiveContinuityLockActive}
            draft={activeSession.draft}
            isQueued={isQueued}
            onSubmit={submitMessage}
            providerTheme={providerTheme}
            taskTimer={activeSession.status.taskTimer ?? null}
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
