import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { SessionContinuityLockService } from "./session-continuity-lock-service";
import type {
  PostTurnContextDecision,
  SessionRequestHandlerResumeLifecycle,
} from "./session-request-handler-resume-lifecycle";

interface SessionRequestHandlerTurnCompletionDependencies {
  readonly continuityLockService: SessionContinuityLockService;
  readonly emitTurnStateEvent: (options: {
    readonly sessionId: string;
    readonly state: "running" | "idle";
  }) => void;
  readonly finalizeFlowNodeContinuityLockOnBootstrapGate: (options: {
    readonly sessionId: string;
    readonly reason: "resume_ready" | "resume_failed" | "resume_timeout";
  }) => void;
  readonly isFlowNodeRolloverPending: (sessionId: string) => boolean;
  readonly logger: Logger;
  readonly resolveImmediatePostTurnContextDecision: (
    session: Session
  ) => PostTurnContextDecision | null;
  readonly resumeLifecycle: SessionRequestHandlerResumeLifecycle;
  readonly sessionManager: SessionManager;
}

export class SessionRequestHandlerTurnCompletion {
  private readonly deps: SessionRequestHandlerTurnCompletionDependencies;

  constructor(deps: SessionRequestHandlerTurnCompletionDependencies) {
    this.deps = deps;
  }

  runTurnCompletedArbitration(sessionId: string): void {
    try {
      this.handleTurnCompletedEvent(sessionId);
    } catch (error) {
      this.deps.logger.warn("Turn completion arbitration failed", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.deps.resumeLifecycle.clearPostTurnContextDecision(sessionId);
      if (!this.deps.isFlowNodeRolloverPending(sessionId)) {
        this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
      }
      this.deps.finalizeFlowNodeContinuityLockOnBootstrapGate({
        sessionId,
        reason: "resume_failed",
      });
    }
  }

  private handleTurnCompletedEvent(sessionId: string): void {
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      this.deps.resumeLifecycle.clearPostTurnContextDecision(sessionId);
      return;
    }
    const resumeMode =
      this.deps.resumeLifecycle.getSessionResumeLifecycleState(session).mode;
    if (resumeMode === "no_resume") {
      this.deps.resumeLifecycle.clearPostTurnContextDecision(sessionId);
      this.deps.resumeLifecycle.handleNoResumeTurnCompleted(session);
      this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
      return;
    }

    const lockContext = this.deps.continuityLockService.getContext(sessionId);
    if (
      lockContext &&
      lockContext.targetSessionId === sessionId &&
      lockContext.awaitingBootstrapTurn
    ) {
      this.deps.finalizeFlowNodeContinuityLockOnBootstrapGate({
        sessionId,
        reason: "resume_ready",
      });
      this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
      return;
    }

    this.deps.resumeLifecycle.updateSessionResumeLifecycleState(session, {
      finalTurnCompleted: true,
      terminalLockReason: null,
    });

    const contextDecision =
      this.deps.resumeLifecycle.resolveRecordedPostTurnContextDecision(
        session,
        (candidate) =>
          this.deps.resolveImmediatePostTurnContextDecision(candidate)
      );
    if (!contextDecision) {
      return;
    }

    this.deps.resumeLifecycle.clearPostTurnContextDecision(sessionId);
    if (
      contextDecision === "rollover_required" ||
      this.deps.isFlowNodeRolloverPending(sessionId)
    ) {
      return;
    }

    this.deps.finalizeFlowNodeContinuityLockOnBootstrapGate({
      sessionId,
      reason: "resume_ready",
    });
    this.deps.emitTurnStateEvent({ sessionId, state: "idle" });
    if (resumeMode === "resume_in_place") {
      this.deps.continuityLockService.emitResumeInPlaceNoRolloverUnlock(
        session
      );
    }
  }
}
