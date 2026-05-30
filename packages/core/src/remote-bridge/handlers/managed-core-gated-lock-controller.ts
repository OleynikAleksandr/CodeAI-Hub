import type { SessionContinuityLockReason } from "../../workspace-runtime/workspace-runtime-types";

interface ManagedLockSession {
  readonly continuationParentId?: string | null;
  readonly id: string;
  readonly providerSessionId?: string | null;
  readonly stage?: string | null;
  readonly workspacePath?: string;
}

interface ManagedLockDeps {
  readonly broadcaster?: (event: {
    readonly payload: { readonly event: unknown; readonly sessionId: string };
    readonly type: "session:stream";
  }) => void;
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

  lockForCoreArbitration(sessionId: string): boolean {
    return this.notify(sessionId, true, { force: true });
  }

  apply(sessionId: string, managedResult: string | undefined): void {
    const active = managedResult === "continued";
    this.notify(sessionId, active, { force: active });
  }

  private notify(
    sessionId: string,
    active: boolean,
    options: { readonly force?: boolean } = {}
  ): boolean {
    if (active && this.lockedSessions.has(sessionId) && !options.force) {
      return true;
    }
    if (!(active || this.lockedSessions.has(sessionId))) {
      return false;
    }
    const session = this.deps.sessionManager.getSession(sessionId);
    if (
      !(
        session?.workspacePath &&
        session.stage &&
        MANAGED_CORE_GATED_STAGES.has(session.stage as never)
      )
    ) {
      return false;
    }
    this.deps.workspaceRuntime?.notifyLockChanged(
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
    this.emitManagedInputGate(session, active);
    return true;
  }

  private emitManagedInputGate(
    session: ManagedLockSession,
    active: boolean
  ): void {
    this.deps.broadcaster?.({
      type: "session:stream",
      payload: {
        sessionId: session.id,
        event: {
          type: "stream_event",
          provider: "core",
          data: {
            kind: "managed_input_gate",
            active,
            reason: active ? "managed_core_gated" : null,
            providerSessionId: session.providerSessionId ?? null,
            sessionIds: this.resolveSessionAliases(session),
          },
          timestamp: new Date().toISOString(),
          uuid: `${session.id}::managed_input_gate::${active ? "lock" : "unlock"}::${Date.now()}`,
        },
      },
    });
  }

  private resolveSessionAliases(
    session: ManagedLockSession
  ): readonly string[] {
    const aliases = new Set([session.id]);
    let cursor = session.continuationParentId ?? null;
    for (let depth = 0; cursor && depth < 10; depth += 1) {
      aliases.add(cursor);
      cursor =
        this.deps.sessionManager.getSession(cursor)?.continuationParentId ??
        null;
    }
    return [...aliases];
  }
}
