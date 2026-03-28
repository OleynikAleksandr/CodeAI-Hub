import type { WorkspaceRuntimeTaskTimerSync } from "./workspace-runtime-lock-sync";
import type {
  ArtifactPointer,
  NodeKey,
  SessionBindingStatus,
  SessionKey,
  SessionSnapshot,
  WorkspaceSnapshot,
} from "./workspace-runtime-types";
import { buildSnapshot } from "./workspace-snapshot-builder";
import type { WorkspaceStore } from "./workspace-store";
import type { WorkspaceSnapshotPushPayload } from "./workspace-wire-types";

type SessionSnapshotPatch = {
  -readonly [Key in keyof SessionSnapshot]?: SessionSnapshot[Key];
};

interface WorkspaceRuntimeSessionSyncDeps {
  readonly hydrateWorkspaceSessions?: (workspaceRoot: string) => readonly {
    bindingStatus?: SessionBindingStatus;
    nodeId: string;
    providerId?: string;
    providerSessionId?: string | null;
    sessionId: string;
  }[];
  readonly onWorkspaceChanged?: (workspaceRoot: string) => void;
  readonly store: WorkspaceStore;
  readonly taskTimerSync: WorkspaceRuntimeTaskTimerSync;
}

const hasOwn = (value: object, key: PropertyKey): boolean =>
  Object.hasOwn(value, key);

const assignPatchedField = <Key extends keyof SessionSnapshotPatch>(
  target: SessionSnapshotPatch,
  patch: Partial<SessionSnapshot>,
  key: Key
): void => {
  if (hasOwn(patch, key)) {
    target[key] = patch[key] as SessionSnapshotPatch[Key];
  }
};

export class WorkspaceRuntimeSessionSync {
  private readonly hydrateWorkspaceSessions;
  private readonly onWorkspaceChanged?: (workspaceRoot: string) => void;
  private readonly store: WorkspaceStore;
  private readonly taskTimerSync: WorkspaceRuntimeTaskTimerSync;

  constructor(deps: WorkspaceRuntimeSessionSyncDeps) {
    this.hydrateWorkspaceSessions = deps.hydrateWorkspaceSessions;
    this.onWorkspaceChanged = deps.onWorkspaceChanged;
    this.store = deps.store;
    this.taskTimerSync = deps.taskTimerSync;
  }

  hydrateWorkspaceSelection(workspaceRoot: string): void {
    this.store.setLoadState(workspaceRoot, "ready");
    for (const row of this.hydrateWorkspaceSessions?.(workspaceRoot) ?? []) {
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
    this.taskTimerSync.prepareWorkspaceSelection(workspaceRoot);
  }

  getSnapshot(workspaceRoot: string): WorkspaceSnapshot {
    return buildSnapshot(
      workspaceRoot,
      this.store.getOrCreate(workspaceRoot),
      this.taskTimerSync.readTaskTimers(workspaceRoot)
    );
  }

  createSnapshotPayload(params: {
    readonly generatedAt: string;
    readonly selectionId: string;
    readonly sequence: number;
    readonly snapshot?: WorkspaceSnapshot;
    readonly workspaceRoot: string;
  }): WorkspaceSnapshotPushPayload {
    return {
      workspaceRoot: params.workspaceRoot,
      selectionId: params.selectionId,
      sequence: params.sequence,
      generatedAt: params.generatedAt,
      snapshot: params.snapshot ?? this.getSnapshot(params.workspaceRoot),
    };
  }

  consumeDirty(workspaceRoot: string): boolean {
    return this.store.consumeDirty(workspaceRoot);
  }

  notifySessionCreated(
    sessionKey: SessionKey,
    patch: Partial<SessionSnapshot> = {}
  ): void {
    const update: SessionSnapshotPatch = {
      nodeId: patch.nodeId ?? sessionKey.nodeId,
    };
    for (const key of [
      "providerId",
      "providerSessionId",
      "bindingStatus",
      "turnState",
      "continuityLockActive",
      "continuityLockReason",
      "continuityLockTransition",
      "resumeMode",
      "finalTurnCompleted",
      "terminalLockReason",
      "lastHeartbeatAt",
    ] as const) {
      assignPatchedField(update, patch, key);
    }
    this.patchSession(sessionKey, update);
  }

  notifyBindingChanged(
    sessionKey: SessionKey,
    patch: {
      readonly bindingStatus?: SessionBindingStatus;
      readonly providerId?: string;
      readonly providerSessionId?: string | null;
    }
  ): void {
    const update: SessionSnapshotPatch = { nodeId: sessionKey.nodeId };
    if (hasOwn(patch, "providerSessionId")) {
      update.providerSessionId = patch.providerSessionId ?? undefined;
    }
    if (hasOwn(patch, "bindingStatus")) {
      update.bindingStatus = patch.bindingStatus;
    }
    if (hasOwn(patch, "providerId")) {
      update.providerId = patch.providerId;
    }
    this.patchSession(sessionKey, update);
  }

  notifySessionDeleted(sessionKey: SessionKey): void {
    this.store.removeSession(sessionKey);
    this.taskTimerSync.updateTaskTimer(
      sessionKey.workspaceRoot,
      sessionKey.nodeId
    );
    this.onWorkspaceChanged?.(sessionKey.workspaceRoot);
  }

  notifyArtifactWritten(
    nodeKey: NodeKey,
    artifactId: string,
    pointer: ArtifactPointer
  ): void {
    this.store.updateArtifact(nodeKey, artifactId, pointer);
    this.onWorkspaceChanged?.(nodeKey.workspaceRoot);
  }

  private patchSession(
    sessionKey: SessionKey,
    patch: SessionSnapshotPatch
  ): void {
    this.store.updateSession(sessionKey, patch);
    this.taskTimerSync.updateTaskTimer(
      sessionKey.workspaceRoot,
      sessionKey.nodeId
    );
    this.onWorkspaceChanged?.(sessionKey.workspaceRoot);
  }
}
