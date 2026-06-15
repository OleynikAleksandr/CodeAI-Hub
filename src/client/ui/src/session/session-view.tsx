import { useEffect, useState } from "react";
import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../types/claude-model-registry";
import type { CodexReasoningLevel } from "../../../../types/codex-model-registry";
import type { ProviderStackId } from "../../../../types/provider";
import type {
  SessionMessage,
  SessionRecord,
  SessionSnapshot,
} from "../../../../types/session";
import DialogPanel from "./dialog-panel";
import { resolveDisplayContent } from "./dialog-panel-message-utils";
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
import type { StatusPanelLocalModelOption } from "./status-panel-model-picker";
import {
  buildTokenDebugSummary,
  resolveActiveSessionSnapshot,
  resolveProviderDisplayLabel,
  SessionHeader,
} from "./virtual-conversation";

type ConnectionState = SessionSnapshot["status"]["connectionState"];
type ClaudeThinkingSelection = ClaudeThinkingEffort | "off";
const MANAGED_REVIEW_ACCEPTANCE_CONTENT = "подтверждаю";
type SessionSendTurnOptions = Record<string, unknown>;

const RESUMING_LOCK_REASONS = new Set([
  "threshold_reached",
  "report_in_progress",
  "resume_bootstrap",
] as const);

const isThinkingTurnMessage = (message: SessionMessage | undefined): boolean =>
  message?.role === "thinking" ||
  (message?.role === "assistant" && message.tag === "thinking");

const resolveThinkingInputConnectionState = (
  connectionState: ConnectionState,
  latestMessage: SessionMessage | undefined
): ConnectionState =>
  connectionState === "idle" && isThinkingTurnMessage(latestMessage)
    ? "running"
    : connectionState;

export const isSessionResumeLockReason = (
  reason: string | undefined
): boolean =>
  reason !== undefined && RESUMING_LOCK_REASONS.has(reason as never);

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
    isSessionResumeLockReason(options.continuityLockReason)
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
  readonly localModelOptions?: readonly StatusPanelLocalModelOption[];
  readonly onCloseSession: (sessionId: string) => void;
  readonly onFileLinkActivate?: (target: FileLinkTarget) => void;
  readonly onRefreshUsageLimits?: (request: UsageLimitsRefreshRequest) => void;
  readonly onSelectClaudeModel?: (
    sessionId: string,
    modelId: ClaudeModelAliasId
  ) => void;
  readonly onSelectClaudeThinking?: (
    sessionId: string,
    thinking: ClaudeThinkingSelection
  ) => void;
  readonly onSelectModel?: (sessionId: string, modelId: string) => void;
  readonly onSelectReasoning?: (
    sessionId: string,
    reasoning: CodexReasoningLevel
  ) => void;
  readonly onSelectSession: (sessionId: string) => void;
  readonly onSendMessage: (
    sessionId: string,
    content: string,
    turnOptions?: SessionSendTurnOptions
  ) => void;
  readonly onSpeakMessage?: (request: {
    readonly messageId: string;
    readonly providerId?: string | null;
    readonly sessionId: string;
    readonly text: string;
  }) => void;
  readonly providerLabels: ReadonlyMap<ProviderStackId, string>;
  readonly sessions: readonly SessionRecord[];
  readonly showEmptyState: boolean;
  readonly showThinkingMessages?: boolean;
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
  readonly speakingMessageId?: string | null;
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

const resolveActiveManagedReviewMessageId = (
  messages: readonly {
    readonly id: string;
    readonly role: string;
    readonly tag?: string;
  }[]
): string | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (
      message?.role === "system" &&
      message.tag === "managed-workflow-user-review"
    ) {
      return index === messages.length - 1 ? message.id : null;
    }
  }
  return null;
};

const SessionViewBody = ({
  sessions,
  allSessions: allSessionsProp,
  providerLabels,
  activeSessionId,
  snapshots,
  coreConnectionStatus,
  coreConnectionDetail,
  localModelOptions,
  tokenDebugSummaryOverride,
  onSelectSession,
  onCloseSession,
  onFileLinkActivate,
  onRefreshUsageLimits,
  onSelectClaudeModel,
  onSelectClaudeThinking,
  onSelectModel,
  onSelectReasoning,
  onSendMessage,
  onSpeakMessage,
  showThinkingMessages,
  speakingMessageId,
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
  const [managedReviewPendingId, setManagedReviewPendingId] = useState<
    string | null
  >(null);

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
    activeSession?.status.continuityLock?.active === true || terminalNoResume;
  const resumingLockActive =
    continuityLockActive && isSessionResumeLockReason(continuityLockReason);
  const inputConnectionState = resolveThinkingInputConnectionState(
    resolveInputConnectionState({
      connectionState,
      bindingStatus: activeSession?.binding.status ?? null,
      continuityLockActive,
      continuityLockReason,
    }),
    activeSession?.messages.at(-1)
  );
  const effectiveContinuityLockActive =
    continuityLockActive || managedReviewPendingId !== null;
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
  const activeManagedReviewMessageId = resolveActiveManagedReviewMessageId(
    virtualConversationMessages
  );

  useEffect(() => {
    if (
      managedReviewPendingId &&
      managedReviewPendingId !== activeManagedReviewMessageId
    ) {
      setManagedReviewPendingId(null);
    }
  }, [activeManagedReviewMessageId, managedReviewPendingId]);

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
            activeManagedReviewMessageId={activeManagedReviewMessageId}
            managedReviewAcceptPending={managedReviewPendingId !== null}
            messages={virtualConversationMessages}
            onFileLinkActivate={onFileLinkActivate}
            onManagedReviewAccept={(message) => {
              if (
                !(
                  activeSessionId && message.id === activeManagedReviewMessageId
                )
              ) {
                return;
              }
              setManagedReviewPendingId(message.id);
              onSendMessage(
                activeSessionId,
                MANAGED_REVIEW_ACCEPTANCE_CONTENT,
                {
                  managedReviewAction: {
                    reviewMessageId: message.id,
                    type: "confirm",
                  },
                }
              );
            }}
            onSpeakMessage={
              onSpeakMessage
                ? (message) =>
                    onSpeakMessage({
                      messageId: message.id,
                      providerId: primaryProviderId,
                      sessionId: activeSessionId,
                      text: resolveDisplayContent(message),
                    })
                : undefined
            }
            providerLabel={providerDisplayLabel}
            providerTheme={providerTheme}
            speakingMessageId={speakingMessageId}
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
            gatePresent={activeManagedReviewMessageId !== null}
            isQueued={isQueued}
            onSubmit={submitMessage}
            providerTheme={providerTheme}
            resumingLockActive={resumingLockActive}
            sessionId={activeSessionId}
            taskTimer={activeSession.status.taskTimer ?? null}
            terminalNoResume={terminalNoResume}
          />
          <StatusPanel
            connectionDetail={coreConnectionDetail}
            connectionStatus={coreConnectionStatus}
            localModelOptions={localModelOptions}
            onSelectClaudeModel={
              onSelectClaudeModel
                ? (modelId) => onSelectClaudeModel(activeSessionId, modelId)
                : undefined
            }
            onSelectClaudeThinking={
              onSelectClaudeThinking
                ? (thinking) =>
                    onSelectClaudeThinking(activeSessionId, thinking)
                : undefined
            }
            onSelectModel={
              onSelectModel
                ? (modelId) => onSelectModel(activeSessionId, modelId)
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
