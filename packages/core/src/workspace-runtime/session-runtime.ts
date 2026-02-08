import type {
  SessionContinuityLockReason,
  SessionContinuityLockTransition,
  SessionKey,
  SessionTurnState,
} from "./workspace-runtime-types";

export type SessionRuntimeChangedField =
  | "turnState"
  | "continuityLockActive"
  | "continuityLockReason"
  | "continuityLockTransition"
  | "finalTurnCompleted"
  | "lastHeartbeatAt";

export type SessionRuntimeStateSnapshot = {
  readonly turnState: SessionTurnState;
  readonly continuityLockActive: boolean;
  readonly continuityLockReason: SessionContinuityLockReason | null;
  readonly continuityLockTransition: SessionContinuityLockTransition | null;
  readonly finalTurnCompleted: boolean;
  readonly lastHeartbeatAt: number | null;
};

type SessionRuntimeEntry = {
  readonly key: SessionKey;
  turnState: SessionTurnState;
  continuityLockActive: boolean;
  continuityLockReason: SessionContinuityLockReason | null;
  continuityLockTransition: SessionContinuityLockTransition | null;
  finalTurnCompleted: boolean;
  lastHeartbeatAt: number | null;
  runningSince: number | null;
};

type SessionRuntimeDeps = {
  readonly watchdogTimeoutMs?: number;
  readonly watchdogTickMs?: number;
  readonly now?: () => number;
  readonly onStateChanged?: (
    sessionKey: SessionKey,
    field: SessionRuntimeChangedField,
    snapshot: SessionRuntimeStateSnapshot
  ) => void;
};

const DEFAULT_WATCHDOG_TIMEOUT_MS = 120_000;
const DEFAULT_WATCHDOG_TICK_MS = 1000;

const toSnapshot = (
  entry: SessionRuntimeEntry
): SessionRuntimeStateSnapshot => ({
  turnState: entry.turnState,
  continuityLockActive: entry.continuityLockActive,
  continuityLockReason: entry.continuityLockReason,
  continuityLockTransition: entry.continuityLockTransition,
  finalTurnCompleted: entry.finalTurnCompleted,
  lastHeartbeatAt: entry.lastHeartbeatAt,
});

const createEntry = (key: SessionKey): SessionRuntimeEntry => ({
  key,
  turnState: "idle",
  continuityLockActive: false,
  continuityLockReason: null,
  continuityLockTransition: null,
  finalTurnCompleted: false,
  lastHeartbeatAt: null,
  runningSince: null,
});

export class SessionRuntime {
  private readonly entriesBySessionId = new Map<string, SessionRuntimeEntry>();
  private readonly now: () => number;
  private readonly onStateChanged;
  private readonly watchdogTimeoutMs: number;
  private readonly timer: NodeJS.Timeout;

  constructor(deps: SessionRuntimeDeps = {}) {
    this.now = deps.now ?? Date.now;
    this.onStateChanged = deps.onStateChanged;
    this.watchdogTimeoutMs =
      deps.watchdogTimeoutMs ?? DEFAULT_WATCHDOG_TIMEOUT_MS;

    const watchdogTickMs = deps.watchdogTickMs ?? DEFAULT_WATCHDOG_TICK_MS;
    this.timer = setInterval(() => {
      this.tickWatchdog();
    }, watchdogTickMs);
    this.timer.unref?.();
  }

  markRunning(key: SessionKey): void {
    const entry = this.getOrCreateEntry(key);
    const now = this.now();
    const stateChanged = entry.turnState !== "running";
    entry.turnState = "running";
    entry.runningSince = now;
    entry.lastHeartbeatAt = now;

    if (stateChanged) {
      this.notify(entry, "turnState");
    }
    this.notify(entry, "lastHeartbeatAt");
  }

  markIdle(key: SessionKey): void {
    const entry = this.getOrCreateEntry(key);
    if (entry.turnState === "idle") {
      return;
    }
    entry.turnState = "idle";
    entry.runningSince = null;
    this.notify(entry, "turnState");
  }

  recordHeartbeat(key: SessionKey): void {
    const entry = this.getOrCreateEntry(key);
    const now = this.now();
    entry.lastHeartbeatAt = now;
    this.notify(entry, "lastHeartbeatAt");
  }

  setLock(key: SessionKey, active: boolean): void {
    const entry = this.getOrCreateEntry(key);
    if (entry.continuityLockActive === active) {
      return;
    }
    entry.continuityLockActive = active;
    this.notify(entry, "continuityLockActive");
  }

  setLockReason(
    key: SessionKey,
    reason: SessionContinuityLockReason | null
  ): void {
    const entry = this.getOrCreateEntry(key);
    if (entry.continuityLockReason === reason) {
      return;
    }
    entry.continuityLockReason = reason;
    this.notify(entry, "continuityLockReason");
  }

  setLockTransition(
    key: SessionKey,
    transition: SessionContinuityLockTransition | null
  ): void {
    const entry = this.getOrCreateEntry(key);
    if (
      entry.continuityLockTransition?.rolloverId === transition?.rolloverId &&
      entry.continuityLockTransition?.reason === transition?.reason &&
      entry.continuityLockTransition?.awaitingBootstrapTurn ===
        transition?.awaitingBootstrapTurn &&
      entry.continuityLockTransition?.targetSessionId ===
        transition?.targetSessionId
    ) {
      return;
    }
    entry.continuityLockTransition = transition;
    this.notify(entry, "continuityLockTransition");
  }

  setFinalTurnCompleted(key: SessionKey, finalTurnCompleted: boolean): void {
    const entry = this.getOrCreateEntry(key);
    if (entry.finalTurnCompleted === finalTurnCompleted) {
      return;
    }
    entry.finalTurnCompleted = finalTurnCompleted;
    this.notify(entry, "finalTurnCompleted");
  }

  getState(key: SessionKey): SessionRuntimeStateSnapshot {
    return toSnapshot(this.getOrCreateEntry(key));
  }

  dispose(): void {
    clearInterval(this.timer);
  }

  private getOrCreateEntry(key: SessionKey): SessionRuntimeEntry {
    const existing = this.entriesBySessionId.get(key.sessionId);
    if (existing) {
      return existing;
    }
    const created = createEntry(key);
    this.entriesBySessionId.set(key.sessionId, created);
    return created;
  }

  private tickWatchdog(): void {
    const now = this.now();
    for (const entry of this.entriesBySessionId.values()) {
      if (entry.turnState !== "running") {
        continue;
      }
      const referenceTime = entry.lastHeartbeatAt ?? entry.runningSince;
      if (referenceTime === null) {
        continue;
      }
      if (now - referenceTime <= this.watchdogTimeoutMs) {
        continue;
      }
      entry.turnState = "idle";
      entry.runningSince = null;
      this.notify(entry, "turnState");
    }
  }

  private notify(
    entry: SessionRuntimeEntry,
    field: SessionRuntimeChangedField
  ): void {
    this.onStateChanged?.(entry.key, field, toSnapshot(entry));
  }
}
