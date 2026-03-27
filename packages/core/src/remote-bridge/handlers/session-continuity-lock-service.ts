import crypto from "node:crypto";
import type { Session, SessionManager } from "../../session-manager";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type {
  SessionContinuityLockReason,
  SessionContinuityLockTransition,
  SessionResumeMode,
  SessionTerminalLockReason,
} from "../../workspace-runtime/workspace-runtime-types";
import type { BridgeEvent } from "../types";

export type ContinuityLockState = "locked" | "unlocked";
export type ContinuityLockReason = SessionContinuityLockReason;

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

export type FlowNodeContinuityLockContext = {
  readonly rolloverId: string;
  readonly sourceSessionId: string;
  readonly targetSessionId?: string;
  readonly stageId: string;
  readonly runSlug: string | null;
  readonly awaitingBootstrapTurn: boolean;
};

export type EmitContinuityLockEventOptions = {
  readonly sessionId: string;
  readonly rolloverId: string;
  readonly sourceSessionId: string;
  readonly targetSessionId?: string;
  readonly stageId: string;
  readonly runSlug: string | null;
  readonly state: ContinuityLockState;
  readonly reason: ContinuityLockReason;
};

type SessionResumeLifecycleSnapshot = {
  readonly mode: SessionResumeMode;
  readonly finalTurnCompleted: boolean;
  readonly terminalLockReason: SessionTerminalLockReason | null;
};

type SessionContinuityLockServiceDependencies = {
  readonly sessionManager: SessionManager;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly workspaceRuntime?: WorkspaceRuntimeFacade;
  readonly clearPostTurnContextDecision: (sessionId: string) => void;
  readonly clearRolloverSessionState: (sessionId: string) => void;
  readonly getSessionResumeLifecycleState: (
    session: Session
  ) => SessionResumeLifecycleSnapshot;
  readonly updateSessionResumeLifecycleState: (
    session: Session,
    patch: Partial<SessionResumeLifecycleSnapshot>
  ) => SessionResumeLifecycleSnapshot;
};

export class SessionContinuityLockService {
  private readonly deps: SessionContinuityLockServiceDependencies;
  private readonly lockContexts = new Map<
    string,
    FlowNodeContinuityLockContext
  >();

  constructor(deps: SessionContinuityLockServiceDependencies) {
    this.deps = deps;
  }

  hasContext(sessionId: string): boolean {
    return this.lockContexts.has(sessionId);
  }

  getContext(sessionId: string): FlowNodeContinuityLockContext | null {
    return this.lockContexts.get(sessionId) ?? null;
  }

  emitContinuityLockEvent(options: EmitContinuityLockEventOptions): void {
    const session = this.deps.sessionManager.getSession(options.sessionId);
    const providerId = session?.providerId ?? null;
    const lifecycleState = session
      ? this.deps.getSessionResumeLifecycleState(session)
      : null;
    const timestamp = new Date().toISOString();
    const transition: SessionContinuityLockTransition | null =
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
              options.reason === "threshold_reached" ||
              options.reason === "report_in_progress" ||
              options.reason === "resume_bootstrap",
            awaitingBootstrapTurn: options.reason === "resume_bootstrap",
            resumeMode: lifecycleState?.mode,
            finalTurnCompleted: lifecycleState?.finalTurnCompleted,
            terminalLockReason: lifecycleState?.terminalLockReason ?? undefined,
            updatedAt: timestamp,
          }
        : null;

    if (session) {
      this.deps.workspaceRuntime?.notifyLockChanged(
        {
          workspaceRoot: session.workspacePath,
          nodeId: session.stage ?? "session",
          sessionId: session.id,
        },
        {
          active: options.state === "locked",
          reason: options.reason,
          transition,
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

    this.deps.broadcaster({
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

  registerFlowNodeContinuityLockContext(
    context: FlowNodeContinuityLockContext
  ): FlowNodeContinuityLockContext {
    const previous = this.lockContexts.get(context.sourceSessionId);
    if (
      previous?.targetSessionId &&
      previous.targetSessionId !== context.targetSessionId
    ) {
      this.lockContexts.delete(previous.targetSessionId);
    }
    this.lockContexts.set(context.sourceSessionId, context);
    if (context.targetSessionId) {
      this.lockContexts.set(context.targetSessionId, context);
    }
    return context;
  }

  finalizeFlowNodeContinuityLock(options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed" | "resume_timeout"
    >;
  }): void {
    const context = this.lockContexts.get(options.sessionId);
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
    } as const;

    this.emitContinuityLockEvent({
      sessionId: targetSessionId,
      state: "unlocked",
      ...payloadBase,
    });
    if (context.sourceSessionId !== targetSessionId) {
      this.emitContinuityLockEvent({
        sessionId: context.sourceSessionId,
        state: "unlocked",
        ...payloadBase,
      });
    }

    this.lockContexts.delete(context.sourceSessionId);
    if (context.targetSessionId) {
      this.lockContexts.delete(context.targetSessionId);
    }
    this.finalizePostBootstrapRolloverLifecycle(context);
  }

  finalizeFlowNodeContinuityLockOnBootstrapGate(options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed" | "resume_timeout"
    >;
  }): void {
    const context = this.lockContexts.get(options.sessionId);
    if (
      !(
        context &&
        context.targetSessionId === options.sessionId &&
        context.awaitingBootstrapTurn
      )
    ) {
      return;
    }
    this.finalizeFlowNodeContinuityLock(options);
  }

  emitResumeInPlaceNoRolloverUnlock(session: Session): void {
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

  private finalizePostBootstrapRolloverLifecycle(
    context: FlowNodeContinuityLockContext
  ): void {
    const sessionIds = [
      context.sourceSessionId,
      context.targetSessionId,
    ].filter((candidate): candidate is string => Boolean(candidate));
    for (const sessionId of sessionIds) {
      this.deps.clearRolloverSessionState(sessionId);
      this.deps.clearPostTurnContextDecision(sessionId);
    }
    if (!context.targetSessionId) {
      return;
    }

    const targetSession = this.deps.sessionManager.getSession(
      context.targetSessionId
    );
    if (!targetSession) {
      return;
    }
    const lifecycleState =
      this.deps.getSessionResumeLifecycleState(targetSession);
    if (lifecycleState.mode === "no_resume") {
      return;
    }
    this.deps.updateSessionResumeLifecycleState(targetSession, {
      mode: "resume_in_place",
      finalTurnCompleted: false,
      terminalLockReason: null,
    });
  }
}
