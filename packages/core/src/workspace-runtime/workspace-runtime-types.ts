export type NodeKey = {
  readonly workspaceRoot: string;
  readonly nodeId: string;
};

export type SessionKey = {
  readonly workspaceRoot: string;
  readonly nodeId: string;
  readonly sessionId: string;
};

export type WorkspaceLoadState = "loading" | "ready" | "error";

export type NodeStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "DONE"
  | "BLOCKED"
  | "OUTDATED"
  | "ERROR";

export type NodeSnapshot = {
  readonly status: NodeStatus;
  readonly deps?: readonly string[];
  readonly label?: string;
  readonly reason?: string | null;
  readonly updatedAt?: string;
};

export type SessionTurnState = "idle" | "running";

export type SessionBindingStatus = "pending" | "ready" | "failed";

export type SessionSnapshot = {
  readonly nodeId: string;
  readonly turnState: SessionTurnState;
  readonly continuityLockActive: boolean;
  readonly lastHeartbeatAt?: string;
  readonly providerId?: string;
  readonly providerSessionId?: string;
  readonly bindingStatus?: SessionBindingStatus;
};

export type ArtifactPointer = {
  readonly artifactId: string;
  readonly version: string;
  readonly path: string;
  readonly updatedAt?: string;
};

export type WorkspaceSnapshot = {
  readonly workspaceRoot: string;
  readonly loadState: WorkspaceLoadState;
  readonly error?: string | null;
  readonly workflow: {
    readonly nodes: Readonly<Record<string, NodeSnapshot>>;
  };
  readonly sessions: Readonly<Record<string, SessionSnapshot>>;
  readonly artifacts: {
    readonly currentByNodeId: Readonly<
      Record<string, Readonly<Record<string, ArtifactPointer>>>
    >;
  };
};
