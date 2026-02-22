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
  | "context_check_pending"
  | "threshold_reached"
  | "report_in_progress"
  | "resume_bootstrap"
  | "no_rollover_needed"
  | "resume_ready"
  | "resume_failed"
  | "resume_timeout"
  | "terminal_no_resume";

export type WorkspaceSnapshotSessionResumeMode =
  | "no_resume"
  | "resume_in_place"
  | "resume_via_rollover";

export type WorkspaceSnapshotContinuityLockTransition = {
  readonly rolloverId: string;
  readonly sourceSessionId: string;
  readonly targetSessionId?: string;
  readonly stageId?: string;
  readonly runSlug?: string | null;
  readonly reason: WorkspaceSnapshotContinuityLockReason;
  readonly rolloverPending?: boolean;
  readonly awaitingBootstrapTurn: boolean;
  readonly resumeMode?: WorkspaceSnapshotSessionResumeMode;
  readonly finalTurnCompleted?: boolean;
  readonly terminalLockReason?: "terminal_no_resume";
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
        readonly resumeMode?: WorkspaceSnapshotSessionResumeMode;
        readonly finalTurnCompleted?: boolean;
        readonly terminalLockReason?: "terminal_no_resume";
        readonly lastHeartbeatAt?: string;
        readonly providerId?: string;
        readonly providerSessionId?: string;
        readonly bindingStatus?: "pending" | "ready" | "failed";
        readonly taskTimer?: {
          readonly totalSeconds: number;
          readonly runningSinceMs: number | null;
        };
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

export type DialogListRequestPayload = {
  readonly requestId: string;
  readonly workspaceSlug: string;
};

export type DialogOpenRequestPayload = {
  readonly requestId: string;
  readonly workspaceSlug: string;
  readonly dialogId: string;
};

export type DialogHistoryRequestPayload = {
  readonly requestId: string;
  readonly workspaceSlug: string;
  readonly dialogId: string;
  readonly cursor?: number;
};

export type DialogSendRequestPayload = {
  readonly requestId: string;
  readonly workspaceSlug: string;
  readonly dialogId: string;
  readonly content: string;
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
  | { readonly type: "dialog:list"; readonly payload: DialogListRequestPayload }
  | { readonly type: "dialog:open"; readonly payload: DialogOpenRequestPayload }
  | {
      readonly type: "dialog:history";
      readonly payload: DialogHistoryRequestPayload;
    }
  | { readonly type: "dialog:send"; readonly payload: DialogSendRequestPayload }
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
  | {
      readonly type: "dialog:list:result";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
        readonly dialogs: readonly unknown[];
      };
    }
  | {
      readonly type: "dialog:open:result";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
        readonly dialogId: string;
        readonly dialog: unknown | null;
        readonly error: string | null;
      };
    }
  | {
      readonly type: "dialog:history:result";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
        readonly dialogId: string;
        readonly lastCursor?: number;
        readonly messages: readonly unknown[];
        readonly error: string | null;
      };
    }
  | {
      readonly type: "dialog:send:ack";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
        readonly dialogId: string;
        readonly status: "sent" | "rejected";
        readonly error: string | null;
      };
    }
  | {
      readonly type: "dialog:message";
      readonly payload: {
        readonly dialogId: string;
        readonly sessionId: string;
        readonly message: unknown;
      };
    }
  | { readonly type: string; readonly payload?: unknown };

export type CoreStatePayload = {
  readonly providers?: unknown;
};

export type ProjectUpdatePayload = {
  readonly projects: readonly WorkspaceProject[];
};
