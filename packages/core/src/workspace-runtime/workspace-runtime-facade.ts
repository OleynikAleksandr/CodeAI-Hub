import { randomUUID } from "node:crypto";
import { SessionRuntime } from "./session-runtime";
import type {
  ArtifactPointer,
  NodeKey,
  SessionBindingStatus,
  SessionKey,
  SessionSnapshot,
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

type WorkspaceRuntimeFacadeDeps = {
  readonly snapshotDebounceMs?: number;
  readonly selectionIdFactory?: () => string;
  readonly nowIso?: () => string;
  readonly store?: WorkspaceStore;
  readonly sessionRuntime?: SessionRuntime;
};

type ClientSelection = {
  workspaceRoot: string | null;
  selectionId: string | null;
  sequence: number;
};

type NotifySessionPatch = Partial<
  Pick<
    SessionSnapshot,
    | "nodeId"
    | "providerId"
    | "providerSessionId"
    | "bindingStatus"
    | "turnState"
    | "continuityLockActive"
    | "lastHeartbeatAt"
  >
>;

const DEFAULT_SNAPSHOT_DEBOUNCE_MS = 50;

const fallbackSelectionIdFactory = (): string => {
  try {
    return randomUUID();
  } catch {
    return `selection-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

export class WorkspaceRuntimeFacade {
  private readonly store: WorkspaceStore;
  private readonly sessionRuntime: SessionRuntime;
  private readonly snapshotDebounceMs: number;
  private readonly selectionIdFactory: () => string;
  private readonly nowIso: () => string;
  private readonly selectionByClientId = new Map<string, ClientSelection>();
  private readonly subscriberByClientId = new Map<
    string,
    (message: WorkspaceSnapshotPush) => void
  >();
  private readonly snapshotTimers = new Map<string, NodeJS.Timeout>();

  constructor(deps: WorkspaceRuntimeFacadeDeps = {}) {
    this.store = deps.store ?? new WorkspaceStore();
    this.snapshotDebounceMs =
      deps.snapshotDebounceMs ?? DEFAULT_SNAPSHOT_DEBOUNCE_MS;
    this.selectionIdFactory =
      deps.selectionIdFactory ?? fallbackSelectionIdFactory;
    this.nowIso = deps.nowIso ?? (() => new Date().toISOString());

    this.sessionRuntime =
      deps.sessionRuntime ??
      new SessionRuntime({
        onStateChanged: (sessionKey, field, snapshot) => {
          this.store.updateSession(sessionKey, {
            nodeId: sessionKey.nodeId,
            turnState: snapshot.turnState,
            continuityLockActive: snapshot.continuityLockActive,
            lastHeartbeatAt:
              snapshot.lastHeartbeatAt === null
                ? undefined
                : new Date(snapshot.lastHeartbeatAt).toISOString(),
          });
          const priority =
            field === "turnState" || field === "continuityLockActive";
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

    this.store.getOrCreate(workspaceRoot);
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
    return buildSnapshot(workspaceRoot, state);
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

  notifyLockChanged(sessionKey: SessionKey, active: boolean): void {
    this.sessionRuntime.setLock(sessionKey, active);
  }

  notifySessionCreated(
    sessionKey: SessionKey,
    patch: NotifySessionPatch = {}
  ): void {
    this.store.updateSession(sessionKey, {
      nodeId: patch.nodeId ?? sessionKey.nodeId,
      providerId: patch.providerId,
      providerSessionId: patch.providerSessionId,
      bindingStatus: patch.bindingStatus,
      turnState: patch.turnState,
      continuityLockActive: patch.continuityLockActive,
      lastHeartbeatAt: patch.lastHeartbeatAt,
    });
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
    this.store.updateSession(sessionKey, {
      nodeId: sessionKey.nodeId,
      providerSessionId: patch.providerSessionId ?? undefined,
      bindingStatus: patch.bindingStatus,
      providerId: patch.providerId,
    });
    this.scheduleSnapshot(sessionKey.workspaceRoot, false);
  }

  notifySessionDeleted(sessionKey: SessionKey): void {
    this.store.removeSession(sessionKey);
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

  dispose(): void {
    this.sessionRuntime.dispose();
    for (const timer of this.snapshotTimers.values()) {
      clearTimeout(timer);
    }
    this.snapshotTimers.clear();
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
    const snapshot = buildSnapshot(workspaceRoot, state);

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
}
