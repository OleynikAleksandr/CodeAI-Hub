import { randomUUID } from "node:crypto";
import { SessionRuntime } from "./session-runtime";
import { TaskTimerStorage } from "./task-timer-storage";
import type {
  ArtifactPointer,
  NodeKey,
  SessionBindingStatus,
  SessionContinuityLockReason,
  SessionContinuityLockTransition,
  SessionKey,
  SessionSnapshot,
  SessionTaskTimerSnapshot,
  SessionTurnState,
  WorkspaceSnapshot,
} from "./workspace-runtime-types";
import { buildSnapshot } from "./workspace-snapshot-builder";
import { WorkspaceStore } from "./workspace-store";
import type {
  WorkspaceSelectAckPayload,
  WorkspaceSelectPayload,
  WorkspaceSnapshotPush,
  WorkspaceSnapshotPushPayload,
} from "./workspace-wire-types";

interface WorkspaceRuntimeFacadeDeps {
  readonly hydrateWorkspaceSessions?: (workspaceRoot: string) => readonly {
    bindingStatus?: SessionBindingStatus;
    nodeId: string;
    providerId?: string;
    providerSessionId?: string | null;
    sessionId: string;
  }[];
  readonly nowIso?: () => string;
  readonly selectionIdFactory?: () => string;
  readonly sessionRuntime?: SessionRuntime;
  readonly snapshotDebounceMs?: number;
  readonly store?: WorkspaceStore;
  readonly taskTimerStorageFactory?: (
    workspaceRoot: string
  ) => TaskTimerStorage;
}

interface ClientSelection {
  selectionId: string | null;
  sequence: number;
  workspaceRoot: string | null;
}

interface MutableTaskTimerState {
  runningAccumulates: boolean;
  runningSinceMs: number | null;
  totalSeconds: number;
}

type NotifySessionPatch = Partial<
  Pick<
    SessionSnapshot,
    | "nodeId"
    | "providerId"
    | "providerSessionId"
    | "bindingStatus"
    | "turnState"
    | "continuityLockActive"
    | "continuityLockReason"
    | "continuityLockTransition"
    | "resumeMode"
    | "finalTurnCompleted"
    | "terminalLockReason"
    | "lastHeartbeatAt"
  >
>;

type SessionSnapshotPatch = Partial<{
  -readonly [Key in keyof SessionSnapshot]: SessionSnapshot[Key];
}>;

const DEFAULT_SNAPSHOT_DEBOUNCE_MS = 50;

