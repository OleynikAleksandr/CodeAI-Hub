import crypto from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import type { CoreConfig } from "../../config";
import { FlowNodeContinuityFacade } from "../../flow-node-continuity/flow-node-continuity-facade";
import type { ProviderRegistry } from "../../provider-registry";
import type { TokenUsageSnapshot } from "../../session-continuity/continuity-types";
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
import { DescriptionStepStore } from "../../workflow/description";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type {
  SessionContinuityLockReason,
  SessionContinuityLockTransition,
  SessionResumeMode,
  SessionTerminalLockReason,
} from "../../workspace-runtime/workspace-runtime-types";
import { type BridgeEvent, serializeSession } from "../types";
import {
  CONTINUITY_ROLLOVER_PENDING_ERROR_CODE,
  CONTINUITY_ROLLOVER_PENDING_ERROR_MESSAGE,
  type FlowNodeRolloverSendGuardDecision,
} from "./session-request-handler.types";

type ProviderAdapter = NonNullable<ReturnType<ProviderRegistry["getAdapter"]>>;

const DESCRIPTION_DIALOG_SESSION_SUFFIX_REGEX = /__(collector|reviewer)$/;

type ProviderSessionResolution =
  | {
      readonly providerSessionId: string;
      readonly didResume: boolean;
      readonly supportsImmediateBinding: boolean;
    }
  | { readonly error: string };

export type ProviderSessionBinding = {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
};

export type ProviderEventEnvelope = {
  readonly type?: string;
  readonly payload?: unknown;
};

const MAX_CONTINUITY_RESUME_REPORT_BODY_CHARS = 8000;

export type DialogMessagePayload = {
  readonly role?: string;
  readonly content?: unknown;
  readonly timestamp?: string;
};

type MessageContentPayload =
  | string
  | {
      readonly text?: unknown;
      readonly content?: unknown;
      readonly turnOptions?: unknown;
    };

type MessageContentExtraction = {
  readonly content: string;
  readonly turnOptions?: Record<string, unknown>;
};

type SessionIdChangedPayload = {
  readonly newId?: string;
};

type ProviderErrorEnvelope = {
  readonly provider?: unknown;
  readonly message?: unknown;
  readonly error?: unknown;
  readonly payload?: unknown;
  readonly type?: unknown;
};

type FlowNodeRolloverPhase =
  | "start"
  | "create_report_sent"
  | "waiting_for_report_ack"
  | "waiting_for_report"
  | "report_ready"
  | "new_session_created"
  | "resume_sent"
  | "failed";

type FlowNodeRolloverNotification = {
  readonly kind: "flow_node_rollover";
  readonly phase: FlowNodeRolloverPhase;
  readonly sourceSessionId: string;
  readonly nextSessionId?: string;
  readonly providerId: string;
  readonly stageId: string;
  readonly runSlug: string | null;
  readonly remainingPercent?: number;
  readonly thresholdPercent?: number;
  readonly continuityRequestId?: string;
  readonly continuityAttempt?: number;
  readonly reportPath?: string;
  readonly tmpReportPath?: string;
  readonly error?: string;
  readonly timestamp: string;
};

type FlowNodeContinuityCreateReportRequestStage =
  | "waiting_for_ack"
  | "waiting_for_report"
  | "completed"
  | "failed";

type FlowNodeContinuityCreateReportRequestState = {
  readonly requestId: string;
  readonly attempt: number;
  readonly stage: FlowNodeContinuityCreateReportRequestStage;
  readonly reportPath: string;
  readonly tmpReportPath: string;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

type FlowNodeContinuityAckWaiter = {
  readonly requestId: string;
  readonly timeoutId: NodeJS.Timeout;
  readonly resolve: (acked: boolean) => void;
};

type ContinuityLockState = "locked" | "unlocked";

type ContinuityLockReason = SessionContinuityLockReason;

type ContinuityLockPayload = {
  readonly kind: "continuity_lock";
  readonly state: ContinuityLockState;
  readonly rolloverId: string;
  readonly sourceSessionId: string;
  readonly targetSessionId?: string;
  readonly stageId: string;
  readonly runSlug: string | null;
  readonly reason: ContinuityLockReason;
  readonly timestamp: string;
};

type FlowNodeContinuityLockContext = {
  readonly rolloverId: string;
  readonly sourceSessionId: string;
  readonly targetSessionId?: string;
  readonly stageId: string;
  readonly runSlug: string | null;
  readonly awaitingBootstrapTurn: boolean;
};

type SessionResumeLifecycleState = {
  readonly mode: SessionResumeMode;
  readonly finalTurnCompleted: boolean;
  readonly terminalLockReason: SessionTerminalLockReason | null;
};

type SessionResumeLifecycleStoreHost = {
  sessionResumeLifecycleStates?: Map<string, SessionResumeLifecycleState>;
};

type PostTurnContextDecision = "no_rollover" | "rollover_required";

type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "diagram_facades";

type WorkflowTurnOptionsResolution = {
  readonly turnOptions?: Record<string, unknown>;
  readonly appliedSchema: boolean;
  readonly source: "turnOptions" | "template" | "none";
  readonly stageMatched: boolean;
};

const WORKFLOW_STAGE_SET = new Set<WorkflowStageId>([
  "description",
  "virtual_simulation",
  "diagram_modules",
  "diagram_facades",
]);

const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");

const DEFAULT_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 30;
const MIN_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
const MAX_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;
const FLOW_NODE_CONTINUITY_RESUME_TIMEOUT_MS = 90_000;

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

const stripOutputSchema = (
  turnOptions?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (!turnOptions) {
    return;
  }
  if (!("outputSchema" in turnOptions)) {
    return turnOptions;
  }
  const { outputSchema: _ignored, ...rest } = turnOptions;
  return Object.keys(rest).length > 0 ? rest : undefined;
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
    turnOptions: stripOutputSchema(params.turnOptions),
    appliedSchema: false,
    source: "none",
    stageMatched: true,
  };
};

