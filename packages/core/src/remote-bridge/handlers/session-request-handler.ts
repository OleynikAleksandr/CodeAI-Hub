import crypto from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  readSessionEvents,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import type { CoreConfig } from "../../config";
import { FlowNodeContinuityFacade } from "../../flow-node-continuity/flow-node-continuity-facade";
import type { ProviderRegistry } from "../../provider-registry";
import {
  ContinuityChainStore,
  promoteContinuityChainRootIfPresent,
} from "../../session-continuity/continuity-store";
import type { TokenUsageSnapshot } from "../../session-continuity/continuity-types";
import { buildHumanReadableDialogId } from "../../session-continuity/dialog-id";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import {
  computeRemainingPercent,
  extractTokenUsage,
  isBelowRemainingPercentThreshold,
} from "../../session-continuity/token-usage";
import type {
  Session,
  SessionManager,
  SessionMessage,
} from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { SessionResumeMode } from "../../workspace-runtime/workspace-runtime-types";
import { type BridgeEvent, serializeSession } from "../types";
import {
  type ContinuityLockReason,
  type EmitContinuityLockEventOptions,
  type FlowNodeContinuityLockContext,
  SessionContinuityLockService,
} from "./session-continuity-lock-service";
import {
  type FlowNodeContinuityCreateReportRequestState,
  type FlowNodeRolloverNotification,
  SessionContinuityRolloverOrchestrator,
} from "./session-continuity-rollover-orchestrator";
import {
  type DescriptionDialogResolution as DescriptionDialogResolutionModel,
  SessionDescriptionDialogSync,
} from "./session-description-dialog-sync";
import { SessionProviderBindingService } from "./session-provider-binding-service";
import { SessionProviderEventRouter } from "./session-provider-event-router";
import { SessionProviderFailureRecovery } from "./session-provider-failure-recovery";
import { resolveProviderSessionId } from "./session-provider-session-resolver";
import {
  CONTINUITY_ROLLOVER_PENDING_ERROR_CODE,
  CONTINUITY_ROLLOVER_PENDING_ERROR_MESSAGE,
  type FlowNodeRolloverSendGuardDecision,
} from "./session-request-handler.types";
import {
  type PostTurnContextDecision,
  SessionRequestHandlerResumeLifecycle,
} from "./session-request-handler-resume-lifecycle";
import { SessionShellFactory } from "./session-shell-factory";
import {
  shouldHideUserMessage,
  stripInternalWorkflowTurnOptions,
} from "./workflow-turn-control";

const DIALOG_SEGMENT_BOUNDARY_MARKER = "__CODEAIHUB_SEGMENT_BOUNDARY__";
const DIALOG_SEGMENT_META_MARKER = "__CODEAIHUB_SEGMENT_META__:";

interface UnifiedSessionSegmentSummaryPayload {
  readonly kind: "segment_summary";
  readonly segments: readonly {
    readonly index: number;
    readonly remainingPercent?: number;
  }[];
}

const isUnifiedSessionSegmentSummaryPayload = (
  value: unknown
): value is UnifiedSessionSegmentSummaryPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as {
    readonly kind?: unknown;
    readonly segments?: unknown;
  };
  if (record.kind !== "segment_summary" || !Array.isArray(record.segments)) {
    return false;
  }
  for (const segment of record.segments) {
    if (!segment || typeof segment !== "object") {
      return false;
    }
    const candidate = segment as {
      readonly index?: unknown;
      readonly remainingPercent?: unknown;
    };
    if (
      typeof candidate.index !== "number" ||
      !Number.isFinite(candidate.index)
    ) {
      return false;
    }
    if (
      candidate.remainingPercent !== undefined &&
      (typeof candidate.remainingPercent !== "number" ||
        !Number.isFinite(candidate.remainingPercent))
    ) {
      return false;
    }
  }
  return true;
};

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

const MAX_CONTINUITY_RESUME_REPORT_BODY_CHARS = 8000;

export interface DialogMessagePayload {
  readonly content?: unknown;
  readonly role?: string;
  readonly tag?: string;
  readonly timestamp?: string;
}

type MessageContentPayload =
  | string
  | {
      readonly text?: unknown;
      readonly content?: unknown;
      readonly turnOptions?: unknown;
    };

interface MessageContentExtraction {
  readonly content: string;
  readonly turnOptions?: Record<string, unknown>;
}

type WorkflowStageId = "description" | "virtual_simulation" | "diagram_modules";

interface WorkflowTurnOptionsResolution {
  readonly appliedSchema: boolean;
  readonly source: "turnOptions" | "template" | "none";
  readonly stageMatched: boolean;
  readonly turnOptions?: Record<string, unknown>;
}

const WORKFLOW_STAGE_SET = new Set<WorkflowStageId>([
  "description",
  "virtual_simulation",
  "diagram_modules",
]);

const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");

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

const resolveWorkflowStage = (
  stage: string | null | undefined
): WorkflowStageId | null =>
  stage && WORKFLOW_STAGE_SET.has(stage as WorkflowStageId)
    ? (stage as WorkflowStageId)
    : null;

