import type { WorkspaceSnapshot } from "./workspace-runtime-types";

export type WorkspaceSelectReason =
  | "workspace_selected"
  | "reconnect"
  | "workspace_cleared";

export type WorkspaceSelectPayload = {
  readonly requestId: string;
  readonly workspaceRoot: string | null;
  readonly reason: WorkspaceSelectReason;
};

export type WorkspaceSelect = {
  readonly type: "workspace:select";
  readonly payload: WorkspaceSelectPayload;
};

export type WorkspaceSelectAckPayload = {
  readonly requestId: string;
  readonly status: "applied" | "rejected";
  readonly workspaceRoot: string | null;
  readonly selectionId: string | null;
  readonly error?: string | null;
};

export type WorkspaceSelectAck = {
  readonly type: "workspace:select:ack";
  readonly payload: WorkspaceSelectAckPayload;
};

export type WorkspaceSnapshotRequestPayload = {
  readonly requestId: string;
  readonly workspaceRoot: string;
  readonly reason: "resync" | "debug";
};

export type WorkspaceSnapshotRequest = {
  readonly type: "workspace:snapshot:request";
  readonly payload: WorkspaceSnapshotRequestPayload;
};

export type WorkspaceSnapshotPushPayload = {
  readonly workspaceRoot: string;
  readonly selectionId: string;
  readonly sequence: number;
  readonly generatedAt: string;
  readonly snapshot: WorkspaceSnapshot;
};

export type WorkspaceSnapshotPush = {
  readonly type: "workspace:snapshot";
  readonly payload: WorkspaceSnapshotPushPayload;
};

export type CommandErrorPayload = {
  readonly requestId: string;
  readonly command: string;
  readonly message: string;
  readonly code?: string;
  readonly details?: unknown;
};

export type CommandError = {
  readonly type: "command:error";
  readonly payload: CommandErrorPayload;
};
