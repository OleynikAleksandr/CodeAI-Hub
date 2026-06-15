import type { Logger } from "../../telemetry/logger";
import type { SessionContinuityLockReason } from "../../workspace-runtime/workspace-runtime-types";
import { traceManagedWorkflowDiagnostic } from "./managed-workflow-diagnostic-trace";

interface ManagedLockSession {
  readonly continuationParentId?: string | null;
  readonly id: string;
  readonly initiativeSlug?: string | null;
  readonly providerId?: string | null;
  readonly providerSessionId?: string | null;
  readonly runSlug?: string | null;
  readonly stage?: string | null;
  readonly workspacePath?: string;
}

interface ManagedLockDeps {
  readonly broadcaster?: (event: {
    readonly payload: { readonly event: unknown; readonly sessionId: string };
    readonly type: "session:stream";
  }) => void;
  readonly logger?: Logger;
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
const DEVELOPMENT_TREE_PRODUCT_PART_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/[^/]+$/u;

const isManagedCoreGatedStage = (stage: string): boolean =>
  MANAGED_CORE_GATED_STAGES.has(stage as never) ||
  DEVELOPMENT_TREE_PRODUCT_PART_STAGE_RE.test(stage);

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

  releaseForManualStop(sessionId: string): boolean {
    return this.notify(sessionId, false, { force: true });
  }

  isLocked(sessionId: string): boolean {
    return this.lockedSessions.has(sessionId);
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
    const wasLocked = this.lockedSessions.has(sessionId);
    const session = this.deps.sessionManager.getSession(sessionId);
    if (
      !(
        session?.workspacePath &&
        session.stage &&
        isManagedCoreGatedStage(session.stage)
      )
    ) {
      return false;
    }
    if (active && wasLocked && !options.force) {
      this.traceGate(session, "managed_input_gate.noop_already_locked", {
        active,
        force: options.force ?? false,
        wasLocked,
      });
      return true;
    }
    if (!(active || wasLocked || options.force)) {
      this.traceGate(session, "managed_input_gate.noop_already_unlocked", {
        active,
        force: options.force ?? false,
        wasLocked,
      });
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
    const sessionIds = this.resolveSessionAliases(session);
    this.traceGate(session, "managed_input_gate.applied", {
      active,
      force: options.force ?? false,
      reason: active ? "managed_core_gated" : null,
      sessionIds,
      wasLocked,
      workspaceRuntimeNotified: Boolean(this.deps.workspaceRuntime),
    });
    this.emitManagedInputGate(
      session,
      active,
      sessionIds,
      options.force ?? false
    );
    return true;
  }

  private emitManagedInputGate(
    session: ManagedLockSession,
    active: boolean,
    sessionIds: readonly string[],
    force: boolean
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
            force,
            reason: active ? "managed_core_gated" : null,
            providerSessionId: session.providerSessionId ?? null,
            sessionIds,
          },
          timestamp: new Date().toISOString(),
          uuid: `${session.id}::managed_input_gate::${active ? "lock" : "unlock"}::${Date.now()}`,
        },
      },
    });
  }

  private traceGate(
    session: ManagedLockSession,
    event: string,
    gate: Record<string, unknown>
  ): void {
    traceManagedWorkflowDiagnostic({
      event,
      logger: this.deps.logger,
      payload: { gate },
      session,
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
