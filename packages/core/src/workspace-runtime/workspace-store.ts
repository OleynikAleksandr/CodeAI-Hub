import type {
  ArtifactPointer,
  NodeKey,
  NodeSnapshot,
  SessionKey,
  SessionSnapshot,
  WorkspaceLoadState,
} from "./workspace-runtime-types";

const DEFAULT_NODE_STATUS: NodeSnapshot["status"] = "TODO";

const createDefaultNode = (): NodeSnapshot => ({
  status: DEFAULT_NODE_STATUS,
  reason: null,
});

const createDefaultSession = (key: SessionKey): SessionSnapshot => ({
  nodeId: key.nodeId,
  turnState: "idle",
  continuityLockActive: false,
});

type MutableArtifactsByNode = Map<string, Map<string, ArtifactPointer>>;

export interface WorkspaceState {
  readonly artifactsByNode: MutableArtifactsByNode;
  dirty: boolean;
  error: string | null;
  loadState: WorkspaceLoadState;
  readonly nodes: Map<string, NodeSnapshot>;
  readonly sessions: Map<string, SessionSnapshot>;
  readonly workspaceRoot: string;
}

const createWorkspaceState = (workspaceRoot: string): WorkspaceState => ({
  workspaceRoot,
  loadState: "loading",
  error: null,
  nodes: new Map<string, NodeSnapshot>(),
  sessions: new Map<string, SessionSnapshot>(),
  artifactsByNode: new Map<string, Map<string, ArtifactPointer>>(),
  dirty: true,
});

const shallowEqual = (
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean => {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }
  for (const [key, leftValue] of leftEntries) {
    if (right[key] !== leftValue) {
      return false;
    }
  }
  return true;
};

export class WorkspaceStore {
  private readonly workspaces = new Map<string, WorkspaceState>();

  getOrCreate(workspaceRoot: string): WorkspaceState {
    const existing = this.workspaces.get(workspaceRoot);
    if (existing) {
      return existing;
    }
    const created = createWorkspaceState(workspaceRoot);
    this.workspaces.set(workspaceRoot, created);
    return created;
  }

  get(workspaceRoot: string): WorkspaceState | null {
    return this.workspaces.get(workspaceRoot) ?? null;
  }

  listWorkspaceRoots(): readonly string[] {
    return Array.from(this.workspaces.keys());
  }

  setLoadState(workspaceRoot: string, loadState: WorkspaceLoadState): void {
    const state = this.getOrCreate(workspaceRoot);
    if (state.loadState === loadState) {
      return;
    }
    state.loadState = loadState;
    state.dirty = true;
  }

  setError(workspaceRoot: string, error: string | null): void {
    const state = this.getOrCreate(workspaceRoot);
    if (state.error === error) {
      return;
    }
    state.error = error;
    state.dirty = true;
  }

  updateSession(key: SessionKey, patch: Partial<SessionSnapshot>): void {
    const state = this.getOrCreate(key.workspaceRoot);
    const current =
      state.sessions.get(key.sessionId) ?? createDefaultSession(key);
    const next: SessionSnapshot = {
      ...current,
      ...patch,
      nodeId: patch.nodeId ?? current.nodeId ?? key.nodeId,
    };
    if (
      shallowEqual(
        current as Record<string, unknown>,
        next as Record<string, unknown>
      )
    ) {
      return;
    }
    state.sessions.set(key.sessionId, next);
    state.dirty = true;
  }

  removeSession(key: SessionKey): void {
    const state = this.workspaces.get(key.workspaceRoot);
    if (!state) {
      return;
    }
    if (!state.sessions.delete(key.sessionId)) {
      return;
    }
    state.dirty = true;
  }

  updateNode(key: NodeKey, patch: Partial<NodeSnapshot>): void {
    const state = this.getOrCreate(key.workspaceRoot);
    const current = state.nodes.get(key.nodeId) ?? createDefaultNode();
    const next: NodeSnapshot = {
      ...current,
      ...patch,
      status: patch.status ?? current.status,
    };
    if (
      shallowEqual(
        current as Record<string, unknown>,
        next as Record<string, unknown>
      )
    ) {
      return;
    }
    state.nodes.set(key.nodeId, next);
    state.dirty = true;
  }

  updateArtifact(
    key: NodeKey,
    artifactId: string,
    pointer: ArtifactPointer
  ): void {
    const state = this.getOrCreate(key.workspaceRoot);
    const artifactsForNode =
      state.artifactsByNode.get(key.nodeId) ??
      new Map<string, ArtifactPointer>();
    const current = artifactsForNode.get(artifactId);
    if (
      current &&
      shallowEqual(
        current as Record<string, unknown>,
        pointer as Record<string, unknown>
      )
    ) {
      if (!state.artifactsByNode.has(key.nodeId)) {
        state.artifactsByNode.set(key.nodeId, artifactsForNode);
      }
      return;
    }
    artifactsForNode.set(artifactId, pointer);
    state.artifactsByNode.set(key.nodeId, artifactsForNode);
    state.dirty = true;
  }

  consumeDirty(workspaceRoot: string): boolean {
    const state = this.workspaces.get(workspaceRoot);
    if (!state?.dirty) {
      return false;
    }
    state.dirty = false;
    return true;
  }

  markDirty(workspaceRoot: string): void {
    const state = this.workspaces.get(workspaceRoot);
    if (!state) {
      return;
    }
    state.dirty = true;
  }
}
