import {
  SessionRuntime,
  type SessionRuntimeChangedField,
} from "./session-runtime";
import type { TaskTimerStorage } from "./task-timer-storage";
import type {
  SessionContinuityLockReason,
  SessionContinuityLockTransition,
  SessionKey,
  SessionSnapshot,
  SessionTaskTimerSnapshot,
  SessionTurnState,
} from "./workspace-runtime-types";
import type { WorkspaceStore } from "./workspace-store";

interface MutableTaskTimerState {
  runningAccumulates: boolean;
  runningSinceMs: number | null;
  totalSeconds: number;
}

interface WorkspaceRuntimeLockSyncDeps {
  readonly onWorkspaceChanged: (
    workspaceRoot: string,
    priority: boolean
  ) => void;
  readonly sessionRuntime?: SessionRuntime;
  readonly store: WorkspaceStore;
  readonly taskTimerStorageFactory: (workspaceRoot: string) => TaskTimerStorage;
}

export interface WorkspaceRuntimeTaskTimerSync {
  prepareWorkspaceSelection(workspaceRoot: string): void;
  readTaskTimers(
    workspaceRoot: string
  ): ReadonlyMap<string, SessionTaskTimerSnapshot>;
  updateTaskTimer(workspaceRoot: string, nodeId: string): void;
}

const isSessionBusyForTimer = (session: SessionSnapshot): boolean =>
  session.terminalLockReason !== "terminal_no_resume" &&
  (session.turnState === "running" ||
    session.continuityLockActive ||
    session.continuityLockTransition?.awaitingBootstrapTurn === true);

const isSessionAccumulativeForTimer = (session: SessionSnapshot): boolean =>
  session.resumeMode !== "no_resume" &&
  session.terminalLockReason !== "terminal_no_resume";

const isStaleRunningSession = (session: SessionSnapshot): boolean =>
  session.turnState === "running" &&
  session.finalTurnCompleted === true &&
  !session.continuityLockActive &&
  session.continuityLockTransition?.awaitingBootstrapTurn !== true;

const isPriorityField = (field: SessionRuntimeChangedField): boolean =>
  field === "turnState" ||
  field === "continuityLockActive" ||
  field === "continuityLockReason" ||
  field === "continuityLockTransition" ||
  field === "finalTurnCompleted";

export class WorkspaceRuntimeLockSync implements WorkspaceRuntimeTaskTimerSync {
  private readonly onWorkspaceChanged: (
    workspaceRoot: string,
    priority: boolean
  ) => void;
  private readonly sessionRuntime: SessionRuntime;
  private readonly store: WorkspaceStore;
  private readonly taskTimerStorageFactory: (
    workspaceRoot: string
  ) => TaskTimerStorage;
  private readonly seededTaskTimersByWorkspaceRoot = new Set<string>();
  private readonly taskTimersByWorkspaceRoot = new Map<
    string,
    Map<string, MutableTaskTimerState>
  >();
  private readonly taskTimerStoragesByWorkspaceRoot = new Map<
    string,
    TaskTimerStorage
  >();

  constructor(deps: WorkspaceRuntimeLockSyncDeps) {
    this.onWorkspaceChanged = deps.onWorkspaceChanged;
    this.store = deps.store;
    this.taskTimerStorageFactory = deps.taskTimerStorageFactory;
    this.sessionRuntime =
      deps.sessionRuntime ??
      new SessionRuntime({
        onStateChanged: (sessionKey, field, snapshot) => {
          this.store.updateSession(sessionKey, {
            nodeId: sessionKey.nodeId,
            turnState: snapshot.turnState,
            continuityLockActive: snapshot.continuityLockActive,
            continuityLockReason: snapshot.continuityLockReason ?? undefined,
            continuityLockTransition:
              snapshot.continuityLockTransition ?? undefined,
            finalTurnCompleted: snapshot.finalTurnCompleted,
            lastHeartbeatAt:
              snapshot.lastHeartbeatAt === null
                ? undefined
                : new Date(snapshot.lastHeartbeatAt).toISOString(),
          });
          this.updateTaskTimer(sessionKey.workspaceRoot, sessionKey.nodeId);
          this.onWorkspaceChanged(
            sessionKey.workspaceRoot,
            isPriorityField(field)
          );
        },
      });
  }

  notifyTurnStateChanged(
    sessionKey: SessionKey,
    state: SessionTurnState
  ): void {
    if (state === "running") {
      this.sessionRuntime.markRunning(sessionKey);
      return;
    }
    this.sessionRuntime.markIdle(sessionKey);
  }

  notifyLockChanged(
    sessionKey: SessionKey,
    options: {
      readonly active: boolean;
      readonly reason?: SessionContinuityLockReason | null;
      readonly transition?: SessionContinuityLockTransition | null;
    }
  ): void {
    this.sessionRuntime.setLock(sessionKey, options.active);
    if (options.reason !== undefined) {
      this.sessionRuntime.setLockReason(sessionKey, options.reason);
    }
    if (options.transition !== undefined) {
      this.sessionRuntime.setLockTransition(sessionKey, options.transition);
    }
  }