export type SessionRequestHandlerOptions = {
  readonly config: CoreConfig;
  readonly sessionManager: SessionManager;
  readonly providerRegistry: ProviderRegistry;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly logger: Logger;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly stateBroadcaster: () => void;
  readonly continuityClock?: () => string;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
};

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
  private readonly descriptionStepStore = new DescriptionStepStore();
  private readonly flowNodeContinuity: FlowNodeContinuityFacade;
  private readonly flowNodeRolloverInFlight = new Set<string>();
  private readonly flowNodeRolloverStarted = new Set<string>();
  private readonly flowNodeTokenUsageSnapshots = new Map<
    string,
    TokenUsageSnapshot
  >();
  private readonly flowNodeContinuityLockContexts = new Map<
    string,
    FlowNodeContinuityLockContext
  >();
  private readonly flowNodeContinuityLockTimeouts = new Map<
    string,
    NodeJS.Timeout
  >();
  private readonly flowNodeContinuityCreateReportRequests = new Map<
    string,
    FlowNodeContinuityCreateReportRequestState
  >();
  private readonly flowNodeContinuityCreateReportAckWaiters = new Map<
    string,
    FlowNodeContinuityAckWaiter
  >();
  private readonly sessionResumeLifecycleStates = new Map<
    string,
    SessionResumeLifecycleState
  >();
  private readonly postTurnContextDecisionPendingSessions = new Set<string>();
  private readonly postTurnContextDecisionBySessionId = new Map<
    string,
    PostTurnContextDecision
  >();
  private flowNodeContinuitySettingsCache: {
    readonly mtimeMs: number;
    readonly settings: unknown;
  } | null = null;

  private getSessionResumeLifecycleStore(): Map<
    string,
    SessionResumeLifecycleState
  > {
    const host = this as unknown as SessionResumeLifecycleStoreHost;
    if (host.sessionResumeLifecycleStates) {
      return host.sessionResumeLifecycleStates;
    }
    host.sessionResumeLifecycleStates = new Map<
      string,
      SessionResumeLifecycleState
    >();
    return host.sessionResumeLifecycleStates;
  }

  private resolveInitialResumeMode(options: {
    readonly stage: string | null;
    readonly runSlug: string | null;
    readonly explicitMode?: SessionResumeMode | null;
  }): SessionResumeMode {
    if (options.explicitMode) {
      return options.explicitMode;
    }
    if (options.stage === "description" && options.runSlug !== "reviewer") {
      return "no_resume";
    }
    return "resume_in_place";
  }

  private getSessionResumeLifecycleState(
    session: Session
  ): SessionResumeLifecycleState {
    const existing = this.getSessionResumeLifecycleStore().get(session.id);
    if (existing) {
      return existing;
    }
    return {
      mode: this.resolveInitialResumeMode({
        stage: session.stage,
        runSlug: session.runSlug,
      }),
      finalTurnCompleted: false,
      terminalLockReason: null,
    };
  }

  private broadcastSessionResumeLifecycleState(
    session: Session,
    state: SessionResumeLifecycleState
  ): void {
    const sessionKey = {
      workspaceRoot: session.workspacePath,
      nodeId: session.stage ?? "session",
      sessionId: session.id,
    };
    this.workspaceRuntime?.notifySessionCreated(sessionKey, {
      resumeMode: state.mode,
      terminalLockReason: state.terminalLockReason ?? undefined,
    });
    this.workspaceRuntime?.notifyFinalTurnCompleted(
      sessionKey,
      state.finalTurnCompleted
    );
  }

  private updateSessionResumeLifecycleState(
    session: Session,
    patch: Partial<SessionResumeLifecycleState>
  ): SessionResumeLifecycleState {
    const current = this.getSessionResumeLifecycleState(session);
    const next: SessionResumeLifecycleState = {
      mode: patch.mode ?? current.mode,
      finalTurnCompleted:
        patch.finalTurnCompleted ?? current.finalTurnCompleted,
      terminalLockReason:
        patch.terminalLockReason === undefined
          ? current.terminalLockReason
          : patch.terminalLockReason,
    };
    if (
      next.mode === current.mode &&
      next.finalTurnCompleted === current.finalTurnCompleted &&
      next.terminalLockReason === current.terminalLockReason
    ) {
      return current;
    }
    this.getSessionResumeLifecycleStore().set(session.id, next);
    this.broadcastSessionResumeLifecycleState(session, next);
    return next;
  }

  private elevateSessionToRolloverResumeMode(session: Session): void {
    this.updateSessionResumeLifecycleState(session, {
      mode: "resume_via_rollover",
      finalTurnCompleted: false,
      terminalLockReason: null,
    });
  }

  private handleNoResumeTurnCompleted(session: Session): void {
    const state = this.getSessionResumeLifecycleState(session);
    if (
      state.finalTurnCompleted &&
      state.terminalLockReason === "terminal_no_resume"
    ) {
      return;
    }
    const rolloverId = crypto.randomUUID();
    const stageId = session.stage ?? "session";
    const runSlug = session.runSlug ?? null;
    this.updateSessionResumeLifecycleState(session, {
      mode: "no_resume",
      finalTurnCompleted: true,
      terminalLockReason: "terminal_no_resume",
    });
    this.emitContinuityLockEvent({
      sessionId: session.id,
      rolloverId,
      sourceSessionId: session.id,
      stageId,
      runSlug,
      state: "locked",
      reason: "terminal_no_resume",
    });
  }

  private markPostTurnContextDecisionPending(sessionId: string): void {
    this.postTurnContextDecisionBySessionId.delete(sessionId);
    this.postTurnContextDecisionPendingSessions.add(sessionId);
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    const lifecycleState = this.getSessionResumeLifecycleState(session);
    if (lifecycleState.mode === "no_resume") {
      return;
    }
    if (this.isFlowNodeRolloverPending(sessionId)) {
      return;
    }
    this.emitContinuityLockEvent({
      sessionId: session.id,
      rolloverId: crypto.randomUUID(),
      sourceSessionId: session.id,
      stageId: session.stage ?? "session",
      runSlug: session.runSlug ?? null,
      state: "locked",
      reason: "context_check_pending",
    });
  }

  private clearPostTurnContextDecision(sessionId: string): void {
    this.postTurnContextDecisionPendingSessions.delete(sessionId);
    this.postTurnContextDecisionBySessionId.delete(sessionId);
  }

  private recordPostTurnContextDecision(
    sessionId: string,
    decision: PostTurnContextDecision
  ): void {
    this.postTurnContextDecisionBySessionId.set(sessionId, decision);
  }

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

  private resolveRecordedPostTurnContextDecision(
    session: Session
  ): PostTurnContextDecision | null {
    const immediateDecision =
      this.resolveImmediatePostTurnContextDecision(session);
    if (immediateDecision) {
      this.recordPostTurnContextDecision(session.id, immediateDecision);
      return immediateDecision;
    }
    return this.postTurnContextDecisionBySessionId.get(session.id) ?? null;
  }

  private finalizePendingTurnCompletion(sessionId: string): void {
    if (!this.postTurnContextDecisionPendingSessions.has(sessionId)) {
      return;
    }
    this.runTurnCompletedArbitration(sessionId);
  }

  private registerPostTurnNoRolloverDecision(sessionId: string): void {
    this.recordPostTurnContextDecision(sessionId, "no_rollover");
    this.finalizePendingTurnCompletion(sessionId);
  }

  private registerPostTurnRolloverRequiredDecision(sessionId: string): void {
    this.recordPostTurnContextDecision(sessionId, "rollover_required");
    this.finalizePendingTurnCompletion(sessionId);
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
    readonly reason: "ack_timeout" | "report_timeout" | "unknown";
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

  private waitForFlowNodeContinuityCreateReportAck(options: {
    readonly sessionId: string;
    readonly requestId: string;
    readonly timeoutMs: number;
  }): Promise<boolean> {
    const existing = this.flowNodeContinuityCreateReportAckWaiters.get(
      options.sessionId
    );
    if (existing) {
      clearTimeout(existing.timeoutId);
      existing.resolve(false);
      this.flowNodeContinuityCreateReportAckWaiters.delete(options.sessionId);
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(
        () => {
          this.flowNodeContinuityCreateReportAckWaiters.delete(
            options.sessionId
          );
          resolve(false);
        },
        Math.max(250, Math.floor(options.timeoutMs))
      );

      this.flowNodeContinuityCreateReportAckWaiters.set(options.sessionId, {
        requestId: options.requestId,
        timeoutId,
        resolve,
      });
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
    const ackTimeoutMs = 15_000;
    const startAttempt = Math.max(1, Math.floor(options.startAttempt ?? 1));
    const maxAttempts = Math.max(
      startAttempt,
      Math.floor(options.maxAttempts ?? 2)
    );

    for (let attempt = startAttempt; attempt <= maxAttempts; attempt += 1) {
      this.patchFlowNodeContinuityCreateReportRequest({
        sessionId: options.sessionId,
        requestId: options.requestId,
        patch: { attempt, stage: "waiting_for_ack" },
      });

      const ackPromise = this.waitForFlowNodeContinuityCreateReportAck({
        sessionId: options.sessionId,
        requestId: options.requestId,
        timeoutMs: ackTimeoutMs,
      });

      await this.sendInternalMessage(options.sessionId, options.prompt);

      if (!options.silent) {
        this.emitFlowNodeRolloverNotification(options.sessionId, {
          ...options.notificationBase,
          phase: "waiting_for_report_ack",
          continuityRequestId: options.requestId,
          continuityAttempt: attempt,
          reportPath: options.reportPath,
          tmpReportPath: options.tmpReportPath,
        });
      }

      const didAck = await ackPromise;
      if (!didAck) {
        continue;
      }

      this.patchFlowNodeContinuityCreateReportRequest({
        sessionId: options.sessionId,
        requestId: options.requestId,
        patch: { attempt, stage: "waiting_for_report" },
      });

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

    throw new Error(
      `Timed out waiting for continuity create-report ack (requestId=${options.requestId})`
    );
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
    try {
      await this.flowNodeContinuity.waitForReport({
        reportPath: options.reportPath,
        timeoutMs: 60_000,
        pollIntervalMs: 250,
      });
      return options.attempt;
    } catch (error) {
      if (options.attempt >= 2 || !this.isContinuityReportTimeoutError(error)) {
        throw error;
      }

      const retryAttempt =
        await this.dispatchFlowNodeContinuityCreateReportWithAck({
          sessionId: options.sessionId,
          requestId: options.requestId,
          prompt: options.prompt,
          notificationBase: options.notificationBase,
          reportPath: options.reportPath,
          tmpReportPath: options.tmpReportPath,
          silent: options.silent,
          startAttempt: options.attempt + 1,
          maxAttempts: 2,
        });

      await this.flowNodeContinuity.waitForReport({
        reportPath: options.reportPath,
        timeoutMs: 60_000,
        pollIntervalMs: 250,
      });

      return retryAttempt;
    }
  }

  private ackFlowNodeContinuityCreateReportIfPending(sessionId: string): void {
    const waiter = this.flowNodeContinuityCreateReportAckWaiters.get(sessionId);
    if (!waiter) {
      return;
    }

    const request = this.flowNodeContinuityCreateReportRequests.get(sessionId);
    if (!(request && request.stage === "waiting_for_ack")) {
      return;
    }
    if (request.requestId !== waiter.requestId) {
      return;
    }

    clearTimeout(waiter.timeoutId);
    this.flowNodeContinuityCreateReportAckWaiters.delete(sessionId);
    waiter.resolve(true);
  }

  private emitContinuityLockEvent(options: {
    readonly sessionId: string;
    readonly rolloverId: string;
    readonly sourceSessionId: string;
    readonly targetSessionId?: string;
    readonly stageId: string;
    readonly runSlug: string | null;
    readonly state: ContinuityLockState;
    readonly reason: ContinuityLockReason;
  }): void {
    const session = this.sessionManager.getSession(options.sessionId);
    const providerId = session?.providerId ?? null;
    const lifecycleState = session
      ? this.getSessionResumeLifecycleState(session)
      : null;
    const timestamp = new Date().toISOString();
    const lockTransition: SessionContinuityLockTransition | null =
      options.state === "locked"
        ? {
            rolloverId: options.rolloverId,
            sourceSessionId: options.sourceSessionId,
            ...(options.targetSessionId
              ? { targetSessionId: options.targetSessionId }
              : {}),
            stageId: options.stageId,
            runSlug: options.runSlug,
            reason: options.reason,
            rolloverPending:
              options.state === "locked" &&
              (options.reason === "threshold_reached" ||
                options.reason === "report_in_progress" ||
                options.reason === "resume_bootstrap"),
            awaitingBootstrapTurn: options.reason === "resume_bootstrap",
            resumeMode: lifecycleState?.mode,
            finalTurnCompleted: lifecycleState?.finalTurnCompleted,
            terminalLockReason: lifecycleState?.terminalLockReason ?? undefined,
            updatedAt: timestamp,
          }
        : null;
    if (session) {
      this.workspaceRuntime?.notifyLockChanged(
        {
          workspaceRoot: session.workspacePath,
          nodeId: session.stage ?? "session",
          sessionId: session.id,
        },
        {
          active: options.state === "locked",
          reason: options.reason,
          transition: lockTransition,
        }
      );
    }
    const payload = {
      kind: "continuity_lock",
      state: options.state,
      rolloverId: options.rolloverId,
      sourceSessionId: options.sourceSessionId,
      ...(options.targetSessionId
        ? { targetSessionId: options.targetSessionId }
        : {}),
      stageId: options.stageId,
      runSlug: options.runSlug,
      reason: options.reason,
      timestamp,
    } satisfies ContinuityLockPayload;

    this.broadcaster({
      type: "session:stream",
      payload: {
        sessionId: options.sessionId,
        event: {
          type: "stream_event",
          provider: providerId ?? "core",
          sessionId: options.sessionId,
          data: payload,
          uuid: `${crypto.randomUUID()}::continuity_lock`,
          timestamp,
        },
      },
    });
  }

  private registerFlowNodeContinuityLockContext(
    context: FlowNodeContinuityLockContext
  ): FlowNodeContinuityLockContext {
    const previous = this.flowNodeContinuityLockContexts.get(
      context.sourceSessionId
    );
    if (
      previous?.targetSessionId &&
      previous.targetSessionId !== context.targetSessionId
    ) {
      this.flowNodeContinuityLockContexts.delete(previous.targetSessionId);
    }
    this.flowNodeContinuityLockContexts.set(context.sourceSessionId, context);
    if (context.targetSessionId) {
      this.flowNodeContinuityLockContexts.set(context.targetSessionId, context);
    }
    return context;
  }

  private clearFlowNodeContinuityLockTimeout(rolloverId: string): void {
    const timeout = this.flowNodeContinuityLockTimeouts.get(rolloverId);
    if (!timeout) {
      return;
    }
    clearTimeout(timeout);
    this.flowNodeContinuityLockTimeouts.delete(rolloverId);
  }

  private scheduleFlowNodeContinuityLockTimeout(
    context: FlowNodeContinuityLockContext
  ): void {
    const targetSessionId = context.targetSessionId;
    if (!(targetSessionId && context.awaitingBootstrapTurn)) {
      return;
    }
    this.clearFlowNodeContinuityLockTimeout(context.rolloverId);
    const timeout = setTimeout(() => {
      this.logger.warn("Flow node continuity lock timeout reached", {
        rolloverId: context.rolloverId,
        sourceSessionId: context.sourceSessionId,
        targetSessionId,
        stageId: context.stageId,
        runSlug: context.runSlug,
        timeoutMs: FLOW_NODE_CONTINUITY_RESUME_TIMEOUT_MS,
      });
      this.finalizeFlowNodeContinuityLock({
        sessionId: targetSessionId,
        reason: "resume_timeout",
      });
    }, FLOW_NODE_CONTINUITY_RESUME_TIMEOUT_MS);
    this.flowNodeContinuityLockTimeouts.set(context.rolloverId, timeout);
  }

  private finalizeFlowNodeContinuityLock(options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed" | "resume_timeout"
    >;
  }): void {
    const context = this.flowNodeContinuityLockContexts.get(options.sessionId);
    if (!context) {
      return;
    }
    const targetSessionId = context.targetSessionId ?? context.sourceSessionId;
    const payloadBase = {
      rolloverId: context.rolloverId,
      sourceSessionId: context.sourceSessionId,
      ...(context.targetSessionId
        ? { targetSessionId: context.targetSessionId }
        : {}),
      stageId: context.stageId,
      runSlug: context.runSlug,
      reason: options.reason,
    };
    // Resume bootstrap should never leave the UI hard-locked permanently.
    // `resume_failed` / `resume_timeout` must unblock the UI and clear rollover
    // pending flags so the user can retry or continue manually.
    const state: ContinuityLockState = "unlocked";
    this.emitContinuityLockEvent({
      sessionId: targetSessionId,
      state,
      ...payloadBase,
    });
    if (context.sourceSessionId !== targetSessionId) {
      this.emitContinuityLockEvent({
        sessionId: context.sourceSessionId,
        state,
        ...payloadBase,
      });
    }
    this.clearFlowNodeContinuityLockTimeout(context.rolloverId);
    this.flowNodeContinuityLockContexts.delete(context.sourceSessionId);
    if (context.targetSessionId) {
      this.flowNodeContinuityLockContexts.delete(context.targetSessionId);
    }
    this.finalizePostBootstrapRolloverLifecycle(context, {
      updateResumeMode: options.reason === "resume_ready",
    });
  }

  private finalizePostBootstrapRolloverLifecycle(
    context: FlowNodeContinuityLockContext,
    options?: { readonly updateResumeMode?: boolean }
  ): void {
    const sessionIds = [
      context.sourceSessionId,
      context.targetSessionId,
    ].filter(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.length > 0
    );
    for (const sessionId of sessionIds) {
      this.flowNodeRolloverStarted.delete(sessionId);
      this.flowNodeRolloverInFlight.delete(sessionId);
      this.clearPostTurnContextDecision(sessionId);
    }
    if (!context.targetSessionId) {
      return;
    }
    if (!options?.updateResumeMode) {
      return;
    }
    const targetSession = this.sessionManager.getSession(
      context.targetSessionId
    );
    if (!targetSession) {
      return;
    }
    const lifecycleState = this.getSessionResumeLifecycleState(targetSession);
    if (lifecycleState.mode === "no_resume") {
      return;
    }
    this.updateSessionResumeLifecycleState(targetSession, {
      mode: "resume_in_place",
      finalTurnCompleted: false,
      terminalLockReason: null,
    });
  }

  private finalizeFlowNodeContinuityLockOnBootstrapGate(options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed" | "resume_timeout"
    >;
  }): void {
    const context = this.flowNodeContinuityLockContexts.get(options.sessionId);
    if (
      !(
        context &&
        context.targetSessionId === options.sessionId &&
        context.awaitingBootstrapTurn
      )
    ) {
      return;
    }
    this.finalizeFlowNodeContinuityLock({
      sessionId: options.sessionId,
      reason: options.reason,
    });
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

  private async resolveProviderSessionId(options: {
    readonly adapter: ProviderAdapter;
    readonly providerId: string;
    readonly workspacePath: string;
    readonly requestedProviderSessionId: string | null;
  }): Promise<ProviderSessionResolution> {
    const { adapter, providerId, workspacePath, requestedProviderSessionId } =
      options;
    const shouldResume =
      typeof requestedProviderSessionId === "string" &&
      requestedProviderSessionId.trim().length > 0;

    if (shouldResume) {
      if (!adapter.resumeSession) {
        return {
          error: `Provider ${providerId} does not support resume`,
        };
      }

      const trimmedSessionId = requestedProviderSessionId.trim();
      try {
        const providerSessionId = await adapter.resumeSession(
          trimmedSessionId,
          workspacePath
        );
        return {
          providerSessionId,
          didResume: true,
          supportsImmediateBinding: true,
        };
      } catch (error) {
        return {
          error: `Failed to resume ${providerId} session ${trimmedSessionId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    }

    try {
      const providerSessionId = await adapter.createSession(workspacePath);
      return {
        providerSessionId,
        didResume: false,
        supportsImmediateBinding:
          providerId === "geminiCli" && providerSessionId.length > 0,
      };
    } catch (error) {
      return {
        error: `Failed to create ${providerId} session: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  private async createAndRegisterSession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly adapter: ProviderAdapter;
    readonly resumeMode?: SessionResumeMode;
    readonly context: {
      readonly initiativeSlug: string | null;
      readonly stage: string | null;
      readonly runSlug: string | null;
      readonly providerSessionId: string | null;
    };
    readonly rootSessionId?: string | null;
    readonly continuationParentId?: string | null;
  }): Promise<Session | null> {
    const providerSessionResolution = await this.resolveProviderSessionId({
      adapter: options.adapter,
      providerId: options.providerId,
      workspacePath: options.workspacePath,
      requestedProviderSessionId: options.context.providerSessionId,
    });
    if ("error" in providerSessionResolution) {
      this.broadcaster({
        type: "session:error",
        payload: { message: providerSessionResolution.error },
      });
      return null;
    }

    const { providerSessionId, supportsImmediateBinding } =
      providerSessionResolution;

    const session = this.sessionManager.createSession(
      options.providerId,
      options.workspacePath,
      supportsImmediateBinding ? providerSessionId : undefined,
      {
        initiativeSlug: options.context.initiativeSlug,
        stage: options.context.stage,
        runSlug: options.context.runSlug ?? null,
        continuationParentId: options.continuationParentId ?? null,
      }
    );
    const continuityRootSessionId = options.rootSessionId ?? session.id;
    this.continuityRootBySessionId.set(session.id, continuityRootSessionId);
    if (!supportsImmediateBinding) {
      this.sessionManager.seedProviderSessionId(session.id, providerSessionId);
    }

    const descriptionDialog =
      session.stage === "description" && session.initiativeSlug
        ? await this.resolveDescriptionDialogSessionId({
            session,
            providerSessionId,
          })
        : null;

    this.maybePromoteLegacyDescriptionDialogHistory({
      session,
      dialogSessionId: descriptionDialog?.dialogSessionId ?? null,
    });

    await this.maybeBackfillDescriptionDialogHistory({
      session,
      providerSessionId,
      dialog: descriptionDialog,
    });

    // Keep a single UI transcript across continuity rollovers by pinning the
    // unified-session history id to the continuity root.
    this.sessionStorage.register(session, {
      historySessionId: continuityRootSessionId,
    });
    await this.updateDescriptionSessionRef(session, providerSessionId);

    const unsubscribe = options.adapter.subscribe(
      providerSessionId,
      (event: unknown) => {
        this.handleProviderEvent(session.id, event);
      }
    );

    this.providerSessions.set(session.id, {
      providerId: options.providerId,
      providerSessionId,
      unsubscribe,
    });

    if (supportsImmediateBinding) {
      this.updateProviderBinding(session.id, providerSessionId);
    }

    this.continuity.registerSession({
      session,
      providerSessionId,
      rootSessionId: continuityRootSessionId,
    });
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
    const initialLifecycleState: SessionResumeLifecycleState = {
      mode: this.resolveInitialResumeMode({
        stage: session.stage,
        runSlug: session.runSlug,
        explicitMode: options.resumeMode ?? null,
      }),
      finalTurnCompleted: false,
      terminalLockReason: null,
    };
    this.getSessionResumeLifecycleStore().set(
      session.id,
      initialLifecycleState
    );
    this.broadcastSessionResumeLifecycleState(session, initialLifecycleState);

    this.broadcaster({
      type: "session:created",
      payload: serializeSession(session),
    });
    this.broadcastSessionBinding(session.id);

    return session;
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
    if (this.postTurnContextDecisionPendingSessions.has(sessionId)) {
      return {
        allowed: false,
        code: CONTINUITY_ROLLOVER_PENDING_ERROR_CODE,
        message: "Session continuity context decision is pending. Please wait.",
        sourceSessionId: sessionId,
        targetSessionId: null,
      };
    }
    const context = this.flowNodeContinuityLockContexts.get(sessionId);
    if (!(context && context.sourceSessionId === sessionId)) {
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
      this.flowNodeRolloverStarted?.has(sessionId) === true ||
      this.flowNodeRolloverInFlight?.has(sessionId) === true ||
      this.flowNodeContinuityLockContexts?.has(sessionId) === true
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

  private inferRunSlugFromDialogId(dialogId: string): string | null {
    const trimmed = dialogId.trim().toLowerCase();
    if (trimmed.endsWith("__reviewer") || trimmed.endsWith("-reviewer")) {
      return "reviewer";
    }
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
    const lifecycleState = this.getSessionResumeLifecycleState(session);
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
      this.updateSessionResumeLifecycleState(session, {
        finalTurnCompleted: false,
        terminalLockReason: null,
      });
    }
    this.clearPostTurnContextDecision(sessionId);

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
      return;
    }

    this.sessionStorage.appendMessage(sessionId, userMessage);
    this.broadcaster({ type: "session:message", payload: userMessage });

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
        : turnOptions;
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
    this.getSessionResumeLifecycleStore().delete(sessionId);
    this.clearPostTurnContextDecision(sessionId);
    this.workspaceRuntime?.notifySessionDeleted({
      workspaceRoot: session.workspacePath,
      nodeId: session.stage ?? "session",
      sessionId: session.id,
    });
    this.broadcaster({ type: "session:deleted", payload: { sessionId } });
  }

  private handleProviderEvent(sessionId: string, event: unknown): void {
    this.continuity.handleProviderEvent(sessionId, event).catch((error) => {
      this.logger.warn("Session continuity handler failed", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    if (typeof event === "string") {
      this.handleFlowNodeContinuityProviderEvent(sessionId, event).catch(
        (error) => {
          this.logFlowNodeContinuityHandlerFailed(sessionId, error);
        }
      );
      this.updateBindingWithResolvedId(sessionId, event);
      return;
    }
    if (!event || typeof event !== "object") {
      this.handleFlowNodeContinuityProviderEvent(sessionId, event).catch(
        (error) => {
          this.logFlowNodeContinuityHandlerFailed(sessionId, error);
        }
      );
      return;
    }
    const typedEvent = event as ProviderEventEnvelope;
    if (typedEvent.type === "turn_completed") {
      this.markPostTurnContextDecisionPending(sessionId);
    }
    const flowNodeContinuityTask = this.handleFlowNodeContinuityProviderEvent(
      sessionId,
      event
    );
    if (typedEvent.type === "turn_completed") {
      this.broadcaster({
        type: "session:stream",
        payload: { sessionId, event: typedEvent },
      });
      this.handleTurnCompletedWithFlowNodeArbitration(
        sessionId,
        flowNodeContinuityTask
      );
      return;
    }
    flowNodeContinuityTask.catch((error) => {
      this.logFlowNodeContinuityHandlerFailed(sessionId, error);
    });
    this.handleTypedProviderEvent(sessionId, typedEvent);
  }

  private logFlowNodeContinuityHandlerFailed(
    sessionId: string,
    error: unknown
  ): void {
    this.logger.warn("Flow node continuity handler failed", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private handleTurnCompletedWithFlowNodeArbitration(
    sessionId: string,
    flowNodeContinuityTask: Promise<void>
  ): void {
    flowNodeContinuityTask
      .catch((error) => {
        this.logFlowNodeContinuityHandlerFailed(sessionId, error);
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
      this.clearPostTurnContextDecision(sessionId);
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

    if (
      this.flowNodeRolloverStarted.has(sessionId) ||
      this.flowNodeRolloverInFlight.has(sessionId)
    ) {
      this.registerPostTurnRolloverRequiredDecision(sessionId);
      return;
    }

    const usage = extractTokenUsage(event);
    if (!usage) {
      return;
    }
    this.flowNodeTokenUsageSnapshots.set(sessionId, usage);

    if (!(session.initiativeSlug && session.stage)) {
      this.registerPostTurnNoRolloverDecision(sessionId);
      return;
    }

    const eligibleForRollover = this.flowNodeContinuity.isEligibleForRollover({
      stageId: session.stage,
      runSlug: session.runSlug,
    });
    if (!eligibleForRollover) {
      this.registerPostTurnNoRolloverDecision(sessionId);
      return;
    }

    const remainingPercentThreshold =
      await this.resolveLiveContinuityRemainingPercentThreshold(session);
    if (!isBelowRemainingPercentThreshold(usage, remainingPercentThreshold)) {
      this.registerPostTurnNoRolloverDecision(sessionId);
      return;
    }

    if (this.flowNodeRolloverInFlight.has(sessionId)) {
      this.registerPostTurnRolloverRequiredDecision(sessionId);
      return;
    }

    await this.startFlowNodeRolloverFromUsage({
      session,
      sessionId,
      stageId: session.stage,
      runSlug: session.runSlug ?? null,
      usage,
      remainingPercentThreshold,
    });
  }

  private async startFlowNodeRolloverFromUsage(options: {
    readonly session: Session;
    readonly sessionId: string;
    readonly stageId: string;
    readonly runSlug: string | null;
    readonly usage: TokenUsageSnapshot;
    readonly remainingPercentThreshold: number;
  }): Promise<void> {
    this.flowNodeRolloverInFlight.add(options.sessionId);
    this.flowNodeRolloverStarted.add(options.sessionId);
    this.registerPostTurnRolloverRequiredDecision(options.sessionId);
    this.elevateSessionToRolloverResumeMode(options.session);
    const remainingPercent = computeRemainingPercent(options.usage);
    const continuityLockContext = this.registerFlowNodeContinuityLockContext({
      rolloverId: crypto.randomUUID(),
      sourceSessionId: options.sessionId,
      stageId: options.stageId,
      runSlug: options.runSlug,
      awaitingBootstrapTurn: false,
    });
    this.emitContinuityLockEvent({
      sessionId: options.sessionId,
      rolloverId: continuityLockContext.rolloverId,
      sourceSessionId: continuityLockContext.sourceSessionId,
      stageId: continuityLockContext.stageId,
      runSlug: continuityLockContext.runSlug,
      state: "locked",
      reason: "threshold_reached",
    });
    this.emitFlowNodeRolloverNotification(options.sessionId, {
      kind: "flow_node_rollover",
      phase: "start",
      sourceSessionId: options.sessionId,
      providerId: options.session.providerId,
      stageId: options.stageId,
      runSlug: options.runSlug,
      remainingPercent,
      thresholdPercent: options.remainingPercentThreshold,
    });
    try {
      await this.rolloverFlowNodeSession(
        options.session,
        {
          remainingPercent,
          thresholdPercent: options.remainingPercentThreshold,
          rolloverId: continuityLockContext.rolloverId,
        },
        { silent: false }
      );
    } catch (error) {
      const request =
        this.flowNodeContinuityCreateReportRequests.get(options.sessionId) ??
        null;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const reason: "ack_timeout" | "report_timeout" | "unknown" = (() => {
        if (
          typeof errorMessage === "string" &&
          errorMessage.startsWith(
            "Timed out waiting for continuity create-report ack"
          )
        ) {
          return "ack_timeout";
        }
        if (this.isContinuityReportTimeoutError(error)) {
          return "report_timeout";
        }
        return "unknown";
      })();

      this.finalizeFlowNodeContinuityLock({
        sessionId: options.sessionId,
        reason: "resume_failed",
      });
      // Allow the user to keep working even when rollover fails.
      this.updateSessionResumeLifecycleState(options.session, {
        mode: "resume_in_place",
        finalTurnCompleted: false,
        terminalLockReason: null,
      });
      this.emitTurnStateEvent({ sessionId: options.sessionId, state: "idle" });
      if (request) {
        this.emitContinuityFailedEvent({
          sessionId: options.sessionId,
          providerId: options.session.providerId ?? null,
          providerSessionId: options.session.providerSessionId ?? null,
          request,
          reason,
          errorMessage,
        });
      }
      this.flowNodeContinuityCreateReportRequests.delete(options.sessionId);
      const ackWaiter = this.flowNodeContinuityCreateReportAckWaiters.get(
        options.sessionId
      );
      if (ackWaiter) {
        clearTimeout(ackWaiter.timeoutId);
        ackWaiter.resolve(false);
        this.flowNodeContinuityCreateReportAckWaiters.delete(options.sessionId);
      }
      this.flowNodeRolloverStarted.delete(options.sessionId);
      this.emitFlowNodeRolloverNotification(options.sessionId, {
        kind: "flow_node_rollover",
        phase: "failed",
        sourceSessionId: options.sessionId,
        providerId: options.session.providerId,
        stageId: options.stageId,
        runSlug: options.runSlug,
        remainingPercent,
        thresholdPercent: options.remainingPercentThreshold,
        error: errorMessage,
      });
      this.logger.warn("Flow node rollover failed", {
        sessionId: options.sessionId,
        providerId: options.session.providerId,
        providerSessionId: options.session.providerSessionId ?? null,
        stageId: options.stageId,
        runSlug: options.runSlug,
        reason,
        error: errorMessage,
      });
      return;
    } finally {
      this.flowNodeRolloverInFlight.delete(options.sessionId);
    }
  }

  private emitResumeInPlaceNoRolloverUnlock(session: Session): void {
    this.emitContinuityLockEvent({
      sessionId: session.id,
      rolloverId: crypto.randomUUID(),
      sourceSessionId: session.id,
      stageId: session.stage ?? "session",
      runSlug: session.runSlug ?? null,
      state: "unlocked",
      reason: "no_rollover_needed",
    });
  }

  private handleTurnCompletedEvent(sessionId: string): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      this.clearPostTurnContextDecision(sessionId);
      return;
    }
    const resumeMode = this.getSessionResumeLifecycleState(session).mode;
    if (resumeMode === "no_resume") {
      this.clearPostTurnContextDecision(sessionId);
      this.emitTurnStateEvent({ sessionId, state: "idle" });
      this.handleNoResumeTurnCompleted(session);
      return;
    }

    this.updateSessionResumeLifecycleState(session, {
      finalTurnCompleted: true,
      terminalLockReason: null,
    });

    const contextDecision =
      this.resolveRecordedPostTurnContextDecision(session);
    if (!contextDecision) {
      return;
    }

    this.clearPostTurnContextDecision(sessionId);
    if (
      contextDecision === "rollover_required" ||
      this.isFlowNodeRolloverPending(sessionId)
    ) {
      return;
    }

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

  private resolveDescriptionReviewerFinalArtifactPath(
    session: Session
  ): string {
    const relativePath = path.join(
      ".codeai-hub",
      session.initiativeSlug ?? "default-workspace",
      "description",
      "Final_Description.md"
    );
    return path.resolve(session.workspacePath, relativePath);
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

  private resolveFlowNodeContinuityTemplate(options: {
    readonly session: Session;
    readonly stageId: string;
  }): {
    readonly templateId:
      | "flow/continuity/create-report-doc.md"
      | "flow/continuity/create-report-code.md";
    readonly canonicalArtifactPath: string;
    readonly isReviewerBootstrapEligible: boolean;
  } {
    const isReviewerBootstrapEligible =
      options.stageId === "description" &&
      options.session.runSlug === "reviewer";

    if (isReviewerBootstrapEligible) {
      return {
        templateId: "flow/continuity/create-report-doc.md",
        canonicalArtifactPath: this.resolveDescriptionReviewerFinalArtifactPath(
          options.session
        ),
        isReviewerBootstrapEligible,
      };
    }

    return {
      templateId: "flow/continuity/create-report-code.md",
      canonicalArtifactPath: "",
      isReviewerBootstrapEligible,
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
      stage: "waiting_for_ack",
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
      this.resolveFlowNodeContinuityTemplate({ session, stageId });

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
    this.scheduleFlowNodeContinuityLockTimeout(targetLockContext);

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

  private handleTypedProviderEvent(
    sessionId: string,
    event: ProviderEventEnvelope
  ): void {
    if (event.type !== "sessionIdChanged" && event.type !== "realSessionId") {
      this.ackFlowNodeContinuityCreateReportIfPending(sessionId);
    }
    switch (event.type) {
      case "sessionIdChanged":
        this.handleSessionIdChangedEvent(sessionId, event.payload);
        break;
      case "realSessionId":
        this.handleRealSessionIdEvent(sessionId, event.payload);
        break;
      case "turn_started":
        this.emitTurnStateEvent({ sessionId, state: "running" });
        break;
      case "turn_completed":
        this.markPostTurnContextDecisionPending(sessionId);
        this.runTurnCompletedArbitration(sessionId);
        break;
      case "turn_failed":
        this.clearPostTurnContextDecision(sessionId);
        this.emitTurnStateEvent({ sessionId, state: "idle" });
        this.finalizeFlowNodeContinuityLockOnBootstrapGate({
          sessionId,
          reason: "resume_failed",
        });
        this.broadcastProviderError(sessionId, event);
        break;
      case "stream_error":
      case "error":
        this.finalizeFlowNodeContinuityLockOnBootstrapGate({
          sessionId,
          reason: "resume_failed",
        });
        this.broadcastProviderError(sessionId, event);
        break;
      case "stream_event":
        {
          const session = this.sessionManager.getSession(sessionId);
          if (session) {
            this.workspaceRuntime?.recordHeartbeat({
              workspaceRoot: session.workspacePath,
              nodeId: session.stage ?? "session",
              sessionId: session.id,
            });
          }
        }
        this.broadcaster({
          type: "session:stream",
          payload: { sessionId, event },
        });
        break;
      case "assistant":
        this.finalizeFlowNodeContinuityLockOnBootstrapGate({
          sessionId,
          reason: "resume_ready",
        });
        this.appendProviderMessage(sessionId, "assistant", event);
        break;
      case "thinking":
        this.appendProviderMessage(sessionId, "thinking", event);
        break;
      case "dialog_message":
        this.appendDialogMessage(sessionId, event as DialogMessagePayload);
        break;
      default:
        break;
    }
  }

  private broadcastProviderError(
    sessionId: string,
    event: ProviderEventEnvelope
  ): void {
    const typed = event as ProviderErrorEnvelope;
    const providerId =
      typeof typed.provider === "string" && typed.provider.trim().length > 0
        ? typed.provider.trim()
        : null;

    const message = this.extractProviderErrorMessage(typed);
    this.broadcaster({
      type: "session:error",
      payload: {
        sessionId,
        providerId,
        message,
      },
    });
  }

  private extractProviderErrorMessage(event: ProviderErrorEnvelope): string {
    if (typeof event.message === "string" && event.message.trim().length > 0) {
      return event.message.trim();
    }
    if (typeof event.error === "string" && event.error.trim().length > 0) {
      return event.error.trim();
    }
    if (event.error && typeof event.error === "object") {
      const candidate = event.error as { readonly message?: unknown };
      if (
        typeof candidate.message === "string" &&
        candidate.message.trim().length > 0
      ) {
        return candidate.message.trim();
      }
      return JSON.stringify(event.error);
    }
    if (event.payload && typeof event.payload === "object") {
      const candidate = event.payload as { readonly message?: unknown };
      if (
        typeof candidate.message === "string" &&
        candidate.message.trim().length > 0
      ) {
        return candidate.message.trim();
      }
      return JSON.stringify(event.payload);
    }
    return "Provider error.";
  }

  private handleProviderFailure(
    providerId: string,
    error: unknown,
    sessionId?: string
  ): void {
    this.logger.error(
      "Provider operation failed",
      error instanceof Error ? error : new Error(String(error)),
      { providerId }
    );
    this.providerRegistry.handleRuntimeFailure(providerId, error);

    if (sessionId) {
      const binding = this.providerSessions.get(sessionId);
      if (binding) {
        binding.unsubscribe();
        this.providerSessions.delete(sessionId);
      }
      this.sessionManager.markProviderSessionFailed(sessionId);
      this.sessionStorage.close(sessionId, "provider-failure");
      this.broadcastSessionBinding(sessionId);
    }

    this.broadcaster({
      type: "session:error",
      payload: {
        sessionId: sessionId ?? null,
        providerId,
        message:
          error instanceof Error ? error.message : "Provider unavailable",
      },
    });

    if (!sessionId) {
      this.stateBroadcaster();
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
    const message = this.sessionManager.appendMessage(sessionId, role, content);
    if (message) {
      this.sessionStorage.appendMessage(sessionId, message);
      this.broadcaster({ type: "session:message", payload: message });
      this.broadcastDialogMessage(sessionId, message);
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
    const message = this.sessionManager.appendMessage(
      sessionId,
      role,
      payload.content,
      payload.timestamp
    );
    if (message) {
      this.sessionStorage.appendMessage(sessionId, message);
      this.broadcaster({ type: "session:message", payload: message });
      this.broadcastDialogMessage(sessionId, message);
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
    if (!providerSessionId) {
      return;
    }
    const binding = this.providerSessions.get(sessionId);
    if (binding) {
      binding.providerSessionId = providerSessionId;
    }
  }

  private updateBindingWithResolvedId(
    sessionId: string,
    providerSessionId: string
  ): void {
    const session = this.sessionManager.getSession(sessionId);
    if (
      !session ||
      (session.providerSessionStatus === "ready" &&
        session.providerSessionId === providerSessionId)
    ) {
      return;
    }
    this.sessionManager.updateProviderSessionId(sessionId, providerSessionId);
    this.sessionStorage.promote(sessionId, providerSessionId);
    this.updateProviderBinding(sessionId, providerSessionId);
    this.continuity.updateProviderSessionId(sessionId, providerSessionId);
    this.updateDescriptionSessionRef(session, providerSessionId).catch(
      (error: unknown) => {
        this.logger.warn("Failed to persist updated description session ref", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    );

    this.broadcastSessionBinding(sessionId);
  }

  private broadcastSessionBinding(sessionId: string): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    this.broadcaster({
      type: "session:binding",
      payload: {
        sessionId,
        providerSessionId: session.providerSessionId ?? null,
        status: session.providerSessionStatus,
      },
    });
    this.workspaceRuntime?.notifyBindingChanged(
      {
        workspaceRoot: session.workspacePath,
        nodeId: session.stage ?? "session",
        sessionId: session.id,
      },
      {
        providerId: session.providerId,
        providerSessionId: session.providerSessionId ?? null,
        bindingStatus: session.providerSessionStatus,
      }
    );
    this.stateBroadcaster();

    const providerSessionId = session.providerSessionId ?? null;
    const workspaceSlug = session.initiativeSlug ?? null;
    if (!(providerSessionId && workspaceSlug)) {
      return;
    }

    SessionContinuityFacade.readLastTokenUsageSnapshot({
      workspaceRoot: session.workspacePath,
      workspaceSlug,
      providerSessionId,
    })
      .then((snapshot) => {
        if (!snapshot) {
          return;
        }
        this.broadcaster({
          type: "session:stream",
          payload: {
            sessionId,
            event: {
              type: "stream_event",
              tokenUsage: { used: snapshot.used, limit: snapshot.limit },
              data: {
                kind: "token_usage",
                used: snapshot.used,
                limit: snapshot.limit,
              },
              uuid: "continuity::token_usage",
              timestamp: snapshot.updatedAt,
            },
          },
        });
      })
      .catch((error: unknown) => {
        this.logger.warn(
          "Failed to load token usage snapshot from continuity",
          {
            sessionId,
            providerSessionId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      });
  }

  private handleSessionIdChangedEvent(
    sessionId: string,
    payload: unknown
  ): void {
    const typed = payload as SessionIdChangedPayload;
    if (typed?.newId) {
      this.updateBindingWithResolvedId(sessionId, typed.newId);
    }
  }

  private handleRealSessionIdEvent(sessionId: string, payload: unknown): void {
    const typed = payload as { readonly sessionId?: unknown };
    if (typeof typed?.sessionId === "string") {
      this.updateBindingWithResolvedId(sessionId, typed.sessionId);
    }
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
    const session = options.session;
    if (session.stage !== "description") {
      return;
    }
    const dialogSessionId = options.dialogSessionId;
    if (!dialogSessionId) {
      return;
    }
    if (!DESCRIPTION_DIALOG_SESSION_SUFFIX_REGEX.test(dialogSessionId)) {
      return;
    }
    const legacyDialogSessionId = dialogSessionId.replace(
      DESCRIPTION_DIALOG_SESSION_SUFFIX_REGEX,
      ""
    );
    if (
      legacyDialogSessionId.length === 0 ||
      legacyDialogSessionId === dialogSessionId
    ) {
      return;
    }

    const workspaceKey = sanitizeWorkspaceSlug(session.workspacePath);
    this.sessionStorage.promoteHistoryFile({
      workspaceSlug: workspaceKey,
      providerId: session.providerId,
      fromHistorySessionId: legacyDialogSessionId,
      toHistorySessionId: dialogSessionId,
    });
  }

  private async maybeBackfillDescriptionDialogHistory(options: {
    readonly session: Session;
    readonly providerSessionId: string;
    readonly dialog: {
      readonly dialogSessionId: string;
      readonly shouldBackfill: boolean;
    } | null;
  }): Promise<void> {
    if (!options.dialog?.shouldBackfill) {
      return;
    }
    await this.backfillDescriptionDialogHistory({
      session: options.session,
      dialogSessionId: options.dialog.dialogSessionId,
      providerSessionId: options.providerSessionId,
    });
  }

  private async resolveDescriptionDialogSessionId(options: {
    readonly session: Session;
    readonly providerSessionId: string;
  }): Promise<{
    readonly dialogSessionId: string;
    readonly shouldBackfill: boolean;
  }> {
    const { session } = options;
    if (session.stage !== "description") {
      return {
        dialogSessionId: options.providerSessionId,
        shouldBackfill: false,
      };
    }
    if (!session.initiativeSlug) {
      return {
        dialogSessionId: options.providerSessionId,
        shouldBackfill: false,
      };
    }

    const sessionKind =
      session.runSlug === "reviewer" ? "reviewer" : ("collector" as const);

    const snapshot = await this.descriptionStepStore.read(
      session.workspacePath,
      session.initiativeSlug
    );

    // "1 agent = 1 dialog JSONL": collector and reviewer must never share the
    // same unified-session history id, even if the provider thread id is reused.
    const slot =
      sessionKind === "reviewer"
        ? snapshot?.reviewerSession
        : snapshot?.collectorSession;

    const legacySlot =
      snapshot?.sessionKind === sessionKind ? snapshot?.session : undefined;

    const existingDialogSessionId =
      slot?.dialogSessionId ?? legacySlot?.dialogSessionId ?? null;
    if (existingDialogSessionId) {
      return {
        dialogSessionId: existingDialogSessionId,
        shouldBackfill: false,
      };
    }

    const baseSessionId =
      slot?.providerSessionId ??
      legacySlot?.providerSessionId ??
      options.providerSessionId;

    // New per-agent dialog id format.
    return {
      dialogSessionId: `${baseSessionId}__${sessionKind}`,
      // Backfill/migration is handled explicitly in a dedicated stream to avoid
      // mixing legacy collector+reviewer history into the new per-agent files.
      shouldBackfill: false,
    };
  }

  private async backfillDescriptionDialogHistory(options: {
    readonly session: Session;
    readonly dialogSessionId: string;
    readonly providerSessionId: string;
  }): Promise<void> {
    const session = options.session;
    if (session.stage !== "description" || !session.initiativeSlug) {
      return;
    }

    const chains = await SessionContinuityFacade.readWorkspaceChains({
      workspaceRoot: session.workspacePath,
      workspaceSlug: session.initiativeSlug,
    });

    const sourceIds = new Set<string>([
      options.dialogSessionId,
      options.providerSessionId,
    ]);
    for (const chain of chains) {
      if (chain.stage !== "description") {
        continue;
      }
      for (const segment of chain.segments) {
        if (segment.providerId !== session.providerId) {
          continue;
        }
        sourceIds.add(segment.providerSessionId);
      }
    }

    // Nothing to merge.
    if (sourceIds.size <= 1) {
      return;
    }

    const workspaceKey = sanitizeWorkspaceSlug(session.workspacePath);
    await this.sessionStorage
      .backfillHistory({
        workspaceSlug: workspaceKey,
        providerId: session.providerId,
        historySessionId: options.dialogSessionId,
        sourceSessionIds: Array.from(sourceIds),
      })
      .catch((error: unknown) => {
        this.logger.warn(
          "Failed to backfill description unified-session file",
          {
            sessionId: session.id,
            providerId: session.providerId,
            dialogSessionId: options.dialogSessionId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      });
  }

  private async updateDescriptionSessionRef(
    session: Session,
    providerSessionId?: string
  ): Promise<void> {
    if (session.stage !== "description") {
      return;
    }
    if (!session.initiativeSlug) {
      return;
    }
    const resolvedProviderSessionId =
      providerSessionId ?? session.providerSessionId;
    if (!resolvedProviderSessionId) {
      return;
    }
    const sessionKind =
      session.runSlug === "reviewer" ? "reviewer" : "collector";
    const continuityRootSessionId =
      this.continuityRootBySessionId.get(session.id) ?? session.id;

    // Unified session history is stored under a workspace key derived from the
    // absolute workspace path (not the workflow slug/initiative slug).
    const workspaceKey = sanitizeWorkspaceSlug(session.workspacePath);

    const jsonlPath = buildSessionFilePath({
      rootDirectory: SESSION_ROOT,
      workspaceSlug: workspaceKey,
      provider: session.providerId,
      sessionId: sanitizeWorkspaceSlug(continuityRootSessionId),
    });

    const sessionRef = {
      providerId: session.providerId,
      providerSessionId: resolvedProviderSessionId,
      jsonlPath,
      dialogSessionId: continuityRootSessionId,
    } as const;

    try {
      await this.descriptionStepStore.upsert(
        session.workspacePath,
        session.initiativeSlug,
        {
          session: {
            providerId: session.providerId,
            providerSessionId: resolvedProviderSessionId,
            jsonlPath,
            dialogSessionId: continuityRootSessionId,
          },
          collectorSession:
            sessionKind === "collector" ? sessionRef : undefined,
          reviewerSession: sessionKind === "reviewer" ? sessionRef : undefined,
          sessionKind,
        }
      );
    } catch (error: unknown) {
      this.logger.warn("Failed to persist description session ref", {
        sessionId: session.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
