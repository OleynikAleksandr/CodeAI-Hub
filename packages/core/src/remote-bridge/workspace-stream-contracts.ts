import type {
  WorkspaceSelectAckPayload,
  WorkspaceSelectPayload,
  WorkspaceSnapshotPushPayload,
  WorkspaceSnapshotRequestPayload,
} from "../workspace-runtime/workspace-wire-types";

export type WorkspaceScopeSyncReason =
  | "workspace_selected"
  | "reconnect"
  | "workspace_cleared";

export interface WorkspaceScopeSetPayload {
  readonly reason: WorkspaceScopeSyncReason;
  readonly requestId: string;
  readonly workspacePath: string | null;
  readonly workspaceSlug?: string | null;
}

export interface WorkspaceScopeAckPayload {
  readonly error?: string | null;
  readonly requestId: string;
  readonly status: "applied" | "rejected";
  readonly workspacePath: string | null;
}

export type WorkspaceBridgeEvent =
  | {
      readonly type: "workspace:scope:ack";
      readonly payload: WorkspaceScopeAckPayload;
    }
  | {
      readonly type: "workspace:select:ack";
      readonly payload: WorkspaceSelectAckPayload;
    }
  | {
      readonly type: "workspace:snapshot";
      readonly payload: WorkspaceSnapshotPushPayload;
    };

export type WorkspaceIncomingMessage =
  | {
      readonly type: "workspace:scope:set";
      readonly payload: WorkspaceScopeSetPayload;
    }
  | {
      readonly type: "workspace:select";
      readonly payload: WorkspaceSelectPayload;
    }
  | {
      readonly type: "workspace:snapshot:request";
      readonly payload: WorkspaceSnapshotRequestPayload;
    };
