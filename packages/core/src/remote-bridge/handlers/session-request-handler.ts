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
import type { SessionContinuityLockService } from "./session-continuity-lock-service";
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
import type { SessionRequestHandlerResumeLifecycle } from "./session-request-handler-resume-lifecycle";
import type { SessionRequestHandlerRetryState } from "./session-request-handler-retry-state";
import { createSessionRequestHandlerRuntime } from "./session-request-handler-runtime";
import { createSessionRequestHandlerRuntimeCallbacks } from "./session-request-handler-runtime-callbacks";
import { SessionRequestHandlerSessionActions } from "./session-request-handler-session-actions";
import type { SessionRequestHandlerSessionBootstrap } from "./session-request-handler-session-bootstrap";
import type { SessionRequestHandlerSessionResolution } from "./session-request-handler-session-resolution";
import { SessionRequestHandlerStopAction } from "./session-request-handler-stop-action";
import { SessionRequestHandlerStopRebind } from "./session-request-handler-stop-rebind";
import type { SessionRequestHandlerTurnArbitration } from "./session-request-handler-turn-arbitration";
import type {
  ProviderSessionBinding,
  SessionRequestHandlerOptions,
} from "./session-request-handler-types";
import { SessionRequestHandlerWorkflowSession } from "./session-request-handler-workflow-session";

export type {
  ContinuityRootResolutionOptions,
  CreateAndRegisterSessionOptions,
  ProviderSessionBinding,
  SessionRequestHandlerOptions,
  ShellSessionCreationResult,
} from "./session-request-handler-types";
export type DescriptionDialogResolution = DescriptionDialogResolutionModel;

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
  private readonly stopAction: SessionRequestHandlerStopAction;
  private readonly stopRebind: SessionRequestHandlerStopRebind;
  private readonly workflowSession: SessionRequestHandlerWorkflowSession;

  constructor(options: SessionRequestHandlerOptions) {
    this.config = options.config;
    this.sessionManager = options.sessionManager;
    this.providerRegistry = options.providerRegistry;
    this.sessionStorage = options.sessionStorage;
    this.logger = options.logger;
    this.broadcaster = options.broadcaster;
    this.stateBroadcaster = options.stateBroadcaster;
    this.workspaceRuntime = options.workspaceRuntime;
    const runtimeCallbacks = createSessionRequestHandlerRuntimeCallbacks({
      getBroadcaster: () => this.broadcaster,
      getContinuityLockService: () => this.continuityLockService,
      getContinuityRolloverOrchestrator: () =>
        this.continuityRolloverOrchestrator,
      getFlowNodeContinuity: () => this.flowNodeContinuity,
      getTurnArbitration: () => this.turnArbitration,
      handleMessage: async (sessionId, payload) =>
        await this.handleMessage(sessionId, payload),
      handleProviderEvent: (sessionId, event) =>
        this.providerEventRouter.handleProviderEvent(sessionId, event),
      getLogger: () => this.logger,
      getProviderFailureRecovery: () => this.providerFailureRecovery,
      getProviderRegistry: () => this.providerRegistry,
      resolveContinuityRootSessionId: async (resolutionOptions) =>
        await this.continuityRoot.resolveContinuityRootSessionId(
          resolutionOptions
        ),
      getSessionManager: () => this.sessionManager,
      getWorkspaceRuntime: () => this.workspaceRuntime,
    });
    const handleProviderFailure = runtimeCallbacks.handleProviderFailure;
    const emitTurnStateEvent = runtimeCallbacks.emitTurnStateEvent;
    const runtime = createSessionRequestHandlerRuntime({
      broadcaster: this.broadcaster,
      callbacks: runtimeCallbacks,
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
    this.stopRebind = new SessionRequestHandlerStopRebind({
      broadcastSessionBinding: (sessionId) =>
        this.providerBindingService.broadcastSessionBinding(sessionId),
      continuity: this.continuity,
      continuityRootBySessionId: this.continuityRootBySessionId,
      handleProviderEvent: (sessionId, event) =>
        this.providerEventRouter.handleProviderEvent(sessionId, event),
      logger: this.logger,
      maybeBackfillDescriptionDialogHistory: async (options) =>
        await this.descriptionDialogSync.maybeBackfillDescriptionDialogHistory(
          options
        ),
      maybePromoteLegacyDescriptionDialogHistory: (options) =>
        this.descriptionDialogSync.maybePromoteLegacyDescriptionDialogHistory(
          options
        ),
      onProviderFailure: handleProviderFailure,
      providerRegistry: this.providerRegistry,
      providerSessions: this.providerSessions,
      resolveDescriptionDialog: async (options) =>
        await this.descriptionDialogSync.resolveDescriptionDialog(options),
      sessionManager: this.sessionManager,
      updateDescriptionSessionRef: async (session, providerSessionId) =>
        await this.descriptionDialogSync.updateDescriptionSessionRef(
          session,
          providerSessionId
        ),
      updateProviderBinding: (sessionId, providerSessionId) =>
        this.providerBindingService.updateProviderBinding(
          sessionId,
          providerSessionId
        ),
    });
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
      stopRebind: this.stopRebind,
      workspaceRuntime: this.workspaceRuntime,
    });
    this.stopAction = new SessionRequestHandlerStopAction({
      continuityLockService: this.continuityLockService,
      emitSessionError: (sessionId, message) => {
        this.broadcaster({
          type: "session:error",
          payload: { sessionId, message },
        });
      },
      emitTurnStateEvent,
      logger: this.logger,
      providerBindingService: this.providerBindingService,
      providerRegistry: this.providerRegistry,
      providerSessions: this.providerSessions,
      resumeLifecycle: this.resumeLifecycle,
      sessionManager: this.sessionManager,
    });
    this.workflowSession = new SessionRequestHandlerWorkflowSession({
      createAndRegisterSession: (createOptions) =>
        this.sessionBootstrap.createAndRegisterSession(createOptions),
      logger: this.logger,
      providerFailureRecovery: this.providerFailureRecovery,
      providerRegistry: this.providerRegistry,
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

  protected async sendInternalMessage(
    sessionId: string,
    content: string
  ): Promise<void> {
    await this.messageDispatch.sendInternalMessage(sessionId, content);
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
    return await this.workflowSession.createSessionForWorkflow(options);
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

  async handleStop(sessionId: string): Promise<void> {
    await this.stopAction.handleStop(sessionId);
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
