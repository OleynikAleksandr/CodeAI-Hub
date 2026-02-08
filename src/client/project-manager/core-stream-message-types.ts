import type { WorkspaceProject } from "./types";

export type WorkspaceScopeSyncReason =
  | "workspace_selected"
  | "reconnect"
  | "workspace_cleared";

export type WorkspaceScopeSetPayload = {
  readonly workspacePath: string | null;
  readonly workspaceSlug?: string | null;
  readonly requestId: string;
  readonly reason: WorkspaceScopeSyncReason;
};

export type WorkspaceScopeAckPayload = {
  readonly requestId: string;
  readonly status: "applied" | "rejected";
  readonly workspacePath: string | null;
  readonly error?: string | null;
};

export type WorkspaceSelectPayload = {
  readonly requestId: string;
  readonly workspaceRoot: string | null;
  readonly reason: WorkspaceScopeSyncReason;
};

export type WorkspaceSelectAckPayload = {
  readonly requestId: string;
  readonly status: "applied" | "rejected";
  readonly workspaceRoot: string | null;
  readonly selectionId: string | null;
  readonly error?: string | null;
};

export type WorkspaceSnapshotContinuityLockReason =
  | "threshold_reached"
  | "report_in_progress"
  | "resume_bootstrap"
  | "resume_ready"
  | "resume_failed"
  | "resume_timeout";

export type WorkspaceSnapshotContinuityLockTransition = {
  readonly rolloverId: string;
  readonly sourceSessionId: string;
  readonly targetSessionId?: string;
  readonly stageId?: string;
  readonly runSlug?: string | null;
  readonly reason: WorkspaceSnapshotContinuityLockReason;
  readonly awaitingBootstrapTurn: boolean;
  readonly updatedAt: string;
};

export type WorkspaceSnapshot = {
  readonly workspaceRoot: string;
  readonly loadState: "loading" | "ready" | "error";
  readonly error?: string | null;
  readonly workflow: {
    readonly nodes: Readonly<Record<string, unknown>>;
  };
  readonly sessions: Readonly<
    Record<
      string,
      {
        readonly nodeId: string;
        readonly turnState: "idle" | "running";
        readonly continuityLockActive: boolean;
        readonly continuityLockReason?: WorkspaceSnapshotContinuityLockReason;
        readonly continuityLockTransition?: WorkspaceSnapshotContinuityLockTransition;
        readonly lastHeartbeatAt?: string;
        readonly providerId?: string;
        readonly providerSessionId?: string;
        readonly bindingStatus?: "pending" | "ready" | "failed";
      }
    >
  >;
  readonly artifacts: {
    readonly currentByNodeId: Readonly<
      Record<string, Readonly<Record<string, unknown>>>
    >;
  };
};

export type WorkspaceSnapshotPushPayload = {
  readonly workspaceRoot: string;
  readonly selectionId: string;
  readonly sequence: number;
  readonly generatedAt: string;
  readonly snapshot: WorkspaceSnapshot;
};

export type WorkspaceSnapshotRequestPayload = {
  readonly requestId: string;
  readonly workspaceRoot: string;
  readonly reason: "resync" | "debug";
};

export type CommandErrorPayload = {
  readonly requestId: string;
  readonly command: string;
  readonly message: string;
  readonly code?: string;
  readonly details?: unknown;
};

export type OutgoingMessage =
  | { readonly type: "projects:list" }
  | {
      readonly type: "projects:add";
      readonly payload: { readonly path: string; readonly name?: string };
    }
  | {
      readonly type: "projects:remove";
      readonly payload: { readonly id: string };
    }
  | {
      readonly type: "session:create";
      readonly payload: {
        readonly providerId?: string;
        readonly workspacePath?: string;
        readonly initiativeSlug?: string | null;
        readonly providerSessionId?: string | null;
        readonly stage?: string | null;
        readonly sessionKind?: "collector" | "reviewer" | null;
        readonly runSlug?: string | null;
      };
    }
  | {
      readonly type: "session:message";
      readonly payload: {
        readonly sessionId: string;
        readonly content:
          | string
          | {
              readonly text: string;
              readonly turnOptions?: Record<string, unknown>;
            };
      };
    }
  | { readonly type: "session:delete"; readonly payload: { readonly sessionId: string } }
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
    }
  | { readonly type: "settings:load" };

export type IncomingMessage =
  | { readonly type: "workspace:scope:ack"; readonly payload: WorkspaceScopeAckPayload }
  | {
      readonly type: "workspace:select:ack";
      readonly payload: WorkspaceSelectAckPayload;
    }
  | {
      readonly type: "workspace:snapshot";
      readonly payload: WorkspaceSnapshotPushPayload;
    }
  | {
      readonly type: "command:error";
      readonly payload: CommandErrorPayload;
    }
  | { readonly type: string; readonly payload?: unknown };

export type CoreStatePayload = {
  readonly providers?: unknown;
};

export type ProjectUpdatePayload = {
  readonly projects: readonly WorkspaceProject[];
};
