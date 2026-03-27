import crypto from "node:crypto";
import type { TokenUsageSnapshot } from "../../session-continuity/continuity-types";
import { computeRemainingPercent } from "../../session-continuity/token-usage";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type {
  ContinuityLockReason,
  EmitContinuityLockEventOptions,
  FlowNodeContinuityLockContext,
} from "./session-continuity-lock-service";

export type FlowNodeRolloverPhase =
  | "start"
  | "create_report_sent"
  | "waiting_for_report_ack"
  | "waiting_for_report"
  | "report_ready"
  | "new_session_created"
  | "resume_sent"
  | "failed";

export type FlowNodeRolloverNotification = {
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

export type FlowNodeContinuityCreateReportRequestState = {
  readonly requestId: string;
  readonly attempt: number;
  readonly stage: "waiting_for_report" | "completed" | "failed";
  readonly reportPath: string;
  readonly tmpReportPath: string;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

type SessionContinuityRolloverOrchestratorDependencies = {
  readonly logger: Logger;
  readonly registerPostTurnRolloverRequiredDecision: (
    sessionId: string
  ) => void;
  readonly elevateSessionToRolloverResumeMode: (session: Session) => void;
  readonly registerFlowNodeContinuityLockContext: (
    context: FlowNodeContinuityLockContext
  ) => FlowNodeContinuityLockContext;
  readonly emitContinuityLockEvent: (
    options: EmitContinuityLockEventOptions
  ) => void;
  readonly emitFlowNodeRolloverNotification: (
    sessionId: string,
    notification: Omit<FlowNodeRolloverNotification, "timestamp">
  ) => void;
  readonly rolloverFlowNodeSession: (
    session: Session,
    rollover: {
      readonly remainingPercent: number;
      readonly thresholdPercent: number;
      readonly rolloverId: string;
    },
    options?: { readonly silent: boolean }
  ) => Promise<void>;
  readonly getCreateReportRequest: (
    sessionId: string
  ) => FlowNodeContinuityCreateReportRequestState | null;
  readonly deleteCreateReportRequest: (sessionId: string) => void;
  readonly finalizeFlowNodeContinuityLock: (options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed" | "resume_timeout"
    >;
  }) => void;
  readonly updateSessionResumeLifecycleState: (
    session: Session,
    patch: {
      readonly mode?: "resume_via_rollover" | "resume_in_place" | "no_resume";
      readonly finalTurnCompleted?: boolean;
      readonly terminalLockReason?: "terminal_no_resume" | null;
    }
  ) => void;
  readonly emitTurnStateEvent: (options: {
    readonly sessionId: string;
    readonly state: "running" | "idle";
  }) => void;
  readonly emitContinuityFailedEvent: (options: {
    readonly sessionId: string;
    readonly providerId: string | null;
    readonly providerSessionId: string | null;
    readonly request: FlowNodeContinuityCreateReportRequestState;
    readonly reason: "report_timeout" | "unknown";
    readonly errorMessage: string;
  }) => void;
  readonly isContinuityReportTimeoutError: (error: unknown) => boolean;
};

export class SessionContinuityRolloverOrchestrator {
  private readonly deps: SessionContinuityRolloverOrchestratorDependencies;
  private readonly rolloverInFlight = new Set<string>();
  private readonly rolloverStarted = new Set<string>();
  private readonly tokenUsageSnapshots = new Map<string, TokenUsageSnapshot>();

  constructor(deps: SessionContinuityRolloverOrchestratorDependencies) {
    this.deps = deps;
  }

  hasPending(sessionId: string): boolean {
    return (
      this.rolloverStarted.has(sessionId) ||
      this.rolloverInFlight.has(sessionId)
    );
  }

  clearPendingState(sessionId: string): void {
    this.rolloverStarted.delete(sessionId);
    this.rolloverInFlight.delete(sessionId);
  }

  clearTokenUsageSnapshot(sessionId: string): void {
    this.tokenUsageSnapshots.delete(sessionId);
  }

  recordTokenUsageSnapshot(
    sessionId: string,
    usage: TokenUsageSnapshot | null
  ): void {
    if (usage) {
      this.tokenUsageSnapshots.set(sessionId, usage);
    }
  }

  getTokenUsageSnapshot(sessionId: string): TokenUsageSnapshot | null {
    return this.tokenUsageSnapshots.get(sessionId) ?? null;
  }

  async startFlowNodeRolloverFromUsage(options: {
    readonly session: Session;
    readonly sessionId: string;
    readonly stageId: string;
    readonly runSlug: string | null;
    readonly usage: TokenUsageSnapshot;
    readonly remainingPercentThreshold: number;
  }): Promise<void> {
    this.rolloverInFlight.add(options.sessionId);
    this.rolloverStarted.add(options.sessionId);
    this.deps.registerPostTurnRolloverRequiredDecision(options.sessionId);
    this.deps.elevateSessionToRolloverResumeMode(options.session);

    const remainingPercent = computeRemainingPercent(options.usage);
    const lockContext = this.deps.registerFlowNodeContinuityLockContext({
      rolloverId: crypto.randomUUID(),
      sourceSessionId: options.sessionId,
      stageId: options.stageId,
      runSlug: options.runSlug,
      awaitingBootstrapTurn: false,
    });
    this.deps.emitContinuityLockEvent({
      sessionId: options.sessionId,
      rolloverId: lockContext.rolloverId,
      sourceSessionId: lockContext.sourceSessionId,
      stageId: lockContext.stageId,
      runSlug: lockContext.runSlug,
      state: "locked",
      reason: "threshold_reached",
    });
    this.deps.emitFlowNodeRolloverNotification(options.sessionId, {
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
      await this.deps.rolloverFlowNodeSession(
        options.session,
        {
          remainingPercent,
          thresholdPercent: options.remainingPercentThreshold,
          rolloverId: lockContext.rolloverId,
        },
        { silent: false }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const reason: "report_timeout" | "unknown" =
        this.deps.isContinuityReportTimeoutError(error)
          ? "report_timeout"
          : "unknown";
      const request = this.deps.getCreateReportRequest(options.sessionId);

      this.deps.finalizeFlowNodeContinuityLock({
        sessionId: options.sessionId,
        reason: "resume_failed",
      });
      this.deps.updateSessionResumeLifecycleState(options.session, {
        mode: "resume_in_place",
        finalTurnCompleted: false,
        terminalLockReason: null,
      });
      this.deps.emitTurnStateEvent({
        sessionId: options.sessionId,
        state: "idle",
      });
      if (request) {
        this.deps.emitContinuityFailedEvent({
          sessionId: options.sessionId,
          providerId: options.session.providerId ?? null,
          providerSessionId: options.session.providerSessionId ?? null,
          request,
          reason,
          errorMessage,
        });
      }
      this.deps.deleteCreateReportRequest(options.sessionId);
      this.rolloverStarted.delete(options.sessionId);
      this.deps.emitFlowNodeRolloverNotification(options.sessionId, {
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
      this.deps.logger.warn("Flow node rollover failed", {
        sessionId: options.sessionId,
        providerId: options.session.providerId,
        providerSessionId: options.session.providerSessionId ?? null,
        stageId: options.stageId,
        runSlug: options.runSlug,
        reason,
        error: errorMessage,
      });
    } finally {
      this.rolloverInFlight.delete(options.sessionId);
    }
  }
}
