import type { ProviderRegistry } from "../provider-registry";
import type { WorkspaceProject } from "../services/project-registry/types";
import type { Session } from "../session-manager";
import type { RuntimeStatusEvent } from "../status/runtime-status-reporter";
import type {
  CommandErrorPayload,
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

export interface SerializedSession {
  readonly continuationIndex: number;
  readonly continuationParentId: string | null;
  readonly createdAt: string;
  readonly id: string;
  readonly initiativeSlug: string | null;
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly providerSessionStatus: "pending" | "ready" | "failed";
  readonly runSlug: string | null;
  readonly stage: string | null;
  readonly title: string;
  readonly updatedAt: string;
  readonly workspacePath: string;
}

export interface CoreStatePayload {
  readonly providers: ReturnType<ProviderRegistry["listProviders"]>;
  readonly sessions: readonly SerializedSession[];
}

export type BridgeEvent =
  | { readonly type: "core:state"; readonly payload: CoreStatePayload }
  | { readonly type: "session:created"; readonly payload: SerializedSession }
  | { readonly type: "session:message"; readonly payload: unknown }
  | {
      readonly type: "dialog:message";
      readonly payload: {
        readonly dialogId: string;
        readonly sessionId: string;
        readonly message: unknown;
      };
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
      readonly type: "settings:loaded";
      readonly payload: {
        readonly settings: Record<string, unknown> | null;
        readonly error: string | null;
      };
    }
  | {
      readonly type: "session:binding";
      readonly payload: {
        readonly sessionId: string;
        readonly providerSessionId: string | null;
        readonly status: "pending" | "ready" | "failed";
      };
    }
  | {
      readonly type: "session:deleted";
      readonly payload: { readonly sessionId: string };
    }
  | {
      readonly type: "session:stream";
      readonly payload: { readonly sessionId: string; readonly event: unknown };
    }
  | { readonly type: "session:error"; readonly payload: unknown }
  | { readonly type: "core:notification"; readonly payload: unknown }
  | {
      readonly type: "core:loading-status";
      readonly payload: RuntimeStatusEvent;
    }
  | {
      readonly type: "projects:update";
      readonly payload: { readonly projects: readonly WorkspaceProject[] };
    }
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
    }
  | {
      readonly type: "command:error";
      readonly payload: CommandErrorPayload;
    }
  | {
      readonly type: "session:model:update";
      readonly payload: {
        readonly sessionId: string;
        readonly providerId: string;
        readonly modelId: string;
      };
    }
  | {
      readonly type: "dialog:switch:offer";
      readonly payload: DialogSwitchOfferPayload;
    }
  | {
      readonly type: "dialog:switch:progress";
      readonly payload: DialogSwitchProgressPayload;
    }
  | {
      readonly type: "dialog:switch:result";
      readonly payload: DialogSwitchResultPayload;
    };

export type IncomingMessage =
  | {
      readonly type: "session:create";
      readonly payload: {
        readonly providerId?: string;
        readonly workspacePath?: string;
        readonly initiativeSlug?: string | null;
        readonly providerSessionId?: string | null;
        readonly stage?: string | null;
        readonly runSlug?: string | null;
      };
    }
  | {
      readonly type: "settings:load";
    }
  | {
      readonly type: "session:message";
      readonly payload: {
        readonly sessionId: string;
        readonly content: string;
      };
    }
  | {
      readonly type: "session:delete";
      readonly payload: {
        readonly sessionId: string;
      };
    }
  | {
      readonly type: "projects:list";
    }
  | {
      readonly type: "dialog:list";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
      };
    }
  | {
      readonly type: "dialog:open";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
        readonly dialogId: string;
      };
    }
  | {
      readonly type: "dialog:history";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
        readonly dialogId: string;
        readonly cursor?: number;
      };
    }
  | {
      readonly type: "dialog:send";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
        readonly dialogId: string;
        readonly content: string;
      };
    }
  | {
      readonly type: "projects:add";
      readonly payload: { readonly path: string; readonly name?: string };
    }
  | {
      readonly type: "projects:remove";
      readonly payload: { readonly id: string };
    }
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
  | {
      readonly type: "dialog:switch:request";
      readonly payload: {
        readonly dialogId: string;
        readonly targetProviderId?: string;
        readonly targetModelId?: string;
        readonly mode: DialogSwitchMode;
      };
    }
  | {
      readonly type: "dialog:switch:confirm";
      readonly payload: {
        readonly dialogId: string;
        readonly targetProviderId: string;
        readonly targetModelId?: string;
        readonly mode: DialogSwitchMode;
      };
    }
  | {
      readonly type: "dialog:switch:cancel";
      readonly payload: {
        readonly dialogId: string;
      };
    };

export const serializeSession = (session: Session): SerializedSession => ({
  id: session.id,
  providerId: session.providerId,
  workspacePath: session.workspacePath,
  initiativeSlug: session.initiativeSlug,
  stage: session.stage,
  runSlug: session.runSlug ?? null,
  continuationParentId: session.continuationParentId,
  continuationIndex: session.continuationIndex,
  title: session.title,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  providerSessionId: session.providerSessionId ?? null,
  providerSessionStatus: session.providerSessionStatus,
});

export interface TurnStateStreamData {
  readonly kind: "turn_state";
  readonly providerId?: string;
  readonly state: "running" | "idle";
}

export type ProviderFailureClass =
  | "transient_turn_failure"
  | "session_binding_recoverable"
  | "provider_runtime_failure"
  | "terminal_session_failure";

export type DialogSwitchMode =
  | "retry_in_place"
  | "switch_model"
  | "switch_provider";

export type DialogSwitchInitiator = "core_recovery" | "user_request";

export interface DialogSwitchTarget {
  readonly mode: DialogSwitchMode;
  readonly modelId: string | null;
  readonly providerId: string;
}

export interface DialogSwitchOfferPayload {
  readonly alternativeTargets: readonly DialogSwitchTarget[];
  readonly canRetryInPlace: boolean;
  readonly dialogId: string;
  readonly initiator: DialogSwitchInitiator;
  readonly reason: string;
  readonly recommendedTarget: DialogSwitchTarget;
  readonly sessionId: string;
}

export type DialogSwitchProgressPhase =
  | "analyzing"
  | "awaiting_user"
  | "preparing_transfer"
  | "creating_session"
  | "sending_bootstrap"
  | "done"
  | "failed";

export interface DialogSwitchProgressPayload {
  readonly dialogId: string;
  readonly phase: DialogSwitchProgressPhase;
  readonly sessionId: string;
}

export interface DialogSwitchResultPayload {
  readonly dialogId: string;
  readonly error: string | null;
  readonly newProviderId: string | null;
  readonly newSessionId: string | null;
  readonly previousSessionId: string;
  readonly success: boolean;
}

export interface TurnFailedPayload {
  readonly failureClass: ProviderFailureClass;
  readonly message: string;
  readonly pendingIntentExpired?: boolean;
  readonly providerId: string;
  readonly retryable: boolean;
  readonly sessionId: string;
}
