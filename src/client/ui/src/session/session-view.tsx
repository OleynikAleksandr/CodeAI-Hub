import type { CodexReasoningLevel } from "../../../../types/codex-model-registry";
import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord, SessionSnapshot } from "../../../../types/session";
import DialogPanel from "./dialog-panel";
import { buildTokenDebugSummaryFromMessages } from "./dialog-segment-meta";
import EmptyState from "./empty-state";
import type { FileLinkTarget } from "./file-link-target";
import { mapProviderTheme } from "./helpers";
import InputPanel from "./input-panel";
import SessionIdBar, { type UsageLimitsRefreshRequest } from "./session-id-bar";
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

interface SessionViewProps {
  readonly activeSessionId: string | null;
  readonly allSessions?: readonly SessionRecord[];
  readonly coreConnectionDetail?: string;
  readonly coreConnectionStatus: "connecting" | "ready" | "error";
  readonly emptyStatePending?: boolean;
  readonly onCloseSession: (sessionId: string) => void;
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
  readonly onRefreshUsageLimits?: (request: UsageLimitsRefreshRequest) => void;
  readonly onSelectModel?: (
    sessionId: string,
    modelId: string,
    reasoning: CodexReasoningLevel
  ) => void;
  readonly onSelectReasoning?: (
    sessionId: string,
    reasoning: CodexReasoningLevel
  ) => void;
  readonly onSelectSession: (sessionId: string) => void;
  readonly onSendMessage: (sessionId: string, content: string) => void;
  readonly providerLabels: ReadonlyMap<ProviderStackId, string>;
  readonly sessions: readonly SessionRecord[];
  readonly showEmptyState: boolean;
  readonly showThinkingMessages?: boolean;
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
  readonly tokenDebugSummaryOverride?: string;
}

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
  onFileLinkActivate,
  onRefreshUsageLimits,
  onSelectModel,
  onSelectReasoning,
  onSendMessage,
  showThinkingMessages,
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
    showThinkingMessages,
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
        onRefreshUsageLimits={onRefreshUsageLimits}
        sessionId={activeSessionId}
        status={activeSession.status}
      />
      <div className="session-app__content">
        <div className="session-app__dialog">
          <DialogPanel
            messages={virtualConversationMessages}
            onFileLinkActivate={onFileLinkActivate}
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
            continuityErrorCopy={continuityErrorCopy}
            continuityLockActive={effectiveContinuityLockActive}
            draft={activeSession.draft}
            isQueued={isQueued}
            onSubmit={submitMessage}
            providerTheme={providerTheme}
            sessionId={activeSessionId}
            taskTimer={activeSession.status.taskTimer ?? null}
            terminalNoResume={terminalNoResume}
          />
          <StatusPanel
            connectionDetail={coreConnectionDetail}
            connectionStatus={coreConnectionStatus}
            onSelectModel={
              onSelectModel
                ? (modelId, reasoning) =>
                    onSelectModel(activeSessionId, modelId, reasoning)
                : undefined
            }
            onSelectReasoning={
              onSelectReasoning
                ? (reasoning) => onSelectReasoning(activeSessionId, reasoning)
                : undefined
            }
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
