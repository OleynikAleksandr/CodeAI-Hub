import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import { type BridgeEvent, readAppliedProviderTurnConfig } from "../types";
import { ManagedCoreGatedLockController } from "./managed-core-gated-lock-controller";
import type { SessionContinuityLockService } from "./session-continuity-lock-service";
import type { SessionContinuityRolloverOrchestrator } from "./session-continuity-rollover-orchestrator";
import {
  CONTINUITY_ROLLOVER_PENDING_ERROR_CODE,
  CONTINUITY_ROLLOVER_PENDING_ERROR_MESSAGE,
  type FlowNodeRolloverSendGuardDecision,
} from "./session-request-handler.types";
import type { SessionRequestHandlerAppliedTurnConfig } from "./session-request-handler-applied-turn-config";
import type {
  MessageContentPayload,
  SessionRequestHandlerEventMessages,
} from "./session-request-handler-event-messages";
import { SessionRequestHandlerManagedReviewDecisions } from "./session-request-handler-managed-review-decisions";
import type { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";
import type { SessionRequestHandlerResumeLifecycle } from "./session-request-handler-resume-lifecycle";
import type { ProviderSessionBindingLike } from "./session-request-handler-runtime-types";
import type { SessionRequestHandlerStopRebind } from "./session-request-handler-stop-rebind";
import { shouldHideUserMessage } from "./workflow-turn-control";

interface SessionRequestHandlerSessionActionsOptions {
  readonly appliedTurnConfig: SessionRequestHandlerAppliedTurnConfig;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly continuityLockService: SessionContinuityLockService;
  readonly continuityRolloverOrchestrator: SessionContinuityRolloverOrchestrator;
  readonly developmentTreeAgentGateway?: DevelopmentTreeAgentSessionGateway;
  readonly eventMessages: SessionRequestHandlerEventMessages;
  readonly logger: Logger;
  readonly messageDispatch: SessionRequestHandlerMessageDispatch;
  readonly onProviderFailure: (
    providerId: string,
    error: unknown,
    sessionId?: string
  ) => void;
  readonly providerRegistry: ProviderRegistry;
  readonly providerSessions: Map<string, ProviderSessionBindingLike>;
  readonly resumeLifecycle: SessionRequestHandlerResumeLifecycle;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly stopRebind: SessionRequestHandlerStopRebind;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
}

const MANAGED_REVIEW_CONFIRM_CONTENT = "подтверждаю";
const MANAGED_REVIEW_ACTION_KEY = "managedReviewAction";

interface ManagedReviewConfirmAction {
  readonly reviewMessageId: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readManagedReviewConfirmAction = (
  turnOptions: Record<string, unknown> | undefined
): ManagedReviewConfirmAction | null => {
  const action = turnOptions?.[MANAGED_REVIEW_ACTION_KEY];
  if (!isRecord(action) || action.type !== "confirm") {
    return null;
  }
  return {
    reviewMessageId:
      typeof action.reviewMessageId === "string"
        ? action.reviewMessageId
        : null,
  };
};

const resolveCurrentReviewGateMessageId = (session: Session): string | null => {
  for (let index = session.messages.length - 1; index >= 0; index -= 1) {
    const message = session.messages[index];
    if (
      message?.role === "system" &&
      message.tag === "managed-workflow-user-review"
    ) {
      return index === session.messages.length - 1 ? message.id : null;
    }
  }
  return null;
};

export class SessionRequestHandlerSessionActions {
  private readonly deps: SessionRequestHandlerSessionActionsOptions;
  private readonly managedCoreGatedLock: ManagedCoreGatedLockController;
  private readonly managedReviewDecisions: SessionRequestHandlerManagedReviewDecisions;

  constructor(options: SessionRequestHandlerSessionActionsOptions) {
    this.deps = options;
    this.managedCoreGatedLock = new ManagedCoreGatedLockController(options);
    this.managedReviewDecisions =
      new SessionRequestHandlerManagedReviewDecisions({
        broadcaster: (event) => options.broadcaster(event as BridgeEvent),
        developmentTreeAgentGateway: options.developmentTreeAgentGateway,
        eventMessages: options.eventMessages,
        managedInputGate: {
          lock: (sessionId) =>
            this.managedCoreGatedLock.lockForCoreArbitration(sessionId),
          release: (sessionId) =>
            this.managedCoreGatedLock.apply(sessionId, undefined),
        },
        messageDispatch: options.messageDispatch,
      });
  }

  async handleSwitchRequest(options: {
    readonly sessionId: string;
    readonly mode: "retry_in_place" | "switch_model" | "switch_provider";
    readonly targetProviderId?: string;
    readonly targetModelId?: string;
  }): Promise<void> {
    const session = this.deps.sessionManager.getSession(options.sessionId);
    if (!session) {
      this.deps.logger.warn("Switch request: session not found", {
        sessionId: options.sessionId,
      });
      return;
    }
    const switchTurnOptions =
      options.mode === "switch_model" && options.targetModelId
        ? this.applySwitchModelBinding(session, options.targetModelId)
        : undefined;
    const adapter = this.deps.providerRegistry.getAdapter(session.providerId);
    if (!adapter) {
      this.deps.logger.warn("Switch request: provider adapter unavailable", {
        sessionId: options.sessionId,
        providerId: session.providerId,
      });
      return;
    }
    if (options.mode === "switch_model" && options.targetModelId) {
      const adapterAny = adapter as { setModelOverride?: (m: string) => void };
      if (typeof adapterAny.setModelOverride === "function") {
        adapterAny.setModelOverride(options.targetModelId);
        this.deps.logger.info("Switch request: model override applied", {
          sessionId: options.sessionId,
          targetModelId: options.targetModelId,
        });
      }
    }
    const lastUserMessage = [...session.messages]
      .reverse()
      .find((message) => message.role === "user");
    if (!lastUserMessage) {
      this.deps.logger.warn("Switch request: no user message to resend", {
        sessionId: options.sessionId,
      });
      return;
    }
    this.deps.logger.info("Switch request: resending last user message", {
      sessionId: options.sessionId,
      mode: options.mode,
      contentLength: lastUserMessage.content.length,
    });
    await this.handleMessage(options.sessionId, {
      content: lastUserMessage.content,
      turnOptions: switchTurnOptions,
    });
  }

  private applySwitchModelBinding(
    session: Session,
    targetModelId: string
  ): Record<string, unknown> | undefined {
    const turnOptions = this.deps.appliedTurnConfig.attachToTurnOptions({
      providerId: session.providerId,
      targetModelId,
    });
    const turnConfig = readAppliedProviderTurnConfig(turnOptions);
    const modelId = turnConfig?.effectiveModelId ?? turnConfig?.modelId;
    if (!(turnConfig && modelId)) {
      return turnOptions;
    }

    const now = new Date().toISOString();
    const modelBinding = {
      key: session.modelBinding?.key ?? `session:${session.id}`,
      providerId: session.providerId,
      baseModelId: turnConfig.baseModelId ?? turnConfig.modelId,
      modelId,
      reasoningEffort: turnConfig.reasoningEffort,
      thinkingEnabled: turnConfig.thinkingEnabled,
      thinkingLevel: turnConfig.thinkingLevel,
      source: "switch_request" as const,
      boundAt: session.modelBinding?.boundAt ?? now,
      updatedAt: now,
    };
    this.deps.sessionManager.setModelBinding(session.id, modelBinding);
    this.deps.broadcaster({
      type: "session:model:update",
      payload: {
        sessionId: session.id,
        providerId: session.providerId,
        baseModelId: modelBinding.baseModelId,
        modelId,
        modelBinding,
        source: "switch_request",
      },
    });
    return turnOptions;
  }

  async handleMessage(
    sessionId: string,
    messagePayload: MessageContentPayload
  ): Promise<void> {
    this.deps.logger.info("Session message received", {
      sessionId,
      payloadType: typeof messagePayload,
    });
    const extracted =
      this.deps.eventMessages.extractMessageContentAndTurnOptions(
        messagePayload
      );
    if (!extracted) {
      this.deps.logger.warn("Received invalid message payload", { sessionId });
      return;
    }
    const { content, turnOptions } = extracted;
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      this.emitSessionNotFoundError(sessionId);
      return;
    }
    this.deps.logger.info("Session message extracted", {
      sessionId,
      contentLength: content.length,
      hasTurnOptions: turnOptions !== undefined,
    });
    this.logResolvedSessionForIncomingMessage(sessionId, session);
    const lifecycleState =
      this.deps.resumeLifecycle.getSessionResumeLifecycleState(session);
    if (
      lifecycleState.mode === "no_resume" &&
      lifecycleState.finalTurnCompleted
    ) {
      this.deps.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          code: "session_terminal_read_only",
          message:
            "This session is terminal and read-only. Create a new session to continue.",
        },
      });
      return;
    }
    if (
      lifecycleState.finalTurnCompleted ||
      lifecycleState.terminalLockReason !== null
    ) {
      this.deps.resumeLifecycle.updateSessionResumeLifecycleState(session, {
        finalTurnCompleted: false,
        terminalLockReason: null,
      });
    }
    this.deps.resumeLifecycle.clearPostTurnContextDecision(sessionId);
    const rolloverSendGuard = this.resolveFlowNodeRolloverSendGuard(sessionId);
    if (!rolloverSendGuard.allowed) {
      this.deps.logger.warn(
        "Blocked send while flow-node rollover is pending",
        {
          sessionId,
          sourceSessionId: rolloverSendGuard.sourceSessionId,
          targetSessionId: rolloverSendGuard.targetSessionId,
          code: rolloverSendGuard.code,
        }
      );
      this.deps.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          message: rolloverSendGuard.message,
          code: rolloverSendGuard.code,
          sourceSessionId: rolloverSendGuard.sourceSessionId,
          targetSessionId: rolloverSendGuard.targetSessionId,
        },
      });
      return;
    }
    if (!(await this.deps.stopRebind.ensureSessionReadyForSend(session))) {
      return;
    }
    const hiddenUserMessage = shouldHideUserMessage(turnOptions);
    const reviewAction = readManagedReviewConfirmAction(turnOptions);
    if (reviewAction) {
      await this.handleManagedReviewConfirmAction({
        hiddenUserMessage,
        reviewMessageId: reviewAction.reviewMessageId,
        session,
        sessionId,
      });
      return;
    }
    if (
      await this.managedReviewDecisions.handleReviewDecision({
        content,
        hiddenUserMessage,
        session,
        sessionId,
      })
    ) {
      return;
    }
    await this.deps.messageDispatch.dispatchUserMessage({
      session,
      sessionId,
      content,
      turnOptions,
      hiddenUserMessage,
    });
  }

  private async handleManagedReviewConfirmAction(options: {
    readonly hiddenUserMessage: boolean;
    readonly reviewMessageId: string | null;
    readonly session: Session;
    readonly sessionId: string;
  }): Promise<void> {
    const currentReviewMessageId = resolveCurrentReviewGateMessageId(
      options.session
    );
    if (
      !currentReviewMessageId ||
      (options.reviewMessageId &&
        options.reviewMessageId !== currentReviewMessageId)
    ) {
      this.deps.broadcaster({
        type: "session:error",
        payload: {
          sessionId: options.sessionId,
          code: "managed_review_gate_stale",
          message: "Managed review confirmation is stale or already closed.",
        },
      });
      return;
    }
    if (
      await this.managedReviewDecisions.handleReviewDecision({
        content: MANAGED_REVIEW_CONFIRM_CONTENT,
        hiddenUserMessage: options.hiddenUserMessage,
        session: options.session,
        sessionId: options.sessionId,
      })
    ) {
      return;
    }
    this.deps.eventMessages.appendCoreMessage(options.sessionId, {
      content: [
        "Core could not match the review confirmation to an open managed gate.",
        "The input is released. Send any message and Core will re-validate the workflow state and reopen the correct gate.",
      ].join("\n"),
      tag: "managed-workflow-validation",
    });
    this.deps.broadcaster({
      type: "session:error",
      payload: {
        sessionId: options.sessionId,
        code: "managed_review_gate_unhandled",
        message: "Managed review confirmation could not be applied.",
      },
    });
  }

  async handleDelete(sessionId: string): Promise<void> {
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      this.emitSessionNotFoundError(sessionId);
      return;
    }
    const binding = this.deps.providerSessions.get(sessionId);
    if (binding) {
      const adapter = this.deps.providerRegistry.getAdapter(binding.providerId);
      binding.unsubscribe();
      this.deps.providerSessions.delete(sessionId);
      try {
        await adapter?.closeSession(binding.providerSessionId);
      } catch (error) {
        this.deps.onProviderFailure(binding.providerId, error, sessionId);
      }
    }
    if (!this.deps.sessionManager.deleteSession(sessionId)) {
      return;
    }
    this.deps.sessionStorage.close(sessionId, "session-deleted");
    this.deps.resumeLifecycle.clearSessionLifecycle(sessionId);
    this.deps.workspaceRuntime?.notifySessionDeleted({
      workspaceRoot: session.workspacePath,
      nodeId: session.stage ?? "session",
      sessionId: session.id,
    });
    this.deps.broadcaster({ type: "session:deleted", payload: { sessionId } });
  }

  private emitSessionNotFoundError(sessionId: string): void {
    this.deps.broadcaster({
      type: "session:error",
      payload: { sessionId, message: "Session not found" },
    });
    this.deps.logger.warn("Session not found for incoming message", {
      sessionId,
    });
  }

  private resolveFlowNodeRolloverSendGuard(
    sessionId: string
  ): FlowNodeRolloverSendGuardDecision {
    if (
      this.deps.resumeLifecycle.hasPendingPostTurnContextDecision(sessionId)
    ) {
      return {
        allowed: false,
        code: CONTINUITY_ROLLOVER_PENDING_ERROR_CODE,
        message: "Session continuity context decision is pending. Please wait.",
        sourceSessionId: sessionId,
        targetSessionId: null,
      };
    }
    const context = this.deps.continuityLockService.getContext(sessionId);
    if (!context || context.sourceSessionId !== sessionId) {
      return { allowed: true };
    }
    if (
      context.targetSessionId === sessionId &&
      context.awaitingBootstrapTurn
    ) {
      return {
        allowed: false,
        code: CONTINUITY_ROLLOVER_PENDING_ERROR_CODE,
        message: CONTINUITY_ROLLOVER_PENDING_ERROR_MESSAGE,
        sourceSessionId: context.sourceSessionId,
        targetSessionId: context.targetSessionId ?? null,
      };
    }
    return {
      allowed: false,
      code: CONTINUITY_ROLLOVER_PENDING_ERROR_CODE,
      message: CONTINUITY_ROLLOVER_PENDING_ERROR_MESSAGE,
      sourceSessionId: context.sourceSessionId,
      targetSessionId: context.targetSessionId ?? null,
    };
  }

  private logResolvedSessionForIncomingMessage(
    sessionId: string,
    session: Session
  ): void {
    this.deps.logger.info("Resolved session for incoming message", {
      sessionId,
      providerId: session.providerId,
      providerSessionId: session.providerSessionId ?? null,
      providerSessionStatus: session.providerSessionStatus,
      stage: session.stage ?? null,
      initiativeSlug: session.initiativeSlug ?? null,
      runSlug: session.runSlug ?? null,
    });
  }
}
