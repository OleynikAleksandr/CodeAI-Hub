import type { SessionContinuityLockReason } from "../../workspace-runtime/workspace-runtime-types";

interface ManagedLockSession {
  readonly id: string;
  readonly stage?: string | null;
  readonly workspacePath?: string;
}

interface ManagedLockDeps {
  readonly sessionManager: {
    getSession(sessionId: string): ManagedLockSession | null | undefined;
  };
  readonly workspaceRuntime?: {
    notifyLockChanged(
      sessionKey: {
        readonly nodeId: string;
        readonly sessionId: string;
        readonly workspaceRoot: string;
      },
      options: {
        readonly active: boolean;
        readonly reason?: SessionContinuityLockReason | null;
      }
    ): void;
  };
}

/**
 * Owns the "managed core-gated" input lock. While managed-workflow turns return
 * "continued" the agent keeps working with the orchestrator (Phase 1, core
 * gated), so Core holds a session continuityLock; the lock is released on
 * "settled" (review gate opens) / "not_managed". Only sessions this controller
 * locked are released, so resume/rollover locks are never disturbed.
 */
export class ManagedCoreGatedLockController {
  private readonly deps: ManagedLockDeps;
  private readonly lockedSessions = new Set<string>();

  constructor(deps: ManagedLockDeps) {
    this.deps = deps;
  }

  apply(sessionId: string, active: boolean): void {
    const workspaceRuntime = this.deps.workspaceRuntime;
    if (!workspaceRuntime) {
      return;
    }
    if (active && this.lockedSessions.has(sessionId)) {
      return;
    }
    if (!(active || this.lockedSessions.has(sessionId))) {
      return;
    }
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session?.workspacePath) {
      return;
    }
    workspaceRuntime.notifyLockChanged(
      {
        workspaceRoot: session.workspacePath,
        nodeId: session.stage ?? "session",
        sessionId: session.id,
      },
      active
        ? { active: true, reason: "managed_core_gated" }
        : { active: false, reason: null }
    );
    if (active) {
      this.lockedSessions.add(sessionId);
    } else {
      this.lockedSessions.delete(sessionId);
    }
  }
}
