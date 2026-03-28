import { randomUUID } from "node:crypto";
import type { SessionRuntime } from "./session-runtime";
import { TaskTimerStorage } from "./task-timer-storage";
import { WorkspaceRuntimeLockSync } from "./workspace-runtime-lock-sync";
import { WorkspaceRuntimeSessionSync } from "./workspace-runtime-session-sync";
import type {
  ArtifactPointer,
  NodeKey,
  SessionBindingStatus,
  SessionContinuityLockReason,
  SessionContinuityLockTransition,
  SessionKey,
  SessionSnapshot,
  SessionTurnState,
  WorkspaceSnapshot,
} from "./workspace-runtime-types";
import { WorkspaceStore } from "./workspace-store";
import type {
  WorkspaceSelectAckPayload,
  WorkspaceSelectPayload,
  WorkspaceSnapshotPush,
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
type WorkspaceSnapshotSubscriber = (message: WorkspaceSnapshotPush) => void;
const DEFAULT_SNAPSHOT_DEBOUNCE_MS = 50;

const fallbackSelectionIdFactory = (): string => {
  try {
    return randomUUID();
  } catch {
    return `selection-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};
export class WorkspaceRuntimeFacade {
  private readonly lockSync: WorkspaceRuntimeLockSync;
  private readonly nowIso: () => string;
  private readonly selectionByClientId = new Map<string, ClientSelection>();
  private readonly selectionIdFactory: () => string;
  private readonly sessionSync: WorkspaceRuntimeSessionSync;
  private readonly snapshotDebounceMs: number;
  private readonly snapshotTimers = new Map<string, NodeJS.Timeout>();
  private readonly subscriberByClientId = new Map<
    string,
    WorkspaceSnapshotSubscriber
  >();

  constructor(deps: WorkspaceRuntimeFacadeDeps = {}) {
    const store = deps.store ?? new WorkspaceStore();
    const taskTimerStorageFactory =
      deps.taskTimerStorageFactory ?? ((root) => new TaskTimerStorage(root));
    TaskTimerStorage.cleanupLegacy();

    this.nowIso = deps.nowIso ?? (() => new Date().toISOString());
    this.selectionIdFactory =
      deps.selectionIdFactory ?? fallbackSelectionIdFactory;
    this.snapshotDebounceMs =
      deps.snapshotDebounceMs ?? DEFAULT_SNAPSHOT_DEBOUNCE_MS;

    this.lockSync = new WorkspaceRuntimeLockSync({
      onWorkspaceChanged: (workspaceRoot, priority) => {
        this.scheduleSnapshot(workspaceRoot, priority);
      },
      sessionRuntime: deps.sessionRuntime,
      store,
      taskTimerStorageFactory,
    });
    this.sessionSync = new WorkspaceRuntimeSessionSync({
      hydrateWorkspaceSessions: deps.hydrateWorkspaceSessions,
      onWorkspaceChanged: (workspaceRoot) => {
        this.scheduleSnapshot(workspaceRoot, false);
      },
      store,
      taskTimerSync: this.lockSync,
    });
  }

  select(params: {
    readonly clientId: string;
    readonly request: WorkspaceSelectPayload;
  }): WorkspaceSelectAckPayload {
    if (
      params.request.reason === "workspace_cleared" &&
      params.request.workspaceRoot !== null
    ) {
      return {
        requestId: params.request.requestId,
        status: "rejected",
        workspaceRoot: null,
        selectionId: null,
        error: "workspaceRoot must be null for workspace_cleared",
      };
    }
    if (
      params.request.workspaceRoot !== null &&
      params.request.workspaceRoot.trim().length === 0
    ) {
      return {
        requestId: params.request.requestId,
        status: "rejected",
        workspaceRoot: null,
        selectionId: null,
        error: "workspaceRoot must be non-empty",
      };
    }
    if (params.request.workspaceRoot === null) {
      this.selectionByClientId.set(params.clientId, {
        workspaceRoot: null,
        selectionId: null,
        sequence: 0,
      });
      return {
        requestId: params.request.requestId,
        status: "applied",
        workspaceRoot: null,
        selectionId: null,
        error: null,
      };
    }
    const workspaceRoot = params.request.workspaceRoot;
    this.sessionSync.hydrateWorkspaceSelection(workspaceRoot);
    this.selectionByClientId.set(params.clientId, {
      workspaceRoot,
      selectionId: this.selectionIdFactory(),
      sequence: 0,
    });
    this.flushWorkspaceSnapshot(workspaceRoot, true);
    return {
      requestId: params.request.requestId,
      status: "applied",
      workspaceRoot,
      selectionId:
        this.selectionByClientId.get(params.clientId)?.selectionId ?? null,
      error: null,
    };
  }

  getSnapshot(workspaceRoot: string): WorkspaceSnapshot {
    return this.sessionSync.getSnapshot(workspaceRoot);
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
    this.lockSync.notifyTurnStateChanged(sessionKey, state);
  }
  notifyLockChanged(
    sessionKey: SessionKey,
    options: {
      readonly active: boolean;
      readonly reason?: SessionContinuityLockReason | null;
      readonly transition?: SessionContinuityLockTransition | null;
    }
  ): void {
    this.lockSync.notifyLockChanged(sessionKey, options);
  }
  notifyFinalTurnCompleted(
    sessionKey: SessionKey,
    finalTurnCompleted: boolean
  ): void {
    this.lockSync.notifyFinalTurnCompleted(sessionKey, finalTurnCompleted);
  }
  notifySessionCreated(
    sessionKey: SessionKey,
    patch: Partial<SessionSnapshot> = {}
  ): void {
    this.sessionSync.notifySessionCreated(sessionKey, patch);
  }
  notifyBindingChanged(
    sessionKey: SessionKey,
    patch: {
      readonly providerSessionId?: string | null;
      readonly bindingStatus?: SessionBindingStatus;
      readonly providerId?: string;
    }
  ): void {
    this.sessionSync.notifyBindingChanged(sessionKey, patch);
  }
  notifySessionDeleted(sessionKey: SessionKey): void {
    this.sessionSync.notifySessionDeleted(sessionKey);
  }
  notifyArtifactWritten(
    nodeKey: NodeKey,
    artifactId: string,
    pointer: ArtifactPointer
  ): void {
    this.sessionSync.notifyArtifactWritten(nodeKey, artifactId, pointer);
  }
  recordHeartbeat(sessionKey: SessionKey): void {
    this.lockSync.recordHeartbeat(sessionKey);
  }
  requestSnapshot(clientId: string): WorkspaceSnapshotPush | null {
    const selection = this.selectionByClientId.get(clientId);
    if (!(selection?.workspaceRoot && selection.selectionId)) {
      return null;
    }
    selection.sequence += 1;
    return this.createSnapshotPush(selection.workspaceRoot, selection);
  }
  dispose(): void {
    for (const timer of this.snapshotTimers.values()) {
      clearTimeout(timer);
    }
    this.snapshotTimers.clear();
    this.lockSync.dispose();
  }

  private scheduleSnapshot(workspaceRoot: string, priority: boolean): void {
    if (priority) {
      this.flushWorkspaceSnapshot(workspaceRoot, false);
      return;
    }
    if (this.snapshotTimers.has(workspaceRoot)) {
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
    if (!(force || this.sessionSync.consumeDirty(workspaceRoot))) {
      return;
    }
    const snapshot = this.getSnapshot(workspaceRoot);
    for (const [clientId, selection] of this.selectionByClientId) {
      if (selection.workspaceRoot !== workspaceRoot || !selection.selectionId) {
        continue;
      }
      const callback = this.subscriberByClientId.get(clientId);
      if (!callback) {
        continue;
      }
      selection.sequence += 1;
      callback(this.createSnapshotPush(workspaceRoot, selection, snapshot));
    }
  }

  private createSnapshotPush(
    workspaceRoot: string,
    selection: ClientSelection,
    snapshot?: WorkspaceSnapshot
  ): WorkspaceSnapshotPush {
    return {
      type: "workspace:snapshot",
      payload: this.sessionSync.createSnapshotPayload({
        generatedAt: this.nowIso(),
        selectionId: selection.selectionId ?? "",
        sequence: selection.sequence,
        snapshot,
        workspaceRoot,
      }),
    };
  }
}
