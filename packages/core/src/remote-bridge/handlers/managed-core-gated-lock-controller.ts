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

const MANAGED_CORE_GATED_STAGES = new Set([
  "application_skeleton",
  "diagram_modules",
  "quality_gates",
] as const);

/**
 * Owns the "managed core-gated" input lock. Managed technical sessions enter
 * the lock as soon as provider output reaches Core arbitration, before
 * validation/commit/continuation can expose an idle input state. The lock is
 * kept while managed workflow reports "continued" and released on "settled" /
 * "not_managed". Continuations reassert the lock even when arbitration already
 * set it, so the final Core-owned state wins over stale terminal/idle events.
 * Only sessions this controller locked are released, so resume/rollover locks
 * are never disturbed.
 */
export class ManagedCoreGatedLockController {
  private readonly deps: ManagedLockDeps;
  private readonly lockedSessions = new Set<string>();

  constructor(deps: ManagedLockDeps) {
    this.deps = deps;
  }

  lockForCoreArbitration(sessionId: string): void {
    this.notify(sessionId, true);
  }

  apply(sessionId: string, managedResult: string | undefined): void {
    const active = managedResult === "continued";
    this.notify(sessionId, active, { force: active });
  }

  private notify(
    sessionId: string,
    active: boolean,
    options: { readonly force?: boolean } = {}
  ): void {
    const workspaceRuntime = this.deps.workspaceRuntime;
    if (!workspaceRuntime) {
      return;
    }
    if (active && this.lockedSessions.has(sessionId) && !options.force) {
      return;
    }
    if (!(active || this.lockedSessions.has(sessionId))) {
      return;
    }
    const session = this.deps.sessionManager.getSession(sessionId);
    if (
      !(
        session?.workspacePath &&
        session.stage &&
        MANAGED_CORE_GATED_STAGES.has(session.stage as never)
      )
    ) {
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