const resolveWorkflowTurnOptions = (params: {
  readonly stage: string | null | undefined;
  readonly turnOptions?: Record<string, unknown>;
}): WorkflowTurnOptionsResolution => {
  const stage = resolveWorkflowStage(params.stage);
  if (!stage) {
    return {
      turnOptions: params.turnOptions,
      appliedSchema: false,
      source: "none",
      stageMatched: false,
    };
  }

  return {
    turnOptions: stripInternalWorkflowTurnOptions(params.turnOptions),
    appliedSchema: false,
    source: "none",
    stageMatched: true,
  };
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
  private readonly dialogSegmentMetaWriteInFlight = new Set<string>();
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
  private readonly sessionShellFactory: SessionShellFactory;
  private readonly flowNodeContinuity: FlowNodeContinuityFacade;
  private readonly flowNodeContinuityCreateReportRequests = new Map<
    string,
    FlowNodeContinuityCreateReportRequestState
  >();
  private readonly retryBudgetBySessionId = new Map<
    string,
    { transientRetries: number; autoResumeAttempts: number }
  >();
  private readonly pendingUserIntentBySessionId = new Map<
    string,
    {
      content: string;
      timestamp: number;
      timerId: ReturnType<typeof setTimeout>;
    }
  >();

  private static readonly MAX_TRANSIENT_RETRIES = 1;
  private static readonly MAX_AUTO_RESUME_ATTEMPTS = 1;
  private static readonly PENDING_INTENT_TTL_MS = 60_000;
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

  private emitFlowNodeRolloverNotification(
    sessionId: string,
    notification: Omit<FlowNodeRolloverNotification, "timestamp">
  ): void {
    this.broadcaster({
      type: "session:stream",
      payload: {
        sessionId,
        event: {
          ...notification,
          timestamp: new Date().toISOString(),
        } satisfies FlowNodeRolloverNotification,
      },
    });
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

  private emitContinuityFailedEvent(options: {
    readonly sessionId: string;
    readonly providerId: string | null;
    readonly providerSessionId: string | null;
    readonly request: FlowNodeContinuityCreateReportRequestState;
    readonly reason: "report_timeout" | "unknown";
    readonly errorMessage: string;
  }): void {
    this.broadcaster({
      type: "session:stream",
      payload: {
        sessionId: options.sessionId,
        event: {
          type: "stream_event",
          provider: "core",
          sessionId: options.sessionId,
          data: {
            kind: "continuity_failed",
            reason: options.reason,
            error: options.errorMessage,
            requestId: options.request.requestId,
            attempt: options.request.attempt,
            stage: options.request.stage,
            reportPath: options.request.reportPath,
            tmpReportPath: options.request.tmpReportPath,
            ...(options.providerId ? { providerId: options.providerId } : {}),
            ...(options.providerSessionId
              ? { providerSessionId: options.providerSessionId }
              : {}),
          },
          uuid: `${crypto.randomUUID()}::continuity_failed`,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  private patchFlowNodeContinuityCreateReportRequest(options: {
    readonly sessionId: string;
    readonly requestId: string;
    readonly patch: Partial<
      Pick<FlowNodeContinuityCreateReportRequestState, "attempt" | "stage">
    >;
  }): void {
    const request = this.flowNodeContinuityCreateReportRequests.get(
      options.sessionId
    );
    if (!(request && request.requestId === options.requestId)) {
      return;
    }

    const updatedAtIso = new Date().toISOString();
    this.flowNodeContinuityCreateReportRequests.set(options.sessionId, {
      ...request,
      attempt: options.patch.attempt ?? request.attempt,
      stage: options.patch.stage ?? request.stage,
      updatedAtIso,
    });
  }

  private isContinuityReportTimeoutError(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message.startsWith("Timed out waiting for continuity report:")
    );
  }

  private truncateContinuityResumeReportBody(value: string): string {
    const normalized = value.trim();
    if (normalized.length <= MAX_CONTINUITY_RESUME_REPORT_BODY_CHARS) {
      return normalized;
    }
    return [
      normalized.slice(0, MAX_CONTINUITY_RESUME_REPORT_BODY_CHARS),
      "",
      "[...truncated...]",
    ].join("\n");
  }

  private async loadContinuityResumeReportBody(
    reportPath: string
  ): Promise<string> {
    try {
      const content = await readFile(reportPath, "utf8");
      return this.truncateContinuityResumeReportBody(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.truncateContinuityResumeReportBody(
        `Failed to read continuity report from disk (${reportPath}): ${message}`
      );
    }
  }

  private async dispatchFlowNodeContinuityCreateReportWithAck(options: {
    readonly sessionId: string;
    readonly requestId: string;
    readonly prompt: string;
    readonly notificationBase: Omit<
      FlowNodeRolloverNotification,
      | "timestamp"
      | "phase"
      | "continuityRequestId"
      | "continuityAttempt"
      | "reportPath"
      | "tmpReportPath"
    >;
    readonly reportPath: string;
    readonly tmpReportPath: string;
    readonly silent: boolean;
    readonly startAttempt?: number;
    readonly maxAttempts?: number;
  }): Promise<number> {
    const startAttempt = Math.max(1, Math.floor(options.startAttempt ?? 1));
    const attempt = startAttempt;

    this.patchFlowNodeContinuityCreateReportRequest({
      sessionId: options.sessionId,
      requestId: options.requestId,
      patch: { attempt, stage: "waiting_for_report" },
    });

    await this.sendInternalMessage(options.sessionId, options.prompt);

    if (!options.silent) {
      this.emitFlowNodeRolloverNotification(options.sessionId, {
        ...options.notificationBase,
        phase: "waiting_for_report",
        continuityRequestId: options.requestId,
        continuityAttempt: attempt,
        reportPath: options.reportPath,
        tmpReportPath: options.tmpReportPath,
      });
    }

    return attempt;
  }

  private async waitForFlowNodeContinuityReportWithRetry(options: {
    readonly sessionId: string;
    readonly requestId: string;
    readonly prompt: string;
    readonly notificationBase: Omit<
      FlowNodeRolloverNotification,
      | "timestamp"
      | "phase"
      | "continuityRequestId"
      | "continuityAttempt"
      | "reportPath"
      | "tmpReportPath"
    >;
    readonly reportPath: string;
    readonly tmpReportPath: string;
    readonly silent: boolean;
    readonly attempt: number;
  }): Promise<number> {
    await this.flowNodeContinuity.waitForReport({
      reportPath: options.reportPath,
      timeoutMs: Number.POSITIVE_INFINITY,
      pollIntervalMs: 250,
    });
    return options.attempt;
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
          this.sendInternalMessage(sessionId, content),
        createSession: async (request) => this.createContinuitySession(request),
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
          this.emitFlowNodeRolloverNotification(sessionId, notification),
        rolloverFlowNodeSession: (session, rollover, rolloverOptions) =>
          this.rolloverFlowNodeSession(session, rollover, rolloverOptions),
        getCreateReportRequest: (sessionId) =>
          this.flowNodeContinuityCreateReportRequests.get(sessionId) ?? null,
        deleteCreateReportRequest: (sessionId) => {
          this.flowNodeContinuityCreateReportRequests.delete(sessionId);
        },
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
          this.emitContinuityFailedEvent(failureOptions),
        isContinuityReportTimeoutError: (error) =>
          this.isContinuityReportTimeoutError(error),
      });
    this.descriptionDialogSync = new SessionDescriptionDialogSync({
      sessionStorage: this.sessionStorage,
      continuityRootBySessionId: this.continuityRootBySessionId,
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
        this.appendProviderMessage(sessionId, role, event),
      appendDialogMessage: (sessionId, payload) =>
        this.appendDialogMessage(sessionId, payload),
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
        this.consumeRetryBudget(sessionId, failureClass),
      expirePendingUserIntent: (sessionId) =>
        this.expirePendingUserIntent(sessionId),
    });
    this.sessionShellFactory = new SessionShellFactory({
      sessionManager: this.sessionManager,
      sessionStorage: this.sessionStorage,
      continuity: this.continuity,
      continuityRootBySessionId: this.continuityRootBySessionId,
      providerSessions: this.providerSessions,
      broadcaster: this.broadcaster,
      broadcastSessionBinding: (sessionId) =>
        this.providerBindingService.broadcastSessionBinding(sessionId),
      notifyRuntimeSessionCreated: (session) =>
        this.notifyRuntimeSessionCreated(session),
      registerInitialSessionLifecycle: (session, explicitMode) =>
        this.registerInitialSessionLifecycle(session, explicitMode),
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
        this.appendDialogSegmentBoundaryMeta(boundaryOptions),
    });
  }

  private resolveRunBoundProviderContext(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly initiativeSlug: string | null;
    readonly runSlug: string | null;
    readonly requestedProviderSessionId: string | null;
  }): {
    readonly providerId: string;
    readonly providerSessionId: string | null;
  } {
    return {
      providerId: options.providerId,
      providerSessionId: options.requestedProviderSessionId,
    };
  }

  private notifyRuntimeSessionCreated(session: Session): void {
    this.workspaceRuntime?.notifySessionCreated(
      {
        workspaceRoot: session.workspacePath,
        nodeId: session.stage ?? "session",
        sessionId: session.id,
      },
      {
        nodeId: session.stage ?? "session",
        providerId: session.providerId,
        providerSessionId: session.providerSessionId ?? undefined,
        bindingStatus: session.providerSessionStatus,
      }
    );
  }

  private registerInitialSessionLifecycle(
    session: Session,
    explicitMode?: SessionResumeMode
  ): void {
    this.resumeLifecycle.registerInitialSessionLifecycle(session, explicitMode);
  }

  private async createAndRegisterSession(
    options: CreateAndRegisterSessionOptions
  ): Promise<Session | null> {
    const shell = this.sessionShellFactory.shouldBroadcastCreatedEarly(options)
      ? await this.sessionShellFactory.createShellSession(options)
      : null;

    const providerSessionResolution = await resolveProviderSessionId({
      adapter: options.adapter,
      providerId: options.providerId,
      workspacePath: options.workspacePath,
      requestedProviderSessionId: options.context.providerSessionId,
    });
    if ("error" in providerSessionResolution) {
      if (shell) {
        this.sessionShellFactory.handleProviderResolutionError({
          session: shell.session,
          providerId: options.providerId,
          error: providerSessionResolution.error,
        });
        return shell.session;
      }
      this.broadcaster({
        type: "session:error",
        payload: { message: providerSessionResolution.error },
      });
      return null;
    }

    const { providerSessionId, supportsImmediateBinding } =
      providerSessionResolution;

    if (shell) {
      return await this.sessionShellFactory.bindShellSession(
        options,
        shell,
        providerSessionId,
        supportsImmediateBinding
      );
    }

    return await this.sessionShellFactory.createBoundSession(
      options,
      providerSessionId,
      supportsImmediateBinding
    );
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
    const match = chains.find((chain) => {
      if (chain.stage !== stage) {
        return false;
      }
      return chain.segments.some(
        (segment) => segment.providerSessionId === providerSessionId
      );
    });
    if (!match) {
      return null;
    }

    return match.dialogId ?? match.rootSessionId ?? null;
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
    if (workspaceSlug && stageId) {
      const requestedProviderSessionId = options.context.providerSessionId;
      if (requestedProviderSessionId) {
        const existingRoot =
          await this.tryResolveExistingContinuityRootSessionId({
            workspaceRoot: options.workspaceRoot,
            workspaceSlug,
            stageId,
            providerSessionId: requestedProviderSessionId,
          });
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
    return options.sessionId;
  }

  private async maybePromoteLegacyDescriptionAgentRootId(options: {
    readonly rootSessionId: string;
    readonly workspaceRoot: string;
    readonly providerId: string;
    readonly workspaceSlug: string | null;
    readonly stageId: string | null;
    readonly runSlug: string | null;
  }): Promise<string> {
    if (options.stageId !== "description") {
      return options.rootSessionId;
    }
    if (!options.rootSessionId.endsWith("-agent")) {
      return options.rootSessionId;
    }

    const normalizedRootSessionId = `${options.rootSessionId.slice(
      0,
      Math.max(0, options.rootSessionId.length - "-agent".length)
    )}-description`;

    const workspaceKey = sanitizeWorkspaceSlug(options.workspaceRoot);
    this.sessionStorage.promoteHistoryFile({
      workspaceSlug: workspaceKey,
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

  private resolveDescriptionDialog(options: {
    readonly session: Session;
    readonly providerSessionId: string;
  }): Promise<DescriptionDialogResolution> {
    return this.descriptionDialogSync.resolveDescriptionDialog(options);
  }

  private async createContinuitySession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly context: {
      readonly initiativeSlug: string | null;
      readonly stage: string | null;
    };
    readonly rootSessionId: string;
  }): Promise<Session | null> {
    const adapter = this.providerRegistry.getAdapter(options.providerId);
    if (!adapter) {
      this.logger.warn("Continuity session creation failed: provider missing", {
        providerId: options.providerId,
      });
      return null;
    }

    try {
      return await this.createAndRegisterSession({
        providerId: options.providerId,
        workspacePath: options.workspacePath,
        adapter,
        context: {
          initiativeSlug: options.context.initiativeSlug,
          stage: options.context.stage,
          runSlug: null,
          providerSessionId: null,
        },
        rootSessionId: options.rootSessionId,
      });
    } catch (error) {
      this.handleProviderFailure(options.providerId, error);
      return null;
    }
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

  private async sendInternalMessage(
    sessionId: string,
    content: string
  ): Promise<void> {
    const binding = this.providerSessions.get(sessionId);
    const adapter = binding
      ? this.providerRegistry.getAdapter(binding.providerId)
      : null;

    if (!(binding && adapter)) {
      this.logMissingProviderBindingForIncomingMessage(
        sessionId,
        binding?.providerId,
        Boolean(binding),
        Boolean(adapter)
      );
      this.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          message: "Provider binding is unavailable for internal message.",
          code: "missing_provider_binding",
          retryable: false,
        },
      });
      return;
    }

    // Internal workflow messages must participate in the same turn lifecycle as
    // user-submitted messages; otherwise PM/UI can incorrectly unlock input while
    // the provider is still working (some providers do not emit `turn_started`
    // for these internal dispatches).
    this.emitTurnStateEvent({ sessionId, state: "running" });
    try {
      await this.continuity.ensureTrackedOnOutboundMessage({
        sessionId,
        providerSessionId: binding.providerSessionId,
      });
    } catch (error) {
      this.emitTurnStateEvent({ sessionId, state: "idle" });
      this.logger.warn("Continuity tracking failed for internal message", {
        sessionId,
        providerId: binding.providerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    this.logDispatchingMessageToProvider(sessionId, binding, content.length);

    try {
      await adapter.sendMessage(binding.providerSessionId, content);
    } catch (error) {
      this.emitTurnStateEvent({ sessionId, state: "idle" });
      this.logProviderSendMessageFailed(sessionId, binding, error);
      this.handleProviderFailure(binding.providerId, error, sessionId);
    }
  }

  private normalizeProviderId(value?: string): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private resolveWorkspacePath(workspacePath?: string): string {
    const trimmed =
      typeof workspacePath === "string" && workspacePath.trim().length > 0
        ? workspacePath.trim()
        : undefined;
    const cwdPath = process.cwd();
    const environmentWorkspacePath = this.config.claudeWorkspacePath;

    if (
      environmentWorkspacePath &&
      (!trimmed || path.resolve(trimmed) === path.resolve(cwdPath))
    ) {
      return environmentWorkspacePath;
    }

    return trimmed ?? environmentWorkspacePath ?? cwdPath;
  }

  private normalizeNullableToken(
    value: string | null | undefined
  ): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private sessionMatchesResume(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly initiativeSlug: string | null;
    readonly stage: string | null;
    readonly runSlug: string | null;
    readonly providerSessionId: string;
    readonly session: Session;
  }): boolean {
    const session = options.session;
    if (session.providerId !== options.providerId) {
      return false;
    }
    if (session.workspacePath !== options.workspacePath) {
      return false;
    }
    if (options.stage !== null && session.stage !== options.stage) {
      return false;
    }
    if (options.runSlug !== null && session.runSlug !== options.runSlug) {
      return false;
    }
    if (
      options.initiativeSlug !== null &&
      session.initiativeSlug !== options.initiativeSlug
    ) {
      return false;
    }
    return session.providerSessionId === options.providerSessionId;
  }

  private resolveExistingResumeSession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly initiativeSlug: string | null;
    readonly stage: string | null;
    readonly runSlug: string | null;
    readonly providerSessionId: string;
  }): Session | null {
    const stage = this.normalizeNullableToken(options.stage);
    const initiativeSlug = this.normalizeNullableToken(options.initiativeSlug);
    const runSlug = this.normalizeNullableToken(options.runSlug);
    const providerSessionId = options.providerSessionId.trim();

    for (const session of this.sessionManager.listSessions()) {
      if (
        this.sessionMatchesResume({
          session,
          providerId: options.providerId,
          workspacePath: options.workspacePath,
          stage,
          runSlug,
          initiativeSlug,
          providerSessionId,
        })
      ) {
        return session;
      }
    }
    return null;
  }

  private broadcastExistingSession(session: Session): void {
    this.broadcaster({
      type: "session:created",
      payload: serializeSession(session),
    });
    this.broadcastSessionBinding(session.id);
  }

  private tryReuseExistingResumeSession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly providerSessionId: string | null;
    readonly context?: {
      readonly initiativeSlug?: string | null;
      readonly stage?: string | null;
      readonly runSlug?: string | null;
    };
  }): boolean {
    const providerSessionId = this.normalizeNullableToken(
      options.providerSessionId
    );
    if (!providerSessionId) {
      return false;
    }
    const existing = this.resolveExistingResumeSession({
      providerId: options.providerId,
      workspacePath: options.workspacePath,
      initiativeSlug: options.context?.initiativeSlug ?? null,
      stage: options.context?.stage ?? null,
      runSlug: options.context?.runSlug ?? null,
      providerSessionId,
    });
    if (!existing) {
      return false;
    }
    this.broadcastExistingSession(existing);
    return true;
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
    const normalizedRequestedProviderId = this.normalizeProviderId(providerId);
    const requestedProviderId =
      normalizedRequestedProviderId ?? this.getDefaultProviderId();
    const actualWorkspacePath = this.resolveWorkspacePath(workspacePath);

    const runBound = this.resolveRunBoundProviderContext({
      providerId: requestedProviderId,
      workspacePath: actualWorkspacePath,
      initiativeSlug: context?.initiativeSlug ?? null,
      runSlug: context?.runSlug ?? null,
      requestedProviderSessionId: context?.providerSessionId ?? null,
    });
    const actualProviderId = runBound.providerId;
    if (
      this.tryReuseExistingResumeSession({
        providerId: actualProviderId,
        workspacePath: actualWorkspacePath,
        providerSessionId: runBound.providerSessionId,
        context: {
          initiativeSlug: context?.initiativeSlug ?? null,
          stage: context?.stage ?? null,
          runSlug: context?.runSlug ?? null,
        },
      })
    ) {
      return;
    }
    const adapter = this.providerRegistry.getAdapter(actualProviderId);

    if (!adapter) {
      this.broadcaster({
        type: "session:error",
        payload: { message: `Provider ${actualProviderId} unavailable` },
      });
      return;
    }

    try {
      await this.createAndRegisterSession({
        providerId: actualProviderId,
        workspacePath: actualWorkspacePath,
        adapter,
        context: {
          initiativeSlug: context?.initiativeSlug ?? null,
          stage: context?.stage ?? null,
          runSlug: context?.runSlug ?? null,
          providerSessionId: runBound.providerSessionId,
        },
      });
    } catch (error) {
      this.handleProviderFailure(actualProviderId, error);
    }
  }

  async handleDialogSend(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly dialogId: string;
    readonly content: string;
  }): Promise<
    { readonly ok: true } | { readonly ok: false; readonly error: string }
  > {
    const chains = await SessionContinuityFacade.readWorkspaceChains({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
    });
    const chain = chains.find(
      (candidate) =>
        (candidate.dialogId ?? candidate.rootSessionId) === options.dialogId
    );
    if (!chain) {
      return { ok: false, error: "Dialog chain not found" };
    }
    const last = chain.segments.at(-1) ?? null;
    if (!last) {
      return { ok: false, error: "Dialog has no segments" };
    }

    const existingSession = this.sessionManager
      .getSessionsByWorkspacePath(options.workspaceRoot)
      .find(
        (candidate) =>
          candidate.providerId === last.providerId &&
          candidate.providerSessionId === last.providerSessionId
      );

    const adapter = this.providerRegistry.getAdapter(last.providerId);
    if (!adapter) {
      return { ok: false, error: `Provider ${last.providerId} unavailable` };
    }

    const resolvedSession =
      existingSession ??
      (await this.createAndRegisterSession({
        providerId: last.providerId,
        workspacePath: options.workspaceRoot,
        adapter,
        context: {
          initiativeSlug: options.workspaceSlug,
          stage: chain.stage === "unknown" ? null : chain.stage,
          runSlug: this.inferRunSlugFromDialogId(options.dialogId),
          providerSessionId: last.providerSessionId,
        },
        rootSessionId: options.dialogId,
      }));

    if (!resolvedSession) {
      return { ok: false, error: "Failed to resume dialog session" };
    }

    await this.handleMessage(resolvedSession.id, options.content);
    return { ok: true };
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

  private inferRunSlugFromDialogId(dialogId: string): string | null {
    const trimmed = dialogId.trim().toLowerCase();
    if (trimmed.endsWith("__collector") || trimmed.endsWith("-collector")) {
      return "collector";
    }
    return null;
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
      return await this.createAndRegisterSession({
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
    const extracted = this.extractMessageContentAndTurnOptions(messagePayload);
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

    if (
      !(
        hiddenUserMessage ||
        (await this.appendVisibleUserMessage(session, sessionId, content))
      )
    ) {
      return;
    }

    const binding = this.providerSessions.get(sessionId);
    const adapter = binding
      ? this.providerRegistry.getAdapter(binding.providerId)
      : null;

    if (!(binding && adapter)) {
      this.logMissingProviderBindingForIncomingMessage(
        sessionId,
        binding?.providerId,
        Boolean(binding),
        Boolean(adapter)
      );
      this.trackPendingUserIntent(sessionId, content);
      this.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          message:
            "Provider binding is unavailable. Your message has been saved and will be retried when the provider recovers.",
          code: "missing_provider_binding",
          retryable: true,
        },
      });
      return;
    }

    this.emitTurnStateEvent({ sessionId, state: "running" });
    try {
      await this.continuity.ensureTrackedOnOutboundMessage({
        sessionId,
        providerSessionId: binding.providerSessionId,
      });

      this.logDispatchingMessageToProvider(sessionId, binding, content.length);

      const workflowTurnOptions = await resolveWorkflowTurnOptions({
        stage: session.stage,
        turnOptions,
      });
      const providerTurnOptions = workflowTurnOptions.stageMatched
        ? workflowTurnOptions.turnOptions
        : stripInternalWorkflowTurnOptions(turnOptions);
      if (workflowTurnOptions.appliedSchema) {
        this.logger.info("Applied workflow output schema", {
          sessionId,
          stage: session.stage,
          source: workflowTurnOptions.source,
        });
      }
      await adapter.sendMessage(
        binding.providerSessionId,
        content,
        providerTurnOptions
      );
    } catch (error) {
      this.emitTurnStateEvent({ sessionId, state: "idle" });
      this.logProviderSendMessageFailed(sessionId, binding, error);
      this.handleProviderFailure(binding.providerId, error, sessionId);
    }
  }

  private async appendVisibleUserMessage(
    session: Session,
    sessionId: string,
    content: string
  ): Promise<boolean> {
    const userMessage = this.sessionManager.appendMessage(
      sessionId,
      "user",
      content
    );
    if (!userMessage) {
      this.broadcaster({
        type: "session:error",
        payload: { sessionId, message: "Session not found" },
      });
      return false;
    }

    try {
      await this.sessionStorage.appendMessage(sessionId, userMessage);
    } catch (error: unknown) {
      this.logger.error(
        "Failed to append unified session record",
        error as Error,
        {
          sessionId,
          providerId: session.providerId,
        }
      );
      this.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          message: "Failed to persist message to history",
        },
      });
      return false;
    }

    this.broadcaster({ type: "session:message", payload: userMessage });
    return true;
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

  private toSafeTimestamp(value: string): string {
    return (
      value
        .trim()
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/-$/g, "") || "unknown"
    );
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

  private resolveFlowNodeId(stageId: string, runSlug: string | null): string {
    return runSlug ? `${stageId}/${runSlug}` : stageId;
  }

  private resolveFlowNodeRole(runSlug: string | null): string {
    if (!runSlug) {
      return "Agent";
    }
    return `${runSlug.slice(0, 1).toUpperCase()}${runSlug.slice(1)}`;
  }

  private resolveFlowNodeContinuityTemplate(): {
    readonly templateId:
      | "flow/continuity/create-report-doc.md"
      | "flow/continuity/create-report-code.md";
    readonly canonicalArtifactPath: string;
    readonly isReviewerBootstrapEligible: boolean;
  } {
    return {
      templateId: "flow/continuity/create-report-code.md",
      canonicalArtifactPath: "",
      isReviewerBootstrapEligible: false,
    };
  }

  private async rolloverFlowNodeSession(
    session: Session,
    rollover: {
      readonly remainingPercent: number;
      readonly thresholdPercent: number;
      readonly rolloverId: string;
    },
    options?: { readonly silent: boolean }
  ): Promise<void> {
    const adapter = this.providerRegistry.getAdapter(session.providerId);
    if (!adapter) {
      this.finalizeFlowNodeContinuityLock({
        sessionId: session.id,
        reason: "resume_failed",
      });
      return;
    }

    const workspaceSlug = session.initiativeSlug;
    const stageId = session.stage;
    if (!(workspaceSlug && stageId)) {
      this.finalizeFlowNodeContinuityLock({
        sessionId: session.id,
        reason: "resume_failed",
      });
      return;
    }

    const runSlug = session.runSlug ?? null;
    const nodeId = this.resolveFlowNodeId(stageId, runSlug);
    const role = this.resolveFlowNodeRole(runSlug);
    const timestamp = this.toSafeTimestamp(new Date().toISOString());
    const requestId = crypto.randomUUID();
    const requestAttempt = 1;

    const reportPaths = this.flowNodeContinuity.buildReportPaths({
      workspaceRoot: session.workspacePath,
      workspaceSlug,
      nodeId,
      role,
      providerId: session.providerId,
      timestamp,
    });

    const requestTimestampIso = new Date().toISOString();
    this.flowNodeContinuityCreateReportRequests.set(session.id, {
      requestId,
      attempt: requestAttempt,
      stage: "waiting_for_report",
      reportPath: reportPaths.reportPath,
      tmpReportPath: reportPaths.tmpReportPath,
      createdAtIso: requestTimestampIso,
      updatedAtIso: requestTimestampIso,
    });

    const notificationBase = {
      kind: "flow_node_rollover",
      sourceSessionId: session.id,
      providerId: session.providerId,
      stageId,
      runSlug,
      remainingPercent: rollover.remainingPercent,
      thresholdPercent: rollover.thresholdPercent,
    } as const;

    const sourceLockContext = this.registerFlowNodeContinuityLockContext({
      rolloverId: rollover.rolloverId,
      sourceSessionId: session.id,
      stageId,
      runSlug,
      awaitingBootstrapTurn: false,
    });
    this.emitContinuityLockEvent({
      sessionId: session.id,
      rolloverId: sourceLockContext.rolloverId,
      sourceSessionId: sourceLockContext.sourceSessionId,
      stageId: sourceLockContext.stageId,
      runSlug: sourceLockContext.runSlug,
      state: "locked",
      reason: "report_in_progress",
    });

    if (!options?.silent) {
      this.emitFlowNodeRolloverNotification(session.id, {
        ...notificationBase,
        phase: "create_report_sent",
        continuityRequestId: requestId,
        continuityAttempt: requestAttempt,
        reportPath: reportPaths.reportPath,
        tmpReportPath: reportPaths.tmpReportPath,
      });
    }

    const { canonicalArtifactPath, templateId } =
      this.resolveFlowNodeContinuityTemplate();

    const createReportPrompt = this.flowNodeContinuity.renderTemplate(
      templateId,
      {
        nodeId,
        role,
        reportPath: reportPaths.reportPath,
        canonicalArtifactPath,
      }
    );

    const wrappedCreateReportPrompt = [
      "INTERNAL: Context budget is low. Prepare continuity report and save it on disk.",
      `- Temp path: \`${reportPaths.tmpReportPath}\``,
      `- Final path: \`${reportPaths.reportPath}\``,
      "",
      createReportPrompt.trim(),
    ].join("\n");

    const ackedAttempt =
      await this.dispatchFlowNodeContinuityCreateReportWithAck({
        sessionId: session.id,
        requestId,
        prompt: wrappedCreateReportPrompt,
        notificationBase,
        reportPath: reportPaths.reportPath,
        tmpReportPath: reportPaths.tmpReportPath,
        silent: options?.silent === true,
      });

    const finalAttempt = await this.waitForFlowNodeContinuityReportWithRetry({
      sessionId: session.id,
      requestId,
      prompt: wrappedCreateReportPrompt,
      notificationBase,
      reportPath: reportPaths.reportPath,
      tmpReportPath: reportPaths.tmpReportPath,
      silent: options?.silent === true,
      attempt: ackedAttempt,
    });

    const completedRequestState =
      this.flowNodeContinuityCreateReportRequests.get(session.id);
    if (
      completedRequestState &&
      completedRequestState.requestId === requestId
    ) {
      const updatedAtIso = new Date().toISOString();
      this.flowNodeContinuityCreateReportRequests.set(session.id, {
        ...completedRequestState,
        stage: "completed",
        updatedAtIso,
      });
    }

    if (!options?.silent) {
      this.emitFlowNodeRolloverNotification(session.id, {
        ...notificationBase,
        phase: "report_ready",
        continuityRequestId: requestId,
        continuityAttempt: finalAttempt,
        reportPath: reportPaths.reportPath,
      });
    }
    // Providers may sometimes miss `turn_completed` after internal prompts. Ensure
    // the UI is not left in a perpetual "working" state once the report is ready.
    this.emitTurnStateEvent({ sessionId: session.id, state: "idle" });

    const nextSession = await this.createAndRegisterSession({
      providerId: session.providerId,
      workspacePath: session.workspacePath,
      adapter,
      resumeMode: "resume_via_rollover",
      silent: options?.silent === true,
      context: {
        initiativeSlug: workspaceSlug,
        stage: stageId,
        runSlug: session.runSlug,
        providerSessionId: null,
      },
      rootSessionId:
        this.continuityRootBySessionId.get(session.id) ?? session.id,
      continuationParentId: session.id,
    });

    if (!nextSession) {
      this.finalizeFlowNodeContinuityLock({
        sessionId: session.id,
        reason: "resume_failed",
      });
      return;
    }

    const targetLockContext = this.registerFlowNodeContinuityLockContext({
      rolloverId: rollover.rolloverId,
      sourceSessionId: session.id,
      targetSessionId: nextSession.id,
      stageId,
      runSlug,
      awaitingBootstrapTurn: true,
    });

    if (!options?.silent) {
      this.emitFlowNodeRolloverNotification(session.id, {
        ...notificationBase,
        phase: "new_session_created",
        continuityRequestId: requestId,
        continuityAttempt: finalAttempt,
        nextSessionId: nextSession.id,
      });
    }

    this.emitContinuityLockEvent({
      sessionId: nextSession.id,
      rolloverId: targetLockContext.rolloverId,
      sourceSessionId: targetLockContext.sourceSessionId,
      targetSessionId: targetLockContext.targetSessionId,
      stageId: targetLockContext.stageId,
      runSlug: targetLockContext.runSlug,
      state: "locked",
      reason: "resume_bootstrap",
    });

    const resumePrompt = this.flowNodeContinuity.renderTemplate(
      "flow/continuity/resume.md",
      {
        nodeId,
        role,
        reportPath: reportPaths.reportPath,
        reportBody: await this.loadContinuityResumeReportBody(
          reportPaths.reportPath
        ),
      }
    );

    const resumePromptTrimmed = resumePrompt.trim();
    await this.sendInternalMessage(nextSession.id, resumePromptTrimmed);

    if (!options?.silent) {
      this.emitFlowNodeRolloverNotification(nextSession.id, {
        ...notificationBase,
        phase: "resume_sent",
        continuityRequestId: requestId,
        continuityAttempt: finalAttempt,
        nextSessionId: nextSession.id,
        reportPath: reportPaths.reportPath,
      });
    }
  }

  private async appendDialogSegmentBoundaryMeta(options: {
    readonly session: Session;
    readonly workspaceSlug: string;
    readonly stageId: string;
    readonly silent: boolean;
  }): Promise<void> {
    if (options.silent) {
      return;
    }

    const rootDialogId =
      this.continuityRootBySessionId.get(options.session.id) ??
      options.session.id;

    try {
      const workspaceKey = sanitizeWorkspaceSlug(options.session.workspacePath);
      const jsonlPath = buildSessionFilePath({
        rootDirectory: SESSION_ROOT,
        workspaceSlug: workspaceKey,
        provider: options.session.providerId,
        sessionId: sanitizeWorkspaceSlug(rootDialogId),
      });

      await this.continuity.ensureTrackedOnOutboundMessage({
        sessionId: options.session.id,
        providerSessionId: options.session.providerSessionId,
      });

      const store = new ContinuityChainStore({
        workspaceRoot: options.session.workspacePath,
        workspaceSlug: options.workspaceSlug,
        stage: options.stageId,
        rootSessionId: rootDialogId,
      });

      const chain = await store.read();
      if (!chain || chain.segments.length <= 1) {
        return;
      }

      const inFlightKey = `${jsonlPath}#${chain.segments.length}`;
      if (this.dialogSegmentMetaWriteInFlight.has(inFlightKey)) {
        this.logger.warn("Skipping dialog segment meta append (in-flight)", {
          dialogId: rootDialogId,
          sessionId: options.session.id,
          segments: chain.segments.length,
        });
        return;
      }
      this.dialogSegmentMetaWriteInFlight.add(inFlightKey);
      try {
        const latestSummary = await this.readLatestSegmentSummary(jsonlPath);
        if (
          latestSummary &&
          latestSummary.segments.length === chain.segments.length
        ) {
          this.logger.info("Dialog segment meta already up-to-date", {
            dialogId: rootDialogId,
            sessionId: options.session.id,
            segments: chain.segments.length,
          });
          return;
        }

        const segments = chain.segments.map((segment, index) => {
          const snapshot = segment.tokenUsage ?? null;
          const remainingPercent = snapshot
            ? computeRemainingPercent(snapshot)
            : null;
          return {
            index: index + 1,
            providerId: segment.providerId,
            providerSessionId: segment.providerSessionId,
            ...(remainingPercent === null ? {} : { remainingPercent }),
          } as const;
        });

        const payload = {
          kind: "segment_summary",
          dialogId: rootDialogId,
          segments,
        } as const;

        const content = [
          DIALOG_SEGMENT_BOUNDARY_MARKER,
          "Новая сессия",
          `${DIALOG_SEGMENT_META_MARKER}${JSON.stringify(payload)}`,
        ].join("\n");

        const metaMessage = this.sessionManager.appendMessage(
          options.session.id,
          "system",
          content
        );
        if (!metaMessage) {
          return;
        }
        await this.sessionStorage.appendMessage(
          options.session.id,
          metaMessage
        );
        this.broadcaster({ type: "session:message", payload: metaMessage });
        this.broadcastDialogMessage(options.session.id, metaMessage);
      } finally {
        this.dialogSegmentMetaWriteInFlight.delete(inFlightKey);
      }
    } catch (error: unknown) {
      this.logger.warn("Failed to append dialog segment meta", {
        dialogId: rootDialogId,
        sessionId: options.session.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private tryParseSegmentSummaryPayloadFromBoundaryMessage(
    content: string
  ): UnifiedSessionSegmentSummaryPayload | null {
    const lines = content.split("\n").map((line) => line.trim());
    if (lines[0] !== DIALOG_SEGMENT_BOUNDARY_MARKER) {
      return null;
    }
    const metaLine = lines.find((line) =>
      line.startsWith(DIALOG_SEGMENT_META_MARKER)
    );
    if (!metaLine) {
      return null;
    }
    const json = metaLine.slice(DIALOG_SEGMENT_META_MARKER.length).trim();
    if (!json) {
      return null;
    }
    try {
      const parsed = JSON.parse(json) as unknown;
      return isUnifiedSessionSegmentSummaryPayload(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private async readLatestSegmentSummary(
    jsonlPath: string
  ): Promise<UnifiedSessionSegmentSummaryPayload | null> {
    const existingRecords = await readSessionEvents(jsonlPath);
    let latestSummary: UnifiedSessionSegmentSummaryPayload | null = null;
    for (const record of existingRecords) {
      if (record.type !== "message" || record.role !== "system") {
        continue;
      }
      const parsed = this.tryParseSegmentSummaryPayloadFromBoundaryMessage(
        record.content
      );
      if (parsed) {
        latestSummary = parsed;
      }
    }
    return latestSummary;
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

  private getRetryBudget(sessionId: string): {
    transientRetries: number;
    autoResumeAttempts: number;
  } {
    const existing = this.retryBudgetBySessionId.get(sessionId);
    if (existing) {
      return existing;
    }
    const budget = { transientRetries: 0, autoResumeAttempts: 0 };
    this.retryBudgetBySessionId.set(sessionId, budget);
    return budget;
  }

  private consumeRetryBudget(sessionId: string, failureClass: string): void {
    const budget = this.getRetryBudget(sessionId);
    if (failureClass === "transient_turn_failure") {
      budget.transientRetries += 1;
      if (
        budget.transientRetries > SessionRequestHandler.MAX_TRANSIENT_RETRIES
      ) {
        this.logger.warn("Transient retry budget exhausted", {
          sessionId,
          retries: budget.transientRetries,
        });
      }
    } else if (failureClass === "session_binding_recoverable") {
      budget.autoResumeAttempts += 1;
      if (
        budget.autoResumeAttempts >
        SessionRequestHandler.MAX_AUTO_RESUME_ATTEMPTS
      ) {
        this.logger.warn("Auto-resume budget exhausted", {
          sessionId,
          attempts: budget.autoResumeAttempts,
        });
      }
    }
  }

  hasRetryBudget(sessionId: string): boolean {
    const budget = this.getRetryBudget(sessionId);
    return (
      budget.transientRetries <= SessionRequestHandler.MAX_TRANSIENT_RETRIES &&
      budget.autoResumeAttempts <=
        SessionRequestHandler.MAX_AUTO_RESUME_ATTEMPTS
    );
  }

  resetRetryBudget(sessionId: string): void {
    this.retryBudgetBySessionId.delete(sessionId);
  }

  trackPendingUserIntent(sessionId: string, content: string): void {
    this.clearPendingUserIntent(sessionId);
    const timerId = setTimeout(() => {
      this.expirePendingUserIntent(sessionId);
    }, SessionRequestHandler.PENDING_INTENT_TTL_MS);
    this.pendingUserIntentBySessionId.set(sessionId, {
      content,
      timestamp: Date.now(),
      timerId,
    });
  }

  getPendingUserIntent(sessionId: string): string | null {
    const intent = this.pendingUserIntentBySessionId.get(sessionId);
    if (!intent) {
      return null;
    }
    const elapsed = Date.now() - intent.timestamp;
    if (elapsed > SessionRequestHandler.PENDING_INTENT_TTL_MS) {
      this.expirePendingUserIntent(sessionId);
      return null;
    }
    return intent.content;
  }

  private clearPendingUserIntent(sessionId: string): void {
    const existing = this.pendingUserIntentBySessionId.get(sessionId);
    if (existing) {
      clearTimeout(existing.timerId);
      this.pendingUserIntentBySessionId.delete(sessionId);
    }
  }

  private expirePendingUserIntent(sessionId: string): void {
    const existing = this.pendingUserIntentBySessionId.get(sessionId);
    if (existing) {
      clearTimeout(existing.timerId);
      this.pendingUserIntentBySessionId.delete(sessionId);
      this.logger.warn("Pending user intent TTL expired", {
        sessionId,
        contentLength: existing.content.length,
        elapsedMs: Date.now() - existing.timestamp,
      });
      this.broadcaster({
        type: "session:error",
        payload: {
          sessionId,
          message:
            "Your previous message was not delivered. Please send it again.",
          code: "pending_intent_expired",
          pendingIntentExpired: true,
        },
      });
    }
  }

  private appendProviderMessage(
    sessionId: string,
    role: "assistant" | "system" | "thinking",
    event: unknown
  ): void {
    const content = this.extractMessageContent(event);
    if (!content) {
      return;
    }
    const timestamp = this.extractEventTimestamp(event);
    const message = this.sessionManager.appendMessage(
      sessionId,
      role,
      content,
      { timestamp: timestamp ?? undefined }
    );
    if (message) {
      this.sessionStorage
        .appendMessage(sessionId, message)
        .then(() => {
          this.broadcaster({ type: "session:message", payload: message });
          this.broadcastDialogMessage(sessionId, message);
        })
        .catch((error: unknown) => {
          this.logger.error(
            "Failed to append unified session record",
            error as Error,
            { sessionId }
          );
        });
    }
  }

  private appendDialogMessage(
    sessionId: string,
    payload: DialogMessagePayload
  ): void {
    if (!payload?.content || typeof payload.content !== "string") {
      return;
    }
    const role =
      payload.role === "user" ||
      payload.role === "assistant" ||
      payload.role === "thinking"
        ? payload.role
        : "assistant";
    const tag =
      payload.tag && typeof payload.tag === "string" ? payload.tag : undefined;
    const message = this.sessionManager.appendMessage(
      sessionId,
      role,
      payload.content,
      { timestamp: payload.timestamp, tag }
    );
    if (message) {
      this.sessionStorage
        .appendMessage(sessionId, message)
        .then(() => {
          this.broadcaster({ type: "session:message", payload: message });
          this.broadcastDialogMessage(sessionId, message);
        })
        .catch((error: unknown) => {
          this.logger.error(
            "Failed to append unified session record",
            error as Error,
            { sessionId }
          );
        });
    }
  }

  private broadcastDialogMessage(
    sessionId: string,
    message: SessionMessage
  ): void {
    const dialogId = this.continuityRootBySessionId.get(sessionId) ?? null;
    if (!dialogId) {
      return;
    }
    this.broadcaster({
      type: "dialog:message",
      payload: {
        dialogId,
        sessionId,
        message,
      },
    });
  }

  private extractMessageContent(event: unknown): string | null {
    if (!event || typeof event !== "object") {
      return null;
    }
    const typed = event as {
      readonly content?: unknown;
      readonly data?: unknown;
    };
    if (typeof typed.content === "string") {
      return typed.content;
    }
    if (typed.content && typeof typed.content === "object") {
      return JSON.stringify(typed.content);
    }
    if (typed.data) {
      return JSON.stringify(typed.data);
    }
    return null;
  }

  private extractEventTimestamp(event: unknown): string | null {
    if (!event || typeof event !== "object") {
      return null;
    }
    const typed = event as { readonly timestamp?: unknown };
    if (typeof typed.timestamp !== "string") {
      return null;
    }
    const normalized = typed.timestamp.trim();
    return Number.isNaN(Date.parse(normalized)) ? null : normalized;
  }

  private extractMessageContentAndTurnOptions(
    payload: MessageContentPayload
  ): MessageContentExtraction | null {
    if (typeof payload === "string") {
      return { content: payload };
    }
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const typed = payload as {
      readonly text?: unknown;
      readonly content?: unknown;
      readonly turnOptions?: unknown;
    };
    let content: string | null = null;
    if (typeof typed.text === "string") {
      content = typed.text;
    } else if (typeof typed.content === "string") {
      content = typed.content;
    }

    if (!content) {
      return null;
    }

    const turnOptions =
      typed.turnOptions &&
      typeof typed.turnOptions === "object" &&
      !Array.isArray(typed.turnOptions)
        ? (typed.turnOptions as Record<string, unknown>)
        : undefined;

    return { content, turnOptions };
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

  private logMissingProviderBindingForIncomingMessage(
    sessionId: string,
    providerId: string | undefined,
    hasBinding: boolean,
    hasAdapter: boolean
  ): void {
    this.logger.warn("Provider binding or adapter missing for session", {
      sessionId,
      providerId: providerId ?? null,
      hasBinding,
      hasAdapter,
    });
    this.logger.warn("Known provider session bindings", {
      sessionId,
      knownSessionIds: Array.from(this.providerSessions.keys()),
    });
  }

  private logDispatchingMessageToProvider(
    sessionId: string,
    binding: ProviderSessionBinding,
    contentLength: number
  ): void {
    this.logger.info("Dispatching message to provider adapter", {
      sessionId,
      providerId: binding.providerId,
      providerSessionId: binding.providerSessionId,
      contentLength,
    });
  }

  private logProviderSendMessageFailed(
    sessionId: string,
    binding: ProviderSessionBinding,
    error: unknown
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn("Provider sendMessage failed", {
      sessionId,
      providerId: binding.providerId,
      providerSessionId: binding.providerSessionId,
      error: message,
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
