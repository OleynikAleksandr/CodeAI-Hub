import crypto from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { sanitizeWorkspaceSlug } from "@codeai-hub/unified-session";
import type { CoreConfig } from "../../config";
import { FlowNodeContinuityFacade } from "../../flow-node-continuity/flow-node-continuity-facade";
import type { ProviderRegistry } from "../../provider-registry";
import { promoteContinuityChainRootIfPresent } from "../../session-continuity/continuity-store";
import type { TokenUsageSnapshot } from "../../session-continuity/continuity-types";
import { buildHumanReadableDialogId } from "../../session-continuity/dialog-id";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import {
  extractTokenUsage,
  isBelowRemainingPercentThreshold,
} from "../../session-continuity/token-usage";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { SessionResumeMode } from "../../workspace-runtime/workspace-runtime-types";
import type { BridgeEvent } from "../types";
import {
  type ContinuityLockReason,
  type EmitContinuityLockEventOptions,
  type FlowNodeContinuityLockContext,
  SessionContinuityLockService,
} from "./session-continuity-lock-service";
import { SessionContinuityRolloverOrchestrator } from "./session-continuity-rollover-orchestrator";
import {
  type DescriptionDialogResolution as DescriptionDialogResolutionModel,
  SessionDescriptionDialogSync,
} from "./session-description-dialog-sync";
import { SessionProviderBindingService } from "./session-provider-binding-service";
import { SessionProviderEventRouter } from "./session-provider-event-router";
import { SessionProviderFailureRecovery } from "./session-provider-failure-recovery";
import {
  CONTINUITY_ROLLOVER_PENDING_ERROR_CODE,
  CONTINUITY_ROLLOVER_PENDING_ERROR_MESSAGE,
  type FlowNodeRolloverSendGuardDecision,
} from "./session-request-handler.types";
import { SessionRequestHandlerDialogSegmentMeta } from "./session-request-handler-dialog-segment-meta";
import {
  type MessageContentPayload,
  SessionRequestHandlerEventMessages,
} from "./session-request-handler-event-messages";
import { SessionRequestHandlerFlowNodeReportState } from "./session-request-handler-flow-node-report-state";
import { SessionRequestHandlerFlowNodeRollover } from "./session-request-handler-flow-node-rollover";
import { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";
import {
  type PostTurnContextDecision,
  SessionRequestHandlerResumeLifecycle,
} from "./session-request-handler-resume-lifecycle";
import { SessionRequestHandlerRetryState } from "./session-request-handler-retry-state";
import { SessionRequestHandlerSessionBootstrap } from "./session-request-handler-session-bootstrap";
import { SessionRequestHandlerSessionResolution } from "./session-request-handler-session-resolution";
import { shouldHideUserMessage } from "./workflow-turn-control";

export interface ProviderSessionBinding {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
}

export interface ProviderEventEnvelope {
  readonly payload?: unknown;
  readonly type?: string;
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

const DEFAULT_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 30;
const MIN_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
const MAX_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;
const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeContinuityThresholdPercent = (options: {
  readonly raw: unknown;
  readonly fallback: number;
}): number => {
  const numeric =
    typeof options.raw === "number" ? options.raw : Number(options.raw);
  if (!Number.isFinite(numeric)) {
    return clampNumber(
      options.fallback,
      MIN_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
      MAX_CONTINUITY_REMAINING_PERCENT_THRESHOLD
    );
  }
  return clampNumber(
    numeric,
    MIN_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    MAX_CONTINUITY_REMAINING_PERCENT_THRESHOLD
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractContinuityThresholdPercentFromSettings = (options: {
  readonly settings: unknown;
  readonly providerKey: "claude" | "codex" | "gemini";
  readonly fallback: number;
}): number => {
  if (!isRecord(options.settings)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  const providers = options.settings.providers;
  if (!isRecord(providers)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  const provider = providers[options.providerKey];
  if (!isRecord(provider)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  const sessionContinuity = provider.sessionContinuity;
  if (!isRecord(sessionContinuity)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  return normalizeContinuityThresholdPercent({
    raw: sessionContinuity.remainingPercentThreshold,
    fallback: options.fallback,
  });
};

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
  private readonly dialogSegmentMeta: SessionRequestHandlerDialogSegmentMeta;
  private readonly eventMessages: SessionRequestHandlerEventMessages;
  private readonly retryState: SessionRequestHandlerRetryState;
  private readonly flowNodeContinuity: FlowNodeContinuityFacade;
  private readonly flowNodeReportState: SessionRequestHandlerFlowNodeReportState;
  private readonly flowNodeRollover: SessionRequestHandlerFlowNodeRollover;
  private flowNodeContinuitySettingsCache: {
    readonly mtimeMs: number;
    readonly settings: unknown;
  } | null = null;

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
    this.continuity = new SessionContinuityFacade({
      logger: this.logger,
      clock: options.continuityClock,
      remainingRatioThreshold: Math.min(
        1,
        Math.max(0, this.config.claudeContinuityRemainingPercentThreshold / 100)
      ),
      enableLegacyHandoff: false,
      callbacks: {
        sendMessage: async (sessionId, content) =>
          this.messageDispatch.sendInternalMessage(sessionId, content),
        createSession: async (request) =>
          this.sessionResolution.createContinuitySession(request),
      },
      sessionLookup: (sessionId) => this.sessionManager.getSession(sessionId),
    });
    this.flowNodeContinuity = new FlowNodeContinuityFacade({
      templatesDir: this.config.templatesDir,
      preemptRemainingPercentThreshold:
        this.config.continuityPreemptRemainingPercentThreshold,
    });
    this.resumeLifecycle = new SessionRequestHandlerResumeLifecycle({
      sessionManager: this.sessionManager,
      workspaceRuntime: this.workspaceRuntime,
      clearTokenUsageSnapshot: (sessionId) =>
        this.continuityRolloverOrchestrator.clearTokenUsageSnapshot(sessionId),
      emitContinuityLockEvent: (lockEvent) =>
        this.continuityLockService.emitContinuityLockEvent(lockEvent),
      finalizePendingTurnCompletion: (sessionId) =>
        this.runTurnCompletedArbitration(sessionId),
      isFlowNodeRolloverPending: (sessionId) =>
        this.isFlowNodeRolloverPending(sessionId),
    });
    this.continuityLockService = new SessionContinuityLockService({
      sessionManager: this.sessionManager,
      broadcaster: this.broadcaster,
      workspaceRuntime: this.workspaceRuntime,
      clearPostTurnContextDecision: (sessionId) =>
        this.resumeLifecycle.clearPostTurnContextDecision(sessionId),
      clearRolloverSessionState: (sessionId) =>
        this.continuityRolloverOrchestrator.clearPendingState(sessionId),
      getSessionResumeLifecycleState: (session) =>
        this.resumeLifecycle.getSessionResumeLifecycleState(session),
      updateSessionResumeLifecycleState: (session, patch) =>
        this.resumeLifecycle.updateSessionResumeLifecycleState(session, patch),
    });
    this.continuityRolloverOrchestrator =
      new SessionContinuityRolloverOrchestrator({
        logger: this.logger,
        registerPostTurnRolloverRequiredDecision: (sessionId) =>
          this.resumeLifecycle.registerPostTurnRolloverRequiredDecision(
            sessionId
          ),
        elevateSessionToRolloverResumeMode: (session) =>
          this.resumeLifecycle.elevateSessionToRolloverResumeMode(session),
        registerFlowNodeContinuityLockContext: (context) =>
          this.continuityLockService.registerFlowNodeContinuityLockContext(
            context
          ),
        emitContinuityLockEvent: (lockEvent) =>
          this.continuityLockService.emitContinuityLockEvent(lockEvent),
        emitFlowNodeRolloverNotification: (sessionId, notification) =>
          this.flowNodeReportState.emitFlowNodeRolloverNotification(
            sessionId,
            notification
          ),
        rolloverFlowNodeSession: (session, rollover, rolloverOptions) =>
          this.flowNodeRollover.rolloverFlowNodeSession(
            session,
            rollover,
            rolloverOptions
          ),
        getCreateReportRequest: (sessionId) =>
          this.flowNodeReportState.getCreateReportRequest(sessionId),
        deleteCreateReportRequest: (sessionId) =>
          this.flowNodeReportState.deleteCreateReportRequest(sessionId),
        finalizeFlowNodeContinuityLock: (lockOptions) =>
          this.continuityLockService.finalizeFlowNodeContinuityLock(
            lockOptions
          ),
        updateSessionResumeLifecycleState: (session, patch) => {
          this.resumeLifecycle.updateSessionResumeLifecycleState(
            session,
            patch
          );
        },
        emitTurnStateEvent: (turnStateOptions) =>
          this.emitTurnStateEvent(turnStateOptions),
        emitContinuityFailedEvent: (failureOptions) =>
          this.flowNodeReportState.emitContinuityFailedEvent(failureOptions),
        isContinuityReportTimeoutError: (error) =>
          this.flowNodeReportState.isContinuityReportTimeoutError(error),
      });
    this.descriptionDialogSync = new SessionDescriptionDialogSync({
      sessionStorage: this.sessionStorage,
      continuityRootBySessionId: this.continuityRootBySessionId,
      logger: this.logger,
    });
    this.eventMessages = new SessionRequestHandlerEventMessages({
      broadcaster: this.broadcaster,
      continuityRootBySessionId: this.continuityRootBySessionId,
      logger: this.logger,
      sessionManager: this.sessionManager,
      sessionStorage: this.sessionStorage,
    });
    this.retryState = new SessionRequestHandlerRetryState({
      broadcaster: this.broadcaster,
      logger: this.logger,
    });
    this.providerBindingService = new SessionProviderBindingService({
      sessionManager: this.sessionManager,
      sessionStorage: this.sessionStorage,
      continuity: this.continuity,
      providerSessions: this.providerSessions,
      broadcaster: this.broadcaster,
      stateBroadcaster: this.stateBroadcaster,
      logger: this.logger,
      workspaceRuntime: this.workspaceRuntime,
      updateDescriptionSessionRef: (session, providerSessionId) =>
        this.descriptionDialogSync.updateDescriptionSessionRef(
          session,
          providerSessionId
        ),
    });
    this.providerEventRouter = new SessionProviderEventRouter({
      sessionManager: this.sessionManager,
      broadcaster: this.broadcaster,
      logger: this.logger,
      workspaceRuntime: this.workspaceRuntime,
      handleSessionContinuityProviderEvent: (sessionId, event) =>
        this.continuity.handleProviderEvent(sessionId, event),
      handleFlowNodeContinuityProviderEvent: (sessionId, event) =>
        this.handleFlowNodeContinuityProviderEvent(sessionId, event),
      updateBindingWithResolvedId: (sessionId, providerSessionId) =>
        this.providerBindingService.updateBindingWithResolvedId(
          sessionId,
          providerSessionId
        ),
      markPostTurnContextDecisionPending: (sessionId) =>
        this.resumeLifecycle.markPostTurnContextDecisionPending(sessionId),
      handleTurnCompletedWithFlowNodeArbitration: (
        sessionId,
        flowNodeContinuityTask
      ) =>
        this.handleTurnCompletedWithFlowNodeArbitration(
          sessionId,
          flowNodeContinuityTask
        ),
      clearPostTurnContextDecision: (sessionId) =>
        this.resumeLifecycle.clearPostTurnContextDecision(sessionId),
      emitTurnStateEvent: (turnStateOptions) =>
        this.emitTurnStateEvent(turnStateOptions),
      finalizeFlowNodeContinuityLockOnBootstrapGate: (lockOptions) =>
        this.finalizeFlowNodeContinuityLockOnBootstrapGate(lockOptions),
      appendProviderMessage: (sessionId, role, event) =>
        this.eventMessages.appendProviderMessage(sessionId, role, event),
      appendDialogMessage: (sessionId, payload) =>
        this.eventMessages.appendDialogMessage(sessionId, payload),
    });
    this.providerFailureRecovery = new SessionProviderFailureRecovery({
      providerRegistry: this.providerRegistry,
      sessionManager: this.sessionManager,
      sessionStorage: this.sessionStorage,
      providerSessions: this.providerSessions,
      broadcaster: this.broadcaster,
      stateBroadcaster: this.stateBroadcaster,
      logger: this.logger,
      broadcastSessionBinding: (sessionId) =>
        this.providerBindingService.broadcastSessionBinding(sessionId),
      emitTurnStateEvent: (turnStateOptions) =>
        this.emitTurnStateEvent(turnStateOptions),
      consumeRetryBudget: (sessionId, failureClass) =>
        this.retryState.consumeRetryBudget(sessionId, failureClass),
      expirePendingUserIntent: (sessionId) =>
        this.retryState.expirePendingUserIntent(sessionId),
    });
    this.messageDispatch = new SessionRequestHandlerMessageDispatch({
      sessionManager: this.sessionManager,
      sessionStorage: this.sessionStorage,
      continuity: this.continuity,
      providerRegistry: this.providerRegistry,
      providerSessions: this.providerSessions,
      broadcaster: this.broadcaster,
      logger: this.logger,
      emitTurnStateEvent: (turnStateOptions) =>
        this.emitTurnStateEvent(turnStateOptions),
      handleProviderFailure: (providerId, error, sessionId) =>
        this.handleProviderFailure(providerId, error, sessionId),
      trackPendingUserIntent: (sessionId, content) =>
        this.retryState.trackPendingUserIntent(sessionId, content),
    });
    this.dialogSegmentMeta = new SessionRequestHandlerDialogSegmentMeta({
      broadcaster: this.broadcaster,
      continuity: this.continuity,
      continuityRootBySessionId: this.continuityRootBySessionId,
      logger: this.logger,
      sessionManager: this.sessionManager,
      sessionStorage: this.sessionStorage,
    });
    this.sessionBootstrap = new SessionRequestHandlerSessionBootstrap({
      sessionManager: this.sessionManager,
      sessionStorage: this.sessionStorage,
      continuity: this.continuity,
      continuityRootBySessionId: this.continuityRootBySessionId,
      providerSessions: this.providerSessions,
      broadcaster: this.broadcaster,
      broadcastSessionBinding: (sessionId) =>
        this.providerBindingService.broadcastSessionBinding(sessionId),
      resolveContinuityRootSessionId: (resolutionOptions) =>
        this.resolveContinuityRootSessionId(resolutionOptions),
      resolveDescriptionDialog: (dialogOptions) =>
        this.descriptionDialogSync.resolveDescriptionDialog(dialogOptions),
      maybePromoteLegacyDescriptionDialogHistory: (promotionOptions) =>
        this.descriptionDialogSync.maybePromoteLegacyDescriptionDialogHistory(
          promotionOptions
        ),
      maybeBackfillDescriptionDialogHistory: (backfillOptions) =>
        this.descriptionDialogSync.maybeBackfillDescriptionDialogHistory(
          backfillOptions
        ),
      updateDescriptionSessionRef: (session, providerSessionId) =>
        this.descriptionDialogSync.updateDescriptionSessionRef(
          session,
          providerSessionId
        ),
      handleProviderEvent: (sessionId, event) =>
        this.handleProviderEvent(sessionId, event),
      updateProviderBinding: (sessionId, providerSessionId) =>
        this.providerBindingService.updateProviderBinding(
          sessionId,
          providerSessionId
        ),
      appendDialogSegmentBoundaryMeta: (boundaryOptions) =>
        this.dialogSegmentMeta.appendDialogSegmentBoundaryMeta(boundaryOptions),
      resumeLifecycle: this.resumeLifecycle,
      workspaceRuntime: this.workspaceRuntime,
    });
    this.sessionResolution = new SessionRequestHandlerSessionResolution({
      broadcaster: this.broadcaster,
      broadcastSessionBinding: (sessionId) =>
        this.providerBindingService.broadcastSessionBinding(sessionId),
      getDefaultProviderId: () => this.getDefaultProviderId(),
      handleMessage: (sessionId, payload) =>
        this.handleMessage(sessionId, payload),
      handleProviderFailure: (providerId, error, sessionId) =>
        this.handleProviderFailure(providerId, error, sessionId),
      logger: this.logger,
      providerRegistry: this.providerRegistry,
      sessionBootstrap: this.sessionBootstrap,
      sessionManager: this.sessionManager,
      workspacePathOverride: this.config.claudeWorkspacePath,
    });
    this.flowNodeReportState = new SessionRequestHandlerFlowNodeReportState({
      broadcaster: this.broadcaster,
    });
    this.flowNodeRollover = new SessionRequestHandlerFlowNodeRollover({
      continuityRootBySessionId: this.continuityRootBySessionId,
      providerRegistry: this.providerRegistry,
      flowNodeContinuity: this.flowNodeContinuity,
      sessionBootstrap: this.sessionBootstrap,
      messageDispatch: this.messageDispatch,
      reportState: this.flowNodeReportState,
      emitTurnStateEvent: (turnStateOptions) =>
        this.emitTurnStateEvent(turnStateOptions),
      registerFlowNodeContinuityLockContext: (context) =>
        this.registerFlowNodeContinuityLockContext(context),
      emitContinuityLockEvent: (lockEvent) =>
        this.emitContinuityLockEvent(lockEvent),
      finalizeFlowNodeContinuityLock: (lockOptions) =>
        this.finalizeFlowNodeContinuityLock(lockOptions),
    });
  }

  private normalizeContinuityStageId(value: string | null): string {
    const trimmed = value?.trim() ?? "";
    if (
      trimmed === "description" ||
      trimmed === "virtual_simulation" ||
      trimmed === "diagram_modules"
    ) {
      return trimmed;
    }
    return "unknown";
  }

  private async tryResolveExistingContinuityRootSessionId(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly stageId: string;
    readonly providerSessionId: string;
  }): Promise<string | null> {
    const providerSessionId = options.providerSessionId.trim();
    if (providerSessionId.length === 0) {
      return null;
    }
    const stage = this.normalizeContinuityStageId(options.stageId);
    const chains = await SessionContinuityFacade.readWorkspaceChains({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
    });
    const match = chains.find(
      (chain) =>
        chain.stage === stage &&
        chain.segments.some(
          (segment) => segment.providerSessionId === providerSessionId
        )
    );
    return match ? (match.dialogId ?? match.rootSessionId ?? null) : null;
  }

  private async resolveContinuityRootSessionId(
    options: ContinuityRootResolutionOptions
  ): Promise<string> {
    if (options.rootSessionIdOverride) {
      return await this.maybePromoteLegacyDescriptionAgentRootId({
        rootSessionId: options.rootSessionIdOverride,
        workspaceRoot: options.workspaceRoot,
        providerId: options.providerId,
        workspaceSlug: options.context.initiativeSlug,
        stageId: options.context.stage,
        runSlug: options.context.runSlug,
      });
    }
    const workspaceSlug = options.context.initiativeSlug;
    const stageId = options.context.stage;
    if (!(workspaceSlug && stageId)) {
      return options.sessionId;
    }
    const requestedProviderSessionId = options.context.providerSessionId;
    if (requestedProviderSessionId) {
      const existingRoot = await this.tryResolveExistingContinuityRootSessionId(
        {
          workspaceRoot: options.workspaceRoot,
          workspaceSlug,
          stageId,
          providerSessionId: requestedProviderSessionId,
        }
      );
      if (existingRoot) {
        return await this.maybePromoteLegacyDescriptionAgentRootId({
          rootSessionId: existingRoot,
          workspaceRoot: options.workspaceRoot,
          providerId: options.providerId,
          workspaceSlug: options.context.initiativeSlug,
          stageId: options.context.stage,
          runSlug: options.context.runSlug,
        });
      }
    }
    return buildHumanReadableDialogId({
      providerId: options.providerId,
      uuid: options.sessionId,
      agentRole: options.context.runSlug ?? options.context.stage ?? null,
    });
  }

  private async maybePromoteLegacyDescriptionAgentRootId(options: {
    readonly rootSessionId: string;
    readonly workspaceRoot: string;
    readonly providerId: string;
    readonly workspaceSlug: string | null;
    readonly stageId: string | null;
    readonly runSlug: string | null;
  }): Promise<string> {
    if (
      options.stageId !== "description" ||
      !options.rootSessionId.endsWith("-agent")
    ) {
      return options.rootSessionId;
    }
    const normalizedRootSessionId = `${options.rootSessionId.slice(0, -"-agent".length)}-description`;
    this.sessionStorage.promoteHistoryFile({
      workspaceSlug: sanitizeWorkspaceSlug(options.workspaceRoot),
      providerId: options.providerId,
      fromHistorySessionId: options.rootSessionId,
      toHistorySessionId: normalizedRootSessionId,
    });
    if (options.workspaceSlug) {
      try {
        await promoteContinuityChainRootIfPresent({
          workspaceRoot: options.workspaceRoot,
          workspaceSlug: options.workspaceSlug,
          stage: options.stageId,
          fromRootSessionId: options.rootSessionId,
          toRootSessionId: normalizedRootSessionId,
        });
      } catch (error: unknown) {
        this.logger.warn("Failed to promote continuity chain root session id", {
          workspaceSlug: options.workspaceSlug,
          stageId: options.stageId,
          providerId: options.providerId,
          fromRootSessionId: options.rootSessionId,
          toRootSessionId: normalizedRootSessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return normalizedRootSessionId;
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
      await this.handleMessage(options.sessionId, lastUserMessage.content);
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
    try {
      this.handleTurnCompletedEvent(sessionId);
    } catch (error) {
      this.logger.warn("Turn completion arbitration failed", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.resumeLifecycle.clearPostTurnContextDecision(sessionId);
      if (!this.isFlowNodeRolloverPending(sessionId)) {
        this.emitTurnStateEvent({ sessionId, state: "idle" });
      }
      this.finalizeFlowNodeContinuityLockOnBootstrapGate({
        sessionId,
        reason: "resume_failed",
      });
    }
  }

  private async handleFlowNodeContinuityProviderEvent(
    sessionId: string,
    event: unknown
  ): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }

    const typedEvent = isRecord(event)
      ? (event as ProviderEventEnvelope)
      : null;
    const shouldDeferPostTurnCompletion = typedEvent?.type === "turn_completed";
    const usage = extractTokenUsage(event);
    this.continuityRolloverOrchestrator.recordTokenUsageSnapshot(
      sessionId,
      usage
    );

    const shouldEvaluatePostTurnDecision =
      shouldDeferPostTurnCompletion ||
      (this.resumeLifecycle.hasPendingPostTurnContextDecision(sessionId) &&
        usage !== undefined);
    if (!shouldEvaluatePostTurnDecision) {
      return;
    }

    await this.resolveFlowNodePostTurnContextDecision({
      session,
      sessionId,
      usage,
      deferPostTurnCompletion: shouldDeferPostTurnCompletion,
    });
  }

  private isStaleFlowNodeContinuitySegment(session: Session): boolean {
    if (!session.stage) {
      return false;
    }

    const stage = session.stage;
    const runSlug = session.runSlug ?? null;
    const initiativeSlug = session.initiativeSlug ?? null;
    const workspacePath = session.workspacePath;

    for (const candidate of this.sessionManager.listSessions()) {
      if (
        candidate.continuationParentId === session.id &&
        candidate.workspacePath === workspacePath &&
        (candidate.initiativeSlug ?? null) === initiativeSlug &&
        candidate.stage === stage &&
        (candidate.runSlug ?? null) === runSlug
      ) {
        return true;
      }
    }
    return false;
  }

  private async resolveFlowNodePostTurnContextDecision(options: {
    readonly session: Session;
    readonly sessionId: string;
    readonly usage: TokenUsageSnapshot | null;
    readonly deferPostTurnCompletion: boolean;
  }): Promise<void> {
    const recordNoRolloverDecision = () => {
      if (options.deferPostTurnCompletion) {
        this.resumeLifecycle.recordPostTurnContextDecision(
          options.sessionId,
          "no_rollover"
        );
        return;
      }
      this.resumeLifecycle.registerPostTurnNoRolloverDecision(
        options.sessionId
      );
    };

    const recordRolloverRequiredDecision = () => {
      if (options.deferPostTurnCompletion) {
        this.resumeLifecycle.recordPostTurnContextDecision(
          options.sessionId,
          "rollover_required"
        );
        return;
      }
      this.resumeLifecycle.registerPostTurnRolloverRequiredDecision(
        options.sessionId
      );
    };

    if (this.continuityRolloverOrchestrator.hasPending(options.sessionId)) {
      recordRolloverRequiredDecision();
      return;
    }
    if (this.isStaleFlowNodeContinuitySegment(options.session)) {
      recordNoRolloverDecision();
      return;
    }
    if (!(options.session.initiativeSlug && options.session.stage)) {
      recordNoRolloverDecision();
      return;
    }
    if (
      !this.flowNodeContinuity.isEligibleForRollover({
        stageId: options.session.stage,
        runSlug: options.session.runSlug,
      })
    ) {
      recordNoRolloverDecision();
      return;
    }

    const usage =
      options.usage ??
      this.continuityRolloverOrchestrator.getTokenUsageSnapshot(
        options.sessionId
      );
    if (!usage) {
      return;
    }

    const remainingPercentThreshold =
      await this.resolveLiveContinuityRemainingPercentThreshold(
        options.session
      );
    if (!isBelowRemainingPercentThreshold(usage, remainingPercentThreshold)) {
      recordNoRolloverDecision();
      return;
    }

    await this.continuityRolloverOrchestrator.startFlowNodeRolloverFromUsage({
      session: options.session,
      sessionId: options.sessionId,
      stageId: options.session.stage,
      runSlug: options.session.runSlug ?? null,
      usage,
      remainingPercentThreshold,
    });
  }

  private emitResumeInPlaceNoRolloverUnlock(session: Session): void {
    this.continuityLockService.emitResumeInPlaceNoRolloverUnlock(session);
  }

  private handleTurnCompletedEvent(sessionId: string): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      this.resumeLifecycle.clearPostTurnContextDecision(sessionId);
      return;
    }
    const resumeMode =
      this.resumeLifecycle.getSessionResumeLifecycleState(session).mode;
    if (resumeMode === "no_resume") {
      this.resumeLifecycle.clearPostTurnContextDecision(sessionId);
      this.resumeLifecycle.handleNoResumeTurnCompleted(session);
      this.emitTurnStateEvent({ sessionId, state: "idle" });
      return;
    }

    // Continuity resume bootstrap turns should unlock promptly once the provider
    // reports completion; we cannot wait for context-decision arbitration here
    // because the bootstrap session is still flagged as "rollover pending".
    const lockContext = this.continuityLockService.getContext(sessionId);
    if (
      lockContext &&
      lockContext.targetSessionId === sessionId &&
      lockContext.awaitingBootstrapTurn
    ) {
      this.finalizeFlowNodeContinuityLock({
        sessionId,
        reason: "resume_ready",
      });
      this.emitTurnStateEvent({ sessionId, state: "idle" });
      return;
    }

    this.resumeLifecycle.updateSessionResumeLifecycleState(session, {
      finalTurnCompleted: true,
      terminalLockReason: null,
    });

    const contextDecision =
      this.resumeLifecycle.resolveRecordedPostTurnContextDecision(
        session,
        (candidate) => this.resolveImmediatePostTurnContextDecision(candidate)
      );
    if (!contextDecision) {
      return;
    }

    this.resumeLifecycle.clearPostTurnContextDecision(sessionId);
    if (
      contextDecision === "rollover_required" ||
      this.isFlowNodeRolloverPending(sessionId)
    ) {
      return;
    }

    this.finalizeFlowNodeContinuityLockOnBootstrapGate({
      sessionId,
      reason: "resume_ready",
    });
    this.emitTurnStateEvent({ sessionId, state: "idle" });
    if (resumeMode === "resume_in_place") {
      this.emitResumeInPlaceNoRolloverUnlock(session);
    }
  }

  private resolveSettingsProviderKey(
    providerId: string
  ): "claude" | "codex" | "gemini" {
    if (providerId.startsWith("codex")) {
      return "codex";
    }
    if (providerId.startsWith("gemini")) {
      return "gemini";
    }
    return "claude";
  }

  private async loadContinuitySettingsSnapshot(): Promise<unknown> {
    const settingsPath = this.config.claudeSettingsPath;
    try {
      const fileStat = await stat(settingsPath);
      const mtimeMs = fileStat.mtimeMs;
      if (
        this.flowNodeContinuitySettingsCache &&
        this.flowNodeContinuitySettingsCache.mtimeMs === mtimeMs
      ) {
        return this.flowNodeContinuitySettingsCache.settings;
      }

      const raw = await readFile(settingsPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      this.flowNodeContinuitySettingsCache = { mtimeMs, settings: parsed };
      return parsed;
    } catch {
      return null;
    }
  }

  private async resolveLiveContinuityRemainingPercentThreshold(
    session: Session
  ): Promise<number> {
    const providerKey = this.resolveSettingsProviderKey(session.providerId);
    const settings = await this.loadContinuitySettingsSnapshot();
    return extractContinuityThresholdPercentFromSettings({
      settings,
      providerKey,
      fallback:
        this.config.claudeContinuityRemainingPercentThreshold ??
        DEFAULT_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    });
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
