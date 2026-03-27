import type {
  SessionContinuityLockTransition,
  WorkspaceSnapshot,
} from "./workspace-runtime-types";

export type WorkspaceSelectReason =
  | "workspace_selected"
  | "reconnect"
  | "workspace_cleared";

export interface WorkspaceSelectPayload {
  readonly reason: WorkspaceSelectReason;
  readonly requestId: string;
  readonly workspaceRoot: string | null;
}

export interface WorkspaceSelect {
  readonly payload: WorkspaceSelectPayload;
  readonly type: "workspace:select";
}

export interface WorkspaceSelectAckPayload {
  readonly error?: string | null;
  readonly requestId: string;
  readonly selectionId: string | null;
  readonly status: "applied" | "rejected";
  readonly workspaceRoot: string | null;
}

export interface WorkspaceSelectAck {
  readonly payload: WorkspaceSelectAckPayload;
  readonly type: "workspace:select:ack";
}

export interface WorkspaceSnapshotRequestPayload {
  readonly reason: "resync" | "debug";
  readonly requestId: string;
  readonly workspaceRoot: string;
}

export interface WorkspaceSnapshotRequest {
  readonly payload: WorkspaceSnapshotRequestPayload;
  readonly type: "workspace:snapshot:request";
}

export interface WorkspaceSnapshotPushPayload {
  readonly generatedAt: string;
  readonly selectionId: string;
  readonly sequence: number;
  readonly snapshot: WorkspaceSnapshot;
  readonly workspaceRoot: string;
}

export interface WorkspaceSnapshotPush {
  readonly payload: WorkspaceSnapshotPushPayload;
  readonly type: "workspace:snapshot";
}

export type WorkspaceSnapshotSessionTransition =
  SessionContinuityLockTransition;

export interface CommandErrorPayload {
  readonly code?: string;
  readonly command: string;
  readonly details?: unknown;
  readonly message: string;
  readonly requestId: string;
}

export interface CommandError {
  readonly payload: CommandErrorPayload;
  readonly type: "command:error";
}
