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
import { SessionRequestHandlerSessionActions } from "./session-request-handler-session-actions";
import type { SessionRequestHandlerSessionBootstrap } from "./session-request-handler-session-bootstrap";
import type { SessionRequestHandlerSessionResolution } from "./session-request-handler-session-resolution";
import type { SessionRequestHandlerTurnArbitration } from "./session-request-handler-turn-arbitration";

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
  private readonly sessionActions: SessionRequestHandlerSessionActions;

  constructor(options: SessionRequestHandlerOptions) {
    this.config = options.config;
    this.sessionManager = options.sessionManager;
    this.providerRegistry = options.providerRegistry;
    this.sessionStorage = options.sessionStorage;
    this.logger = options.logger;
    this.broadcaster = options.broadcaster;
    this.stateBroadcaster = options.stateBroadcaster;
    this.workspaceRuntime = options.workspaceRuntime;
    const isFlowNodeRolloverPending = (sessionId: string): boolean =>
      this.continuityRolloverOrchestrator.hasPending(sessionId) ||
      this.continuityLockService.hasContext(sessionId);
    const resolveImmediatePostTurnContextDecision = (
      session: Session
    ): PostTurnContextDecision | null => {
      if (isFlowNodeRolloverPending(session.id)) {
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
    };
    const emitTurnStateEvent = (turnStateOptions: {
      readonly sessionId: string;
      readonly state: "running" | "idle";
    }): void => {
      const session = this.sessionManager.getSession(
        turnStateOptions.sessionId
      );
      const providerId = session?.providerId ?? null;
      if (session) {
        this.workspaceRuntime?.notifyTurnStateChanged(
          {
            workspaceRoot: session.workspacePath,
            nodeId: session.stage ?? "session",
            sessionId: session.id,
          },
          turnStateOptions.state
        );
      }
      this.broadcaster({
        type: "session:stream",
        payload: {
          sessionId: turnStateOptions.sessionId,
          event: {
            type: "stream_event",
            provider: providerId ?? "core",
            sessionId: turnStateOptions.sessionId,
            data: {
              kind: "turn_state",
              state: turnStateOptions.state,
              ...(providerId ? { providerId } : {}),
            },
            uuid: `${crypto.randomUUID()}::turn_state`,
            timestamp: new Date().toISOString(),
          },
        },
      });
    };
    const getDefaultProviderId = (): string => {
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
      return fallbackProvider?.id ?? "claudeCodeCli";
    };
    const handleProviderFailure = (
      providerId: string,
      error: unknown,
      sessionId?: string
    ): void => {
      this.providerFailureRecovery.handleProviderFailure(
        providerId,
        error,
        sessionId
      );
    };
    const runTurnCompletedArbitration = (sessionId: string): void => {
      this.turnArbitration.runTurnCompletedArbitration(sessionId);
    };
    const handleTurnCompletedWithFlowNodeArbitration = (
      sessionId: string,
      flowNodeContinuityTask: Promise<void>
    ): void => {
      flowNodeContinuityTask
        .catch((error: unknown) => {
          this.logger.warn("Flow node continuity handler failed", {
            sessionId,
            error: error instanceof Error ? error.message : String(error),
          });
        })
        .finally(() => {
          runTurnCompletedArbitration(sessionId);
        });
    };
    const handleFlowNodeContinuityProviderEvent = async (
      sessionId: string,
      event: unknown
    ): Promise<void> => {
      await this.turnArbitration.handleFlowNodeContinuityProviderEvent({
        sessionId,
        event,
        resolveLiveContinuityRemainingPercentThreshold: async (session) =>
          await this.turnArbitration.resolveLiveContinuityRemainingPercentThreshold(
            session
          ),
      });
    };
    const runtime = createSessionRequestHandlerRuntime({
      broadcaster: this.broadcaster,
      callbacks: {
        emitContinuityLockEvent: (lockEvent) =>
          this.continuityLockService.emitContinuityLockEvent(lockEvent),
        emitTurnStateEvent,
        finalizeFlowNodeContinuityLock: (lockOptions) =>
          this.continuityLockService.finalizeFlowNodeContinuityLock(
            lockOptions
          ),
        finalizeFlowNodeContinuityLockOnBootstrapGate: (lockOptions) =>
          this.continuityLockService.finalizeFlowNodeContinuityLockOnBootstrapGate(
            lockOptions
          ),
        getDefaultProviderId,
        handleFlowNodeContinuityProviderEvent,
        handleMessage: async (sessionId, payload) =>
          await this.handleMessage(sessionId, payload),
        handleProviderEvent: (sessionId, event) =>
          this.providerEventRouter.handleProviderEvent(sessionId, event),
        handleProviderFailure,
        handleTurnCompletedWithFlowNodeArbitration,
        isFlowNodeRolloverPending,
        registerFlowNodeContinuityLockContext: (context) =>
          this.continuityLockService.registerFlowNodeContinuityLockContext(
            context
          ),
        resolveContinuityRootSessionId: async (resolutionOptions) =>
          await this.resolveContinuityRootSessionId(resolutionOptions),
        resolveImmediatePostTurnContextDecision,
        runTurnCompletedArbitration,
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
    this.sessionActions = new SessionRequestHandlerSessionActions({
      appliedTurnConfig: this.appliedTurnConfig,
      broadcaster: this.broadcaster,
      continuityLockService: this.continuityLockService,
      continuityRolloverOrchestrator: this.continuityRolloverOrchestrator,
      eventMessages: this.eventMessages,
      logger: this.logger,
      messageDispatch: this.messageDispatch,
      onProviderFailure: handleProviderFailure,
      providerRegistry: this.providerRegistry,
      providerSessions: this.providerSessions,
      resumeLifecycle: this.resumeLifecycle,
      sessionManager: this.sessionManager,
      sessionStorage: this.sessionStorage,
      workspaceRuntime: this.workspaceRuntime,
    });
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

  private handleProviderEvent(sessionId: string, event: unknown): void {
    this.providerEventRouter.handleProviderEvent(sessionId, event);
  }

  private registerFlowNodeContinuityLockContext(
    context: FlowNodeContinuityLockContext
  ): FlowNodeContinuityLockContext {
    return this.continuityLockService.registerFlowNodeContinuityLockContext(
      context
    );
  }

  private emitContinuityLockEvent(
    options: EmitContinuityLockEventOptions
  ): void {
    this.continuityLockService.emitContinuityLockEvent(options);
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

  private async handleFlowNodeContinuityProviderEvent(
    sessionId: string,
    event: unknown
  ): Promise<void> {
    await this.turnArbitration.handleFlowNodeContinuityProviderEvent({
      sessionId,
      event,
      resolveLiveContinuityRemainingPercentThreshold: async (session) =>
        await this.turnArbitration.resolveLiveContinuityRemainingPercentThreshold(
          session
        ),
    });
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
    await this.sessionActions.handleSwitchRequest(options);
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
      this.providerFailureRecovery.handleProviderFailure(
        options.providerId,
        error
      );
      return null;
    }
  }

  async handleMessage(
    sessionId: string,
    messagePayload: MessageContentPayload
  ): Promise<void> {
    await this.sessionActions.handleMessage(sessionId, messagePayload);
  }

  async handleDelete(sessionId: string): Promise<void> {
    await this.sessionActions.handleDelete(sessionId);
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
}
