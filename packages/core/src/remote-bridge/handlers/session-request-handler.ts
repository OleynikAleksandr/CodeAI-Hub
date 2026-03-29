import crypto from "node:crypto";
import type { CoreConfig } from "../../config";
import type { FlowNodeContinuityFacade } from "../../flow-node-continuity/flow-node-continuity-facade";
import type { ProviderRegistry } from "../../provider-registry";
import type { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { SessionResumeMode } from "../../workspace-runtime/workspace-runtime-types";
import type { BridgeEvent } from "../types";
import type {
  ContinuityLockReason,
  EmitContinuityLockEventOptions,
  FlowNodeContinuityLockContext,
  SessionContinuityLockService,
} from "./session-continuity-lock-service";
import type { SessionContinuityRolloverOrchestrator } from "./session-continuity-rollover-orchestrator";
import type {
  DescriptionDialogResolution as DescriptionDialogResolutionModel,
  SessionDescriptionDialogSync,
} from "./session-description-dialog-sync";
import type { SessionProviderBindingService } from "./session-provider-binding-service";
import type { SessionProviderEventRouter } from "./session-provider-event-router";
import type { SessionProviderFailureRecovery } from "./session-provider-failure-recovery";
import {
  CONTINUITY_ROLLOVER_PENDING_ERROR_CODE,
  CONTINUITY_ROLLOVER_PENDING_ERROR_MESSAGE,
  type FlowNodeRolloverSendGuardDecision,
} from "./session-request-handler.types";
import type { SessionRequestHandlerAppliedTurnConfig } from "./session-request-handler-applied-turn-config";
import {
  normalizeContinuityStageId as normalizeContinuityStageIdValue,
  type SessionRequestHandlerContinuityRoot,
} from "./session-request-handler-continuity-root";
import type { SessionRequestHandlerDialogSegmentMeta } from "./session-request-handler-dialog-segment-meta";
import type {
  MessageContentPayload,
  SessionRequestHandlerEventMessages,
} from "./session-request-handler-event-messages";
import type { SessionRequestHandlerFlowNodeReportState } from "./session-request-handler-flow-node-report-state";
import type { SessionRequestHandlerFlowNodeRollover } from "./session-request-handler-flow-node-rollover";
import type { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";
import type {
  PostTurnContextDecision,
  SessionRequestHandlerResumeLifecycle,
} from "./session-request-handler-resume-lifecycle";
import type { SessionRequestHandlerRetryState } from "./session-request-handler-retry-state";
import { createSessionRequestHandlerRuntime } from "./session-request-handler-runtime";
import type { SessionRequestHandlerSessionBootstrap } from "./session-request-handler-session-bootstrap";
import type { SessionRequestHandlerSessionResolution } from "./session-request-handler-session-resolution";
import type { SessionRequestHandlerTurnArbitration } from "./session-request-handler-turn-arbitration";
import { shouldHideUserMessage } from "./workflow-turn-control";

export interface ProviderSessionBinding {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
}

export type DescriptionDialogResolution = DescriptionDialogResolutionModel;

export interface ContinuityRootResolutionOptions {
  readonly context: {
    readonly initiativeSlug: string | null;
    readonly stage: string | null;
    readonly runSlug: string | null;
    readonly providerSessionId: string | null;
  };
  readonly providerId: string;
  readonly rootSessionIdOverride: string | null;
  readonly sessionId: string;
  readonly workspaceRoot: string;
}

export interface CreateAndRegisterSessionOptions {
  readonly adapter: NonNullable<ReturnType<ProviderRegistry["getAdapter"]>>;
  readonly context: ContinuityRootResolutionOptions["context"];
  readonly continuationParentId?: string | null;
  readonly providerId: string;
  readonly resumeMode?: SessionResumeMode;
  readonly rootSessionId?: string | null;
  readonly silent?: boolean;
  readonly workspacePath: string;
}

export interface ShellSessionCreationResult {
  readonly continuityRootSessionId: string;
  readonly session: Session;
}

export interface SessionRequestHandlerOptions {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly config: CoreConfig;
  readonly continuityClock?: () => string;
  readonly logger: Logger;
  readonly providerRegistry: ProviderRegistry;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly stateBroadcaster: () => void;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
}

export class SessionRequestHandler {
  private readonly providerSessions = new Map<string, ProviderSessionBinding>();
  private readonly continuityRootBySessionId = new Map<string, string>();
  private readonly config: CoreConfig;
  private readonly sessionManager: SessionManager;
  private readonly providerRegistry: ProviderRegistry;
  private readonly sessionStorage: UnifiedSessionStorage;
  private readonly logger: Logger;
  private readonly broadcaster: (event: BridgeEvent) => void;
  private readonly stateBroadcaster: () => void;
  private readonly workspaceRuntime?: WorkspaceRuntimeFacade;
  private readonly continuity: SessionContinuityFacade;
  private readonly descriptionDialogSync: SessionDescriptionDialogSync;
  private readonly providerBindingService: SessionProviderBindingService;
  private readonly providerEventRouter: SessionProviderEventRouter;
  private readonly providerFailureRecovery: SessionProviderFailureRecovery;
  private readonly continuityLockService: SessionContinuityLockService;
  private readonly continuityRolloverOrchestrator: SessionContinuityRolloverOrchestrator;
  private readonly resumeLifecycle: SessionRequestHandlerResumeLifecycle;
  private readonly sessionBootstrap: SessionRequestHandlerSessionBootstrap;
  private readonly sessionResolution: SessionRequestHandlerSessionResolution;
  private readonly messageDispatch: SessionRequestHandlerMessageDispatch;
  private readonly appliedTurnConfig: SessionRequestHandlerAppliedTurnConfig;
  private readonly dialogSegmentMeta: SessionRequestHandlerDialogSegmentMeta;
  private readonly eventMessages: SessionRequestHandlerEventMessages;
  private readonly retryState: SessionRequestHandlerRetryState;
  private readonly flowNodeContinuity: FlowNodeContinuityFacade;
  private readonly flowNodeReportState: SessionRequestHandlerFlowNodeReportState;
  private readonly flowNodeRollover: SessionRequestHandlerFlowNodeRollover;
  private readonly continuityRoot: SessionRequestHandlerContinuityRoot;
  private readonly turnArbitration: SessionRequestHandlerTurnArbitration;

  private resolveImmediatePostTurnContextDecision(
    session: Session
  ): PostTurnContextDecision | null {
    if (this.isFlowNodeRolloverPending(session.id)) {
      return "rollover_required";
    }
    if (!(session.initiativeSlug && session.stage)) {
      return "no_rollover";
    }
    if (
      !this.flowNodeContinuity.isEligibleForRollover({
        stageId: session.stage,
        runSlug: session.runSlug,
      })
    ) {
      return "no_rollover";
    }
    return null;
  }

  private emitTurnStateEvent(options: {
    readonly sessionId: string;
    readonly state: "running" | "idle";
  }): void {
    const session = this.sessionManager.getSession(options.sessionId);
    const providerId = session?.providerId ?? null;
    if (session) {
      this.workspaceRuntime?.notifyTurnStateChanged(
        {
          workspaceRoot: session.workspacePath,
          nodeId: session.stage ?? "session",
          sessionId: session.id,
        },
        options.state
      );
    }

    this.broadcaster({
      type: "session:stream",
      payload: {
        sessionId: options.sessionId,
        event: {
          type: "stream_event",
          provider: providerId ?? "core",
          sessionId: options.sessionId,
          data: {
            kind: "turn_state",
            state: options.state,
            ...(providerId ? { providerId } : {}),
          },
          uuid: `${crypto.randomUUID()}::turn_state`,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  private emitContinuityLockEvent(
    options: EmitContinuityLockEventOptions
  ): void {
    this.continuityLockService.emitContinuityLockEvent(options);
  }

  private registerFlowNodeContinuityLockContext(
    context: FlowNodeContinuityLockContext
  ): FlowNodeContinuityLockContext {
    return this.continuityLockService.registerFlowNodeContinuityLockContext(
      context
    );
  }

  private finalizeFlowNodeContinuityLock(options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed" | "resume_timeout"
    >;
  }): void {
    this.continuityLockService.finalizeFlowNodeContinuityLock(options);
  }

  private finalizeFlowNodeContinuityLockOnBootstrapGate(options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed" | "resume_timeout"
    >;
  }): void {
    this.continuityLockService.finalizeFlowNodeContinuityLockOnBootstrapGate(
      options
    );
  }

  constructor(options: SessionRequestHandlerOptions) {
    this.config = options.config;
    this.sessionManager = options.sessionManager;
    this.providerRegistry = options.providerRegistry;
    this.sessionStorage = options.sessionStorage;
    this.logger = options.logger;
    this.broadcaster = options.broadcaster;
    this.stateBroadcaster = options.stateBroadcaster;
    this.workspaceRuntime = options.workspaceRuntime;
    const runtime = createSessionRequestHandlerRuntime({
      broadcaster: this.broadcaster,
      callbacks: {
        emitContinuityLockEvent: (lockEvent) =>
          this.continuityLockService.emitContinuityLockEvent(lockEvent),
        emitTurnStateEvent: (turnStateOptions) =>
          this.emitTurnStateEvent(turnStateOptions),
        finalizeFlowNodeContinuityLock: (lockOptions) =>
          this.finalizeFlowNodeContinuityLock(lockOptions),
        finalizeFlowNodeContinuityLockOnBootstrapGate: (lockOptions) =>
          this.finalizeFlowNodeContinuityLockOnBootstrapGate(lockOptions),
        getDefaultProviderId: () => this.getDefaultProviderId(),
        handleFlowNodeContinuityProviderEvent: async (sessionId, event) =>
          await this.handleFlowNodeContinuityProviderEvent(sessionId, event),
        handleMessage: async (sessionId, payload) =>
          await this.handleMessage(sessionId, payload),
        handleProviderEvent: (sessionId, event) =>
          this.handleProviderEvent(sessionId, event),
        handleProviderFailure: (providerId, error, sessionId) =>
          this.handleProviderFailure(providerId, error, sessionId),
        handleTurnCompletedWithFlowNodeArbitration: (
          sessionId,
          flowNodeContinuityTask
        ) =>
          this.handleTurnCompletedWithFlowNodeArbitration(
            sessionId,
            flowNodeContinuityTask
          ),
        isFlowNodeRolloverPending: (sessionId) =>
          this.isFlowNodeRolloverPending(sessionId),
        registerFlowNodeContinuityLockContext: (context) =>
          this.registerFlowNodeContinuityLockContext(context),
        resolveContinuityRootSessionId: async (resolutionOptions) =>
          await this.resolveContinuityRootSessionId(resolutionOptions),
        resolveImmediatePostTurnContextDecision: (session) =>
          this.resolveImmediatePostTurnContextDecision(session),
        runTurnCompletedArbitration: (sessionId) =>
          this.runTurnCompletedArbitration(sessionId),
      },
      config: this.config,
      continuityClock: options.continuityClock,
      continuityRootBySessionId: this.continuityRootBySessionId,
      logger: this.logger,
      providerRegistry: this.providerRegistry,
      providerSessions: this.providerSessions,
      sessionManager: this.sessionManager,
      sessionStorage: this.sessionStorage,
      stateBroadcaster: this.stateBroadcaster,
      workspaceRuntime: this.workspaceRuntime,
    });
    this.appliedTurnConfig = runtime.appliedTurnConfig;
    this.continuity = runtime.continuity;
    this.continuityLockService = runtime.continuityLockService;
    this.continuityRoot = runtime.continuityRoot;
    this.continuityRolloverOrchestrator =
      runtime.continuityRolloverOrchestrator;
    this.descriptionDialogSync = runtime.descriptionDialogSync;
    this.dialogSegmentMeta = runtime.dialogSegmentMeta;
    this.eventMessages = runtime.eventMessages;
    this.flowNodeContinuity = runtime.flowNodeContinuity;
    this.flowNodeReportState = runtime.flowNodeReportState;
    this.flowNodeRollover = runtime.flowNodeRollover;
    this.messageDispatch = runtime.messageDispatch;
    this.providerBindingService = runtime.providerBindingService;
    this.providerEventRouter = runtime.providerEventRouter;
    this.providerFailureRecovery = runtime.providerFailureRecovery;
    this.resumeLifecycle = runtime.resumeLifecycle;
    this.retryState = runtime.retryState;
    this.sessionBootstrap = runtime.sessionBootstrap;
    this.sessionResolution = runtime.sessionResolution;
    this.turnArbitration = runtime.turnArbitration;
  }

  protected normalizeContinuityStageId(value: string | null): string {
    return normalizeContinuityStageIdValue(value);
  }

  protected get sessionShellFactory(): unknown {
    return (
      this.sessionBootstrap as unknown as { sessionShellFactory: unknown }
    ).sessionShellFactory;
  }

  private async resolveContinuityRootSessionId(
    options: ContinuityRootResolutionOptions
  ): Promise<string> {
    return await this.continuityRoot.resolveContinuityRootSessionId(options);
  }

  protected async sendInternalMessage(
    sessionId: string,
    content: string
  ): Promise<void> {
    await this.messageDispatch.sendInternalMessage(sessionId, content);
  }

  protected getSessionResumeLifecycleStore(): Map<string, unknown> {
    return (
      this.resumeLifecycle as unknown as {
        sessionResumeLifecycleStates: Map<string, unknown>;
      }
    ).sessionResumeLifecycleStates;
  }

  protected recordPostTurnContextDecision(
    sessionId: string,
    decision: PostTurnContextDecision
  ): void {
    this.resumeLifecycle.recordPostTurnContextDecision(sessionId, decision);
  }

  protected async rolloverFlowNodeSession(
    session: Session,
    rollover: {
      readonly remainingPercent: number;
      readonly thresholdPercent: number;
      readonly rolloverId: string;
    },
    rolloverOptions?: { readonly silent: boolean }
  ): Promise<void> {
    await this.flowNodeRollover.rolloverFlowNodeSession(
      session,
      rollover,
      rolloverOptions
    );
  }

  private resolveFlowNodeRolloverSendGuard(
    sessionId: string
  ): FlowNodeRolloverSendGuardDecision {
    if (this.resumeLifecycle.hasPendingPostTurnContextDecision(sessionId)) {
      return {
        allowed: false,
        code: CONTINUITY_ROLLOVER_PENDING_ERROR_CODE,
        message: "Session continuity context decision is pending. Please wait.",
        sourceSessionId: sessionId,
        targetSessionId: null,
      };
    }
    const context = this.continuityLockService.getContext(sessionId);
    if (!context) {
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

    if (context.sourceSessionId !== sessionId) {
      return { allowed: true };
    }
    return {
      allowed: false,
      code: CONTINUITY_ROLLOVER_PENDING_ERROR_CODE,
      message: CONTINUITY_ROLLOVER_PENDING_ERROR_MESSAGE,
      sourceSessionId: context.sourceSessionId,
      targetSessionId: context.targetSessionId ?? null,
    };
  }

  private isFlowNodeRolloverPending(sessionId: string): boolean {
    return (
      this.continuityRolloverOrchestrator.hasPending(sessionId) ||
      this.continuityLockService.hasContext(sessionId)
    );
  }

  async handleCreate(
    providerId?: string,
    workspacePath?: string,
    context?: {
      readonly initiativeSlug?: string | null;
      readonly stage?: string | null;
      readonly runSlug?: string | null;
      readonly providerSessionId?: string | null;
    }
  ): Promise<void> {
    await this.sessionResolution.handleCreate(
      providerId,
      workspacePath,
      context
    );
  }

  async handleDialogSend(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly dialogId: string;
    readonly content: string;
  }): Promise<
    { readonly ok: true } | { readonly ok: false; readonly error: string }
  > {
    return await this.sessionResolution.handleDialogSend(options);
  }

  async handleSwitchRequest(options: {
    readonly sessionId: string;
    readonly mode: "retry_in_place" | "switch_model" | "switch_provider";
    readonly targetProviderId?: string;
    readonly targetModelId?: string;
  }): Promise<void> {
    const session = this.sessionManager.getSession(options.sessionId);
    if (!session) {
      this.logger.warn("Switch request: session not found", {
        sessionId: options.sessionId,
      });
      return;
    }

    const adapter = this.providerRegistry.getAdapter(session.providerId);
    if (!adapter) {
      this.logger.warn("Switch request: provider adapter unavailable", {
        sessionId: options.sessionId,
        providerId: session.providerId,
      });
      return;
    }

    // For switch_model: override model on adapter before resend
    if (options.mode === "switch_model" && options.targetModelId) {
      const adapterAny = adapter as { setModelOverride?: (m: string) => void };
      if (typeof adapterAny.setModelOverride === "function") {
        adapterAny.setModelOverride(options.targetModelId);
        this.logger.info("Switch request: model override applied", {
          sessionId: options.sessionId,
          targetModelId: options.targetModelId,
        });
        // Immediately broadcast so StatusPanel updates without waiting for ModelInfo event
        this.broadcaster({
          type: "session:model:update",
          payload: {
            sessionId: options.sessionId,
            providerId: session.providerId,
            modelId: options.targetModelId,
          },
        });
      }
    }

    // Resend the last user message from session history
    const lastUserMessage = [...session.messages]
      .reverse()
      .find((m) => m.role === "user");

    if (lastUserMessage) {
      this.logger.info("Switch request: resending last user message", {
        sessionId: options.sessionId,
        mode: options.mode,
        contentLength: lastUserMessage.content.length,
      });
      await this.handleMessage(options.sessionId, {
        content: lastUserMessage.content,
        turnOptions: this.appliedTurnConfig.attachToTurnOptions({
          providerId: session.providerId,
          targetModelId:
            options.mode === "switch_model" ? options.targetModelId : undefined,
        }),
      });
    } else {
      this.logger.warn("Switch request: no user message to resend", {
        sessionId: options.sessionId,
      });
    }
  }

  async createSessionForWorkflow(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly context: {
      readonly initiativeSlug: string;
      readonly stage: string;
      readonly runSlug?: string | null;
      readonly resumeMode?: SessionResumeMode;
    };
  }): Promise<Session | null> {
    const adapter = this.providerRegistry.getAdapter(options.providerId);
    if (!adapter) {
      this.logger.warn("Workflow session creation failed: provider missing", {
        providerId: options.providerId,
      });
      return null;
    }

    try {
      return await this.sessionBootstrap.createAndRegisterSession({
        providerId: options.providerId,
        workspacePath: options.workspacePath,
        adapter,
        resumeMode: options.context.resumeMode,
        context: {
          initiativeSlug: options.context.initiativeSlug,
          stage: options.context.stage,
          runSlug: options.context.runSlug ?? null,
          providerSessionId: null,
        },
      });
    } catch (error) {
      this.handleProviderFailure(options.providerId, error);
      return null;
    }
  }

  async handleMessage(
    sessionId: string,
    messagePayload: MessageContentPayload
  ): Promise<void> {
    this.logSessionMessageReceived(sessionId, messagePayload);
    const extracted =
      this.eventMessages.extractMessageContentAndTurnOptions(messagePayload);
    if (!extracted) {
      this.logger.warn("Received invalid message payload", { sessionId });
      return;
    }

    const { content, turnOptions } = extracted;
    const hiddenUserMessage = shouldHideUserMessage(turnOptions);
    this.logSessionMessageExtracted(sessionId, content, turnOptions);
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      this.broadcaster({
        type: "session:error",
        payload: { sessionId, message: "Session not found" },
      });
      this.logSessionNotFoundForIncomingMessage(sessionId);
      return;
    }

    this.logResolvedSessionForIncomingMessage(sessionId, session);
    const lifecycleState =
      this.resumeLifecycle.getSessionResumeLifecycleState(session);
    if (
      lifecycleState.mode === "no_resume" &&
      lifecycleState.finalTurnCompleted
    ) {
      this.broadcaster({
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
      this.resumeLifecycle.updateSessionResumeLifecycleState(session, {
        finalTurnCompleted: false,
        terminalLockReason: null,
      });
    }
    this.resumeLifecycle.clearPostTurnContextDecision(sessionId);

    const rolloverSendGuard = this.resolveFlowNodeRolloverSendGuard(sessionId);
    if (!rolloverSendGuard.allowed) {
      this.logger.warn("Blocked send while flow-node rollover is pending", {
        sessionId,
        sourceSessionId: rolloverSendGuard.sourceSessionId,
        targetSessionId: rolloverSendGuard.targetSessionId,
        code: rolloverSendGuard.code,
      });
      this.broadcaster({
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

    await this.messageDispatch.dispatchUserMessage({
      session,
      sessionId,
      content,
      turnOptions,
      hiddenUserMessage,
    });
  }

  async handleDelete(sessionId: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      this.broadcaster({
        type: "session:error",
        payload: { sessionId, message: "Session not found" },
      });
      return;
    }

    const binding = this.providerSessions.get(sessionId);
    if (binding) {
      const adapter = this.providerRegistry.getAdapter(binding.providerId);
      binding.unsubscribe();
      this.providerSessions.delete(sessionId);
      try {
        await adapter?.closeSession(binding.providerSessionId);
      } catch (error) {
        this.handleProviderFailure(binding.providerId, error, sessionId);
      }
    }

    const deleted = this.sessionManager.deleteSession(sessionId);
    if (!deleted) {
      return;
    }

    this.sessionStorage.close(sessionId, "session-deleted");
    this.resumeLifecycle.clearSessionLifecycle(sessionId);
    this.workspaceRuntime?.notifySessionDeleted({
      workspaceRoot: session.workspacePath,
      nodeId: session.stage ?? "session",
      sessionId: session.id,
    });
    this.broadcaster({ type: "session:deleted", payload: { sessionId } });
  }

  private handleProviderEvent(sessionId: string, event: unknown): void {
    this.providerEventRouter.handleProviderEvent(sessionId, event);
  }

  private handleTurnCompletedWithFlowNodeArbitration(
    sessionId: string,
    flowNodeContinuityTask: Promise<void>
  ): void {
    flowNodeContinuityTask
      .catch((error: unknown) => {
        this.logger.warn("Flow node continuity handler failed", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        this.runTurnCompletedArbitration(sessionId);
      });
  }

  private runTurnCompletedArbitration(sessionId: string): void {
    this.turnArbitration.runTurnCompletedArbitration(sessionId);
  }

  private async handleFlowNodeContinuityProviderEvent(
    sessionId: string,
    event: unknown
  ): Promise<void> {
    await this.turnArbitration.handleFlowNodeContinuityProviderEvent({
      sessionId,
      event,
      resolveLiveContinuityRemainingPercentThreshold: async (session) =>
        await this.resolveLiveContinuityRemainingPercentThreshold(session),
    });
  }

  private async resolveLiveContinuityRemainingPercentThreshold(
    session: Session
  ): Promise<number> {
    return await this.turnArbitration.resolveLiveContinuityRemainingPercentThreshold(
      session
    );
  }

  private handleProviderFailure(
    providerId: string,
    error: unknown,
    sessionId?: string
  ): void {
    this.providerFailureRecovery.handleProviderFailure(
      providerId,
      error,
      sessionId
    );
  }

  hasRetryBudget(sessionId: string): boolean {
    return this.retryState.hasRetryBudget(sessionId);
  }

  resetRetryBudget(sessionId: string): void {
    this.retryState.resetRetryBudget(sessionId);
  }

  trackPendingUserIntent(sessionId: string, content: string): void {
    this.retryState.trackPendingUserIntent(sessionId, content);
  }

  getPendingUserIntent(sessionId: string): string | null {
    return this.retryState.getPendingUserIntent(sessionId);
  }

  private updateProviderBinding(
    sessionId: string,
    providerSessionId?: string
  ): void {
    this.providerBindingService.updateProviderBinding(
      sessionId,
      providerSessionId
    );
  }

  private updateBindingWithResolvedId(
    sessionId: string,
    providerSessionId: string
  ): void {
    this.providerBindingService.updateBindingWithResolvedId(
      sessionId,
      providerSessionId
    );
  }

  private broadcastSessionBinding(sessionId: string): void {
    this.providerBindingService.broadcastSessionBinding(sessionId);
  }

  private logSessionMessageReceived(
    sessionId: string,
    messagePayload: MessageContentPayload
  ): void {
    this.logger.info("Session message received", {
      sessionId,
      payloadType: typeof messagePayload,
    });
  }

  private logSessionMessageExtracted(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): void {
    this.logger.info("Session message extracted", {
      sessionId,
      contentLength: content.length,
      hasTurnOptions: turnOptions !== undefined,
    });
  }

  private logSessionNotFoundForIncomingMessage(sessionId: string): void {
    this.logger.warn("Session not found for incoming message", { sessionId });
  }

  private logResolvedSessionForIncomingMessage(
    sessionId: string,
    session: Session
  ): void {
    this.logger.info("Resolved session for incoming message", {
      sessionId,
      providerId: session.providerId,
      providerSessionId: session.providerSessionId ?? null,
      providerSessionStatus: session.providerSessionStatus,
      stage: session.stage ?? null,
      initiativeSlug: session.initiativeSlug ?? null,
      runSlug: session.runSlug ?? null,
    });
  }

  private maybePromoteLegacyDescriptionDialogHistory(options: {
    readonly session: Session;
    readonly dialogSessionId?: string | null;
  }): void {
    this.descriptionDialogSync.maybePromoteLegacyDescriptionDialogHistory(
      options
    );
  }

  private async maybeBackfillDescriptionDialogHistory(options: {
    readonly session: Session;
    readonly providerSessionId: string;
    readonly dialog: {
      readonly dialogSessionId: string;
      readonly shouldBackfill: boolean;
    } | null;
  }): Promise<void> {
    await this.descriptionDialogSync.maybeBackfillDescriptionDialogHistory(
      options
    );
  }

  private async updateDescriptionSessionRef(
    session: Session,
    providerSessionId?: string
  ): Promise<void> {
    await this.descriptionDialogSync.updateDescriptionSessionRef(
      session,
      providerSessionId
    );
  }

  private getDefaultProviderId(): string {
    const providers = this.providerRegistry.listProviders();
    const activeProvider = providers.find(
      (provider) =>
        provider.status === "active" &&
        Boolean(this.providerRegistry.getAdapter(provider.id))
    );
    if (activeProvider) {
      return activeProvider.id;
    }
    const fallbackProvider = providers.find((provider) =>
      Boolean(this.providerRegistry.getAdapter(provider.id))
    );
    if (fallbackProvider) {
      return fallbackProvider.id;
    }
    return "claudeCodeCli";
  }
}
