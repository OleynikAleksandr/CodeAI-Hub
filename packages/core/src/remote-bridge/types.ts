import type { ProviderRegistry } from "../provider-registry";
import type { WorkspaceProject } from "../services/project-registry/types";
import type { RuntimeStatusEvent } from "../status/runtime-status-reporter";
import type { CommandErrorPayload } from "../workspace-runtime/workspace-wire-types";
import type {
  SerializedSession,
  SessionBridgeEvent,
  SessionIncomingMessage,
} from "./session-stream-contracts";
import type {
  WorkspaceBridgeEvent,
  WorkspaceIncomingMessage,
} from "./workspace-stream-contracts";

export type {
  DialogSwitchInitiator,
  DialogSwitchMode,
  DialogSwitchOfferPayload,
  DialogSwitchProgressPayload,
  DialogSwitchProgressPhase,
  DialogSwitchResultPayload,
  DialogSwitchTarget,
  ProviderFailureClass,
  SerializedSession,
  SessionBridgeEvent,
  SessionIncomingMessage,
  TurnFailedPayload,
  TurnStateStreamData,
} from "./session-stream-contracts";
export { serializeSession } from "./session-stream-contracts";
export type {
  WorkspaceBridgeEvent,
  WorkspaceIncomingMessage,
  WorkspaceScopeAckPayload,
  WorkspaceScopeSetPayload,
  WorkspaceScopeSyncReason,
} from "./workspace-stream-contracts";

export interface CoreStatePayload {
  readonly providers: ReturnType<ProviderRegistry["listProviders"]>;
  readonly sessions: readonly SerializedSession[];
}

type CoreBridgeEvent =
  | { readonly type: "core:state"; readonly payload: CoreStatePayload }
  | {
      readonly type: "settings:loaded";
      readonly payload: {
        readonly settings: Record<string, unknown> | null;
        readonly error: string | null;
      };
    }
  | { readonly type: "core:notification"; readonly payload: unknown }
  | {
      readonly type: "core:loading-status";
      readonly payload: RuntimeStatusEvent;
    }
  | {
      readonly type: "command:error";
      readonly payload: CommandErrorPayload;
    };

type DialogBridgeEvent =
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
    };

interface ProjectBridgeEvent {
  readonly payload: { readonly projects: readonly WorkspaceProject[] };
  readonly type: "projects:update";
}

export type BridgeEvent =
  | CoreBridgeEvent
  | DialogBridgeEvent
  | ProjectBridgeEvent
  | SessionBridgeEvent
  | WorkspaceBridgeEvent;

interface CoreIncomingMessage {
  readonly type: "settings:load";
}

type DialogIncomingMessage =
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
    };

type ProjectIncomingMessage =
  | {
      readonly type: "projects:list";
    }
  | {
      readonly type: "projects:add";
      readonly payload: { readonly path: string; readonly name?: string };
    }
  | {
      readonly type: "projects:remove";
      readonly payload: { readonly id: string };
    };

export type IncomingMessage =
  | CoreIncomingMessage
  | DialogIncomingMessage
  | ProjectIncomingMessage
  | SessionIncomingMessage
  | WorkspaceIncomingMessage;