const fallbackSelectionIdFactory = (): string => {
  try {
    return randomUUID();
  } catch {
    return `selection-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

const isSessionBusyForTimer = (session: SessionSnapshot): boolean => {
  if (session.terminalLockReason === "terminal_no_resume") {
    return false;
  }
  if (session.turnState === "running") {
    return true;
  }
  if (session.continuityLockActive) {
    return true;
  }
  return session.continuityLockTransition?.awaitingBootstrapTurn === true;
};

const isSessionAccumulativeForTimer = (session: SessionSnapshot): boolean => {
  if (session.resumeMode === "no_resume") {
    return false;
  }
  return session.terminalLockReason !== "terminal_no_resume";
};

const isStaleRunningSession = (session: SessionSnapshot): boolean => {
  if (session.turnState !== "running") {
    return false;
  }
  if (session.finalTurnCompleted !== true) {
    return false;
  }
  if (session.continuityLockActive) {
    return false;
  }
  return session.continuityLockTransition?.awaitingBootstrapTurn !== true;
};

export class WorkspaceRuntimeFacade {
  private readonly store: WorkspaceStore;
  private readonly sessionRuntime: SessionRuntime;
  private readonly taskTimerStorageFactory: (
    workspaceRoot: string
  ) => TaskTimerStorage;
  private readonly snapshotDebounceMs: number;
  private readonly selectionIdFactory: () => string;
  private readonly nowIso: () => string;
  private readonly hydrateWorkspaceSessions;
  private readonly selectionByClientId = new Map<string, ClientSelection>();
  private readonly subscriberByClientId = new Map<
    string,
    (message: WorkspaceSnapshotPush) => void
  >();
  private readonly snapshotTimers = new Map<string, NodeJS.Timeout>();
  private readonly taskTimersByWorkspaceRoot = new Map<
    string,
    Map<string, MutableTaskTimerState>
  >();
  private readonly seededTaskTimersByWorkspaceRoot = new Set<string>();
  private readonly taskTimerStoragesByWorkspaceRoot = new Map<
    string,
    TaskTimerStorage
  >();

  constructor(deps: WorkspaceRuntimeFacadeDeps = {}) {
    this.store = deps.store ?? new WorkspaceStore();
    this.taskTimerStorageFactory =
      deps.taskTimerStorageFactory ?? ((root) => new TaskTimerStorage(root));
    TaskTimerStorage.cleanupLegacy();
    this.snapshotDebounceMs =
      deps.snapshotDebounceMs ?? DEFAULT_SNAPSHOT_DEBOUNCE_MS;
    this.selectionIdFactory =
      deps.selectionIdFactory ?? fallbackSelectionIdFactory;
    this.nowIso = deps.nowIso ?? (() => new Date().toISOString());
    this.hydrateWorkspaceSessions = deps.hydrateWorkspaceSessions;

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
          const priority =
            field === "turnState" ||
            field === "continuityLockActive" ||
            field === "continuityLockReason" ||
            field === "continuityLockTransition" ||
            field === "finalTurnCompleted";
          this.scheduleSnapshot(sessionKey.workspaceRoot, priority);
        },
      });
  }

  select(params: {
    readonly clientId: string;
    readonly request: WorkspaceSelectPayload;
  }): WorkspaceSelectAckPayload {
    const { clientId, request } = params;
    const reject = (error: string): WorkspaceSelectAckPayload => ({
      requestId: request.requestId,
      status: "rejected",
      workspaceRoot: null,
      selectionId: null,
      error,
    });

    if (
      request.reason === "workspace_cleared" &&
      request.workspaceRoot !== null
    ) {
      return reject("workspaceRoot must be null for workspace_cleared");
    }

    if (
      request.workspaceRoot !== null &&
      request.workspaceRoot.trim().length === 0
    ) {
      return reject("workspaceRoot must be non-empty");
    }

    if (request.workspaceRoot === null) {
      this.selectionByClientId.set(clientId, {
        workspaceRoot: null,
        selectionId: null,
        sequence: 0,
      });
      return {
        requestId: request.requestId,
        status: "applied",
        workspaceRoot: null,
        selectionId: null,
        error: null,
      };
    }

    const workspaceRoot = request.workspaceRoot;
    const selectionId = this.selectionIdFactory();

    this.store.setLoadState(workspaceRoot, "ready");
    const hydrateRows = this.hydrateWorkspaceSessions?.(workspaceRoot) ?? [];
    for (const row of hydrateRows) {
      this.store.updateSession(
        {
          workspaceRoot,
          nodeId: row.nodeId,
          sessionId: row.sessionId,
        },
        {
          nodeId: row.nodeId,
          providerId: row.providerId,
          providerSessionId: row.providerSessionId ?? undefined,
          bindingStatus: row.bindingStatus,
        }
      );
    }
    this.normalizeStaleRunningSessions(workspaceRoot);
    this.seedTaskTimers(workspaceRoot);
    this.selectionByClientId.set(clientId, {
      workspaceRoot,
      selectionId,
      sequence: 0,
    });

    this.flushWorkspaceSnapshot(workspaceRoot, true);

    return {
      requestId: request.requestId,
      status: "applied",
      workspaceRoot,
      selectionId,
      error: null,
    };
  }

  getSnapshot(workspaceRoot: string): WorkspaceSnapshot {
    const state = this.store.getOrCreate(workspaceRoot);
    return buildSnapshot(
      workspaceRoot,
      state,
      this.readTaskTimers(workspaceRoot)
    );
  }

  subscribe(
    clientId: string,
    callback: (message: WorkspaceSnapshotPush) => void
  ): () => void {
    this.subscriberByClientId.set(clientId, callback);
    return () => {
      this.subscriberByClientId.delete(clientId);
      this.selectionByClientId.delete(clientId);
    };
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

  notifySessionCreated(
    sessionKey: SessionKey,
    patch: NotifySessionPatch = {}
  ): void {
    const hasOwn = (key: keyof NotifySessionPatch): boolean =>
      Object.hasOwn(patch, key);
    const update: SessionSnapshotPatch = {
      nodeId: patch.nodeId ?? sessionKey.nodeId,
    };
    if (hasOwn("providerId")) {
      update.providerId = patch.providerId;
    }
    if (hasOwn("providerSessionId")) {
      update.providerSessionId = patch.providerSessionId;
    }
    if (hasOwn("bindingStatus")) {
      update.bindingStatus = patch.bindingStatus;
    }
    if (hasOwn("turnState")) {
      update.turnState = patch.turnState;
    }
    if (hasOwn("continuityLockActive")) {
      update.continuityLockActive = patch.continuityLockActive;
    }
    if (hasOwn("continuityLockReason")) {
      update.continuityLockReason = patch.continuityLockReason;
    }
    if (hasOwn("continuityLockTransition")) {
      update.continuityLockTransition = patch.continuityLockTransition;
    }
    if (hasOwn("resumeMode")) {
      update.resumeMode = patch.resumeMode;
    }
    if (hasOwn("finalTurnCompleted")) {
      update.finalTurnCompleted = patch.finalTurnCompleted;
    }
    if (hasOwn("terminalLockReason")) {
      update.terminalLockReason = patch.terminalLockReason;
    }
    if (hasOwn("lastHeartbeatAt")) {
      update.lastHeartbeatAt = patch.lastHeartbeatAt;
    }
    this.store.updateSession(sessionKey, update);
    this.updateTaskTimer(sessionKey.workspaceRoot, sessionKey.nodeId);
    this.scheduleSnapshot(sessionKey.workspaceRoot, false);
  }

  notifyBindingChanged(
    sessionKey: SessionKey,
    patch: {
      readonly providerSessionId?: string | null;
      readonly bindingStatus?: SessionBindingStatus;
      readonly providerId?: string;
    }
  ): void {
    const update: SessionSnapshotPatch = { nodeId: sessionKey.nodeId };
    if (Object.hasOwn(patch, "providerSessionId")) {
      update.providerSessionId = patch.providerSessionId ?? undefined;
    }
    if (Object.hasOwn(patch, "bindingStatus")) {
      update.bindingStatus = patch.bindingStatus;
    }
    if (Object.hasOwn(patch, "providerId")) {
      update.providerId = patch.providerId;
    }
    this.store.updateSession(sessionKey, update);
    this.updateTaskTimer(sessionKey.workspaceRoot, sessionKey.nodeId);
    this.scheduleSnapshot(sessionKey.workspaceRoot, false);
  }

  notifySessionDeleted(sessionKey: SessionKey): void {
    this.store.removeSession(sessionKey);
    this.updateTaskTimer(sessionKey.workspaceRoot, sessionKey.nodeId);
    this.scheduleSnapshot(sessionKey.workspaceRoot, false);
  }

  notifyArtifactWritten(
    nodeKey: NodeKey,
    artifactId: string,
    pointer: ArtifactPointer
  ): void {
    this.store.updateArtifact(nodeKey, artifactId, pointer);
    this.scheduleSnapshot(nodeKey.workspaceRoot, false);
  }

  recordHeartbeat(sessionKey: SessionKey): void {
    this.sessionRuntime.recordHeartbeat(sessionKey);
  }

  requestSnapshot(clientId: string): WorkspaceSnapshotPush | null {
    const selection = this.selectionByClientId.get(clientId);
    if (!(selection?.workspaceRoot && selection.selectionId)) {
      return null;
    }
    const state = this.store.getOrCreate(selection.workspaceRoot);
    const snapshot = buildSnapshot(
      selection.workspaceRoot,
      state,
      this.readTaskTimers(selection.workspaceRoot)
    );
    selection.sequence += 1;
    return {
      type: "workspace:snapshot",
      payload: {
        workspaceRoot: selection.workspaceRoot,
        selectionId: selection.selectionId,
        sequence: selection.sequence,
        generatedAt: this.nowIso(),
        snapshot,
      },
    };
  }

  dispose(): void {
    this.persistTaskTimers();
    this.sessionRuntime.dispose();
    for (const timer of this.snapshotTimers.values()) {
      clearTimeout(timer);
    }
    this.snapshotTimers.clear();
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

    const totals = this.getOrCreateStorage(workspaceRoot).load();
    const entries = Object.entries(totals);
    const timers =
      this.taskTimersByWorkspaceRoot.get(workspaceRoot) ??
      new Map<string, MutableTaskTimerState>();
    for (const [nodeId, totalSeconds] of entries) {
      if (typeof totalSeconds !== "number" || !Number.isFinite(totalSeconds)) {
        continue;
      }
      const clamped = Math.max(0, Math.floor(totalSeconds));
      if (clamped <= 0) {
        continue;
      }
      const existing = timers.get(nodeId);
      if (existing) {
        existing.totalSeconds =
          Math.max(0, Math.floor(existing.totalSeconds)) + clamped;
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
    if (this.taskTimersByWorkspaceRoot.size === 0) {
      return;
    }

    for (const [workspaceRoot, timers] of this.taskTimersByWorkspaceRoot) {
      const totals = this.serializeTaskTimerTotals(timers);
      if (Object.keys(totals).length === 0) {
        continue;
      }
      this.getOrCreateStorage(workspaceRoot).save(totals);
    }
  }

  private serializeTaskTimerTotals(
    timers: Map<string, MutableTaskTimerState>
  ): Record<string, number> {
    const totals: Record<string, number> = {};

    for (const [nodeId, timer] of timers) {
      this.commitRunningTaskTimer(timer);
      const normalizedTotal = Math.max(0, Math.floor(timer.totalSeconds));
      if (normalizedTotal > 0) {
        totals[nodeId] = normalizedTotal;
      }
    }

    return totals;
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

  private scheduleSnapshot(workspaceRoot: string, priority: boolean): void {
    if (priority) {
      this.flushWorkspaceSnapshot(workspaceRoot, false);
      return;
    }

    const existing = this.snapshotTimers.get(workspaceRoot);
    if (existing) {
      return;
    }

    const timer = setTimeout(() => {
      this.snapshotTimers.delete(workspaceRoot);
      this.flushWorkspaceSnapshot(workspaceRoot, false);
    }, this.snapshotDebounceMs);
    timer.unref?.();
    this.snapshotTimers.set(workspaceRoot, timer);
  }

  private flushWorkspaceSnapshot(workspaceRoot: string, force: boolean): void {
    const timer = this.snapshotTimers.get(workspaceRoot);
    if (timer) {
      clearTimeout(timer);
      this.snapshotTimers.delete(workspaceRoot);
    }

    const shouldPush = force || this.store.consumeDirty(workspaceRoot);
    if (!shouldPush) {
      return;
    }

    const state = this.store.getOrCreate(workspaceRoot);
    const snapshot = buildSnapshot(
      workspaceRoot,
      state,
      this.readTaskTimers(workspaceRoot)
    );

    for (const [clientId, selection] of this.selectionByClientId.entries()) {
      if (selection.workspaceRoot !== workspaceRoot || !selection.selectionId) {
        continue;
      }
      const callback = this.subscriberByClientId.get(clientId);
      if (!callback) {
        continue;
      }
      selection.sequence += 1;
      const payload: WorkspaceSnapshotPushPayload = {
        workspaceRoot,
        selectionId: selection.selectionId,
        sequence: selection.sequence,
        generatedAt: this.nowIso(),
        snapshot,
      };
      callback({
        type: "workspace:snapshot",
        payload,
      });
    }
  }

  private readTaskTimers(
    workspaceRoot: string
  ): ReadonlyMap<string, SessionTaskTimerSnapshot> {
    const timers = this.taskTimersByWorkspaceRoot.get(workspaceRoot);
    return timers ?? new Map<string, SessionTaskTimerSnapshot>();
  }

  private updateTaskTimer(workspaceRoot: string, nodeId: string): void {
    const state = this.store.getOrCreate(workspaceRoot);
    const timers =
      this.taskTimersByWorkspaceRoot.get(workspaceRoot) ??
      new Map<string, MutableTaskTimerState>();
    if (!this.taskTimersByWorkspaceRoot.has(workspaceRoot)) {
      this.taskTimersByWorkspaceRoot.set(workspaceRoot, timers);
    }

    const nodeSessions = Array.from(state.sessions.values()).filter(
      (session) => session.nodeId === nodeId
    );
    const busySessions = nodeSessions.filter(isSessionBusyForTimer);
    const busy = busySessions.length > 0;
    const accumulative = busySessions.some(isSessionAccumulativeForTimer);

    const timer = timers.get(nodeId) ?? {
      totalSeconds: 0,
      runningSinceMs: null,
      runningAccumulates: false,
    };
    if (busy) {
      if (timer.runningSinceMs === null) {
        timer.runningSinceMs = Date.now();
        timer.runningAccumulates = accumulative;
        timers.set(nodeId, timer);
      } else if (accumulative && !timer.runningAccumulates) {
        timer.runningAccumulates = true;
        timers.set(nodeId, timer);
      }
      return;
    }

    if (timer.runningSinceMs === null) {
      timer.runningAccumulates = false;
      timers.set(nodeId, timer);
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
    timers.set(nodeId, timer);
  }
}