  notifyFinalTurnCompleted(
    sessionKey: SessionKey,
    finalTurnCompleted: boolean
  ): void {
    this.sessionRuntime.setFinalTurnCompleted(sessionKey, finalTurnCompleted);
  }

  recordHeartbeat(sessionKey: SessionKey): void {
    this.sessionRuntime.recordHeartbeat(sessionKey);
  }

  prepareWorkspaceSelection(workspaceRoot: string): void {
    this.normalizeStaleRunningSessions(workspaceRoot);
    this.seedTaskTimers(workspaceRoot);
  }

  readTaskTimers(
    workspaceRoot: string
  ): ReadonlyMap<string, SessionTaskTimerSnapshot> {
    return this.taskTimersByWorkspaceRoot.get(workspaceRoot) ?? new Map();
  }

  updateTaskTimer(workspaceRoot: string, nodeId: string): void {
    const state = this.store.getOrCreate(workspaceRoot);
    const timers =
      this.taskTimersByWorkspaceRoot.get(workspaceRoot) ?? new Map();
    if (!this.taskTimersByWorkspaceRoot.has(workspaceRoot)) {
      this.taskTimersByWorkspaceRoot.set(workspaceRoot, timers);
    }
    const busySessions = Array.from(state.sessions.values())
      .filter((session) => session.nodeId === nodeId)
      .filter(isSessionBusyForTimer);
    const timer = timers.get(nodeId) ?? {
      totalSeconds: 0,
      runningSinceMs: null,
      runningAccumulates: false,
    };
    if (busySessions.length > 0) {
      if (timer.runningSinceMs === null) {
        timer.runningSinceMs = Date.now();
      }
      if (busySessions.some(isSessionAccumulativeForTimer)) {
        timer.runningAccumulates = true;
      }
      timers.set(nodeId, timer);
      return;
    }
    if (timer.runningSinceMs === null) {
      timer.runningAccumulates = false;
      timers.set(nodeId, timer);
      return;
    }
    this.commitRunningTaskTimer(timer);
    timers.set(nodeId, timer);
  }

  dispose(): void {
    this.persistTaskTimers();
    this.sessionRuntime.dispose();
  }

  private getOrCreateStorage(workspaceRoot: string): TaskTimerStorage {
    let storage = this.taskTimerStoragesByWorkspaceRoot.get(workspaceRoot);
    if (!storage) {
      storage = this.taskTimerStorageFactory(workspaceRoot);
      this.taskTimerStoragesByWorkspaceRoot.set(workspaceRoot, storage);
    }
    return storage;
  }

  private seedTaskTimers(workspaceRoot: string): void {
    if (this.seededTaskTimersByWorkspaceRoot.has(workspaceRoot)) {
      return;
    }
    const timers =
      this.taskTimersByWorkspaceRoot.get(workspaceRoot) ?? new Map();
    for (const [nodeId, totalSeconds] of Object.entries(
      this.getOrCreateStorage(workspaceRoot).load()
    )) {
      if (typeof totalSeconds !== "number" || !Number.isFinite(totalSeconds)) {
        continue;
      }
      const clamped = Math.max(0, Math.floor(totalSeconds));
      if (clamped <= 0) {
        continue;
      }
      const existing = timers.get(nodeId);
      if (existing) {
        existing.totalSeconds += clamped;
        continue;
      }
      timers.set(nodeId, {
        totalSeconds: clamped,
        runningSinceMs: null,
        runningAccumulates: false,
      });
    }
    if (timers.size > 0) {
      this.taskTimersByWorkspaceRoot.set(workspaceRoot, timers);
    }
    this.seededTaskTimersByWorkspaceRoot.add(workspaceRoot);
  }

  private normalizeStaleRunningSessions(workspaceRoot: string): void {
    const state = this.store.get(workspaceRoot);
    if (!state) {
      return;
    }
    for (const [sessionId, session] of state.sessions) {
      if (!isStaleRunningSession(session)) {
        continue;
      }
      this.store.updateSession(
        {
          workspaceRoot,
          nodeId: session.nodeId,
          sessionId,
        },
        {
          turnState: "idle",
        }
      );
    }
  }

  private persistTaskTimers(): void {
    for (const [workspaceRoot, timers] of this.taskTimersByWorkspaceRoot) {
      const totals: Record<string, number> = {};
      for (const [nodeId, timer] of timers) {
        this.commitRunningTaskTimer(timer);
        const normalizedTotal = Math.max(0, Math.floor(timer.totalSeconds));
        if (normalizedTotal > 0) {
          totals[nodeId] = normalizedTotal;
        }
      }
      if (Object.keys(totals).length > 0) {
        this.getOrCreateStorage(workspaceRoot).save(totals);
      }
    }
  }

  private commitRunningTaskTimer(timer: MutableTaskTimerState): void {
    if (timer.runningSinceMs === null) {
      return;
    }
    const deltaSeconds = Math.max(
      0,
      Math.floor((Date.now() - timer.runningSinceMs) / 1000)
    );
    if (timer.runningAccumulates) {
      timer.totalSeconds =
        Math.max(0, Math.floor(timer.totalSeconds)) + deltaSeconds;
    }
    timer.runningSinceMs = null;
    timer.runningAccumulates = false;
  }
}
