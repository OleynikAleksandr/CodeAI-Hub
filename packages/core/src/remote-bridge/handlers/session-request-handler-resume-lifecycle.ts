import crypto from "node:crypto";
import type { Session, SessionManager } from "../../session-manager";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type {
  SessionResumeMode,
  SessionTerminalLockReason,
} from "../../workspace-runtime/workspace-runtime-types";
import type { EmitContinuityLockEventOptions } from "./session-continuity-lock-service";

export interface SessionResumeLifecycleState {
  readonly finalTurnCompleted: boolean;
  readonly mode: SessionResumeMode;
  readonly terminalLockReason: SessionTerminalLockReason | null;
}

export type PostTurnContextDecision = "no_rollover" | "rollover_required";

interface SessionRequestHandlerResumeLifecycleDependencies {
  readonly clearTokenUsageSnapshot: (sessionId: string) => void;
  readonly emitContinuityLockEvent: (
    options: EmitContinuityLockEventOptions
  ) => void;
  readonly finalizePendingTurnCompletion: (sessionId: string) => void;
  readonly isFlowNodeRolloverPending: (sessionId: string) => boolean;
  readonly sessionManager: SessionManager;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
}

export class SessionRequestHandlerResumeLifecycle {
  private readonly deps: SessionRequestHandlerResumeLifecycleDependencies;
  private readonly postTurnContextDecisionBySessionId = new Map<
    string,
    PostTurnContextDecision
  >();
  private readonly postTurnContextDecisionPendingSessions = new Set<string>();
  private readonly sessionResumeLifecycleStates = new Map<
    string,
    SessionResumeLifecycleState
  >();

  constructor(deps: SessionRequestHandlerResumeLifecycleDependencies) {
    this.deps = deps;
  }

  hasPendingPostTurnContextDecision(sessionId: string): boolean {
    return this.postTurnContextDecisionPendingSessions.has(sessionId);
  }

  clearSessionLifecycle(sessionId: string): void {
    this.sessionResumeLifecycleStates.delete(sessionId);
    this.clearPostTurnContextDecision(sessionId);
  }

  registerInitialSessionLifecycle(
    session: Session,
    explicitMode?: SessionResumeMode
  ): void {
    const initialLifecycleState: SessionResumeLifecycleState = {
      mode: this.resolveInitialResumeMode({
        stage: session.stage,
        runSlug: session.runSlug,
        explicitMode: explicitMode ?? null,
      }),
      finalTurnCompleted: false,
      terminalLockReason: null,
    };
    this.sessionResumeLifecycleStates.set(session.id, initialLifecycleState);
    this.broadcastSessionResumeLifecycleState(session, initialLifecycleState);
  }

  getSessionResumeLifecycleState(
    session: Session
  ): SessionResumeLifecycleState {
    const existing = this.sessionResumeLifecycleStates.get(session.id);
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

  updateSessionResumeLifecycleState(
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
    this.sessionResumeLifecycleStates.set(session.id, next);
    this.broadcastSessionResumeLifecycleState(session, next);
    return next;
  }

  elevateSessionToRolloverResumeMode(session: Session): void {
    this.updateSessionResumeLifecycleState(session, {
      mode: "resume_via_rollover",
      finalTurnCompleted: false,
      terminalLockReason: null,
    });
  }

  handleNoResumeTurnCompleted(session: Session): void {
    const state = this.getSessionResumeLifecycleState(session);
    if (
      state.finalTurnCompleted &&
      state.terminalLockReason === "terminal_no_resume"
    ) {
      return;
    }
    const rolloverId = crypto.randomUUID();
    this.updateSessionResumeLifecycleState(session, {
      mode: "no_resume",
      finalTurnCompleted: true,
      terminalLockReason: "terminal_no_resume",
    });
    this.deps.emitContinuityLockEvent({
      sessionId: session.id,
      rolloverId,
      sourceSessionId: session.id,
      stageId: session.stage ?? "session",
      runSlug: session.runSlug ?? null,
      state: "locked",
      reason: "terminal_no_resume",
    });
  }

  markPostTurnContextDecisionPending(sessionId: string): void {
    this.postTurnContextDecisionBySessionId.delete(sessionId);
    this.postTurnContextDecisionPendingSessions.add(sessionId);
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    const lifecycleState = this.getSessionResumeLifecycleState(session);
    if (lifecycleState.mode === "no_resume") {
      return;
    }
    if (this.deps.isFlowNodeRolloverPending(sessionId)) {
      return;
    }
    this.deps.emitContinuityLockEvent({
      sessionId: session.id,
      rolloverId: crypto.randomUUID(),
      sourceSessionId: session.id,
      stageId: session.stage ?? "session",
      runSlug: session.runSlug ?? null,
      state: "locked",
      reason: "context_check_pending",
    });
  }

  clearPostTurnContextDecision(sessionId: string): void {
    this.postTurnContextDecisionPendingSessions.delete(sessionId);
    this.postTurnContextDecisionBySessionId.delete(sessionId);
    this.deps.clearTokenUsageSnapshot(sessionId);
  }

  recordPostTurnContextDecision(
    sessionId: string,
    decision: PostTurnContextDecision
  ): void {
    this.postTurnContextDecisionBySessionId.set(sessionId, decision);
  }

  resolveRecordedPostTurnContextDecision(
    session: Session,
    resolveImmediateDecision: (
      session: Session
    ) => PostTurnContextDecision | null
  ): PostTurnContextDecision | null {
    const immediateDecision = resolveImmediateDecision(session);
    if (immediateDecision) {
      this.recordPostTurnContextDecision(session.id, immediateDecision);
      return immediateDecision;
    }
    return this.postTurnContextDecisionBySessionId.get(session.id) ?? null;
  }

  registerPostTurnNoRolloverDecision(sessionId: string): void {
    this.recordPostTurnContextDecision(sessionId, "no_rollover");
    this.finalizePendingTurnCompletion(sessionId);
  }

  registerPostTurnRolloverRequiredDecision(sessionId: string): void {
    this.recordPostTurnContextDecision(sessionId, "rollover_required");
    this.finalizePendingTurnCompletion(sessionId);
  }

  private finalizePendingTurnCompletion(sessionId: string): void {
    if (!this.postTurnContextDecisionPendingSessions.has(sessionId)) {
      return;
    }
    this.deps.finalizePendingTurnCompletion(sessionId);
  }

  private resolveInitialResumeMode(options: {
    readonly stage: string | null;
    readonly runSlug: string | null;
    readonly explicitMode?: SessionResumeMode | null;
  }): SessionResumeMode {
    if (options.explicitMode) {
      return options.explicitMode;
    }
    return "resume_in_place";
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
    this.deps.workspaceRuntime?.notifySessionCreated(sessionKey, {
      resumeMode: state.mode,
      terminalLockReason: state.terminalLockReason ?? undefined,
    });
    this.deps.workspaceRuntime?.notifyFinalTurnCompleted(
      sessionKey,
      state.finalTurnCompleted
    );
  }
}
