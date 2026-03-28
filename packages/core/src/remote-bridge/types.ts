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

export interface AppliedProviderTurnConfig {
  readonly modelId?: string;
  readonly providerId: string;
  readonly reasoningEffort?: string;
  readonly source: "settings_snapshot" | "switch_request";
  readonly thinkingLevel?: string;
}

const APPLIED_PROVIDER_TURN_CONFIG_KEY = "__codeaiAppliedTurnConfig";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const withAppliedProviderTurnConfig = (
  turnOptions: Record<string, unknown> | undefined,
  config: AppliedProviderTurnConfig | null
): Record<string, unknown> | undefined => {
  if (!config) {
    return turnOptions;
  }

  return {
    ...(turnOptions ?? {}),
    [APPLIED_PROVIDER_TURN_CONFIG_KEY]: config,
  };
};

export const readAppliedProviderTurnConfig = (
  turnOptions?: Record<string, unknown>
): AppliedProviderTurnConfig | null => {
  const candidate = turnOptions?.[APPLIED_PROVIDER_TURN_CONFIG_KEY];
  if (!isRecord(candidate) || typeof candidate.providerId !== "string") {
    return null;
  }

  return {
    providerId: candidate.providerId,
    source:
      candidate.source === "switch_request"
        ? "switch_request"
        : "settings_snapshot",
    modelId:
      typeof candidate.modelId === "string" ? candidate.modelId : undefined,
    reasoningEffort:
      typeof candidate.reasoningEffort === "string"
        ? candidate.reasoningEffort
        : undefined,
    thinkingLevel:
      typeof candidate.thinkingLevel === "string"
        ? candidate.thinkingLevel
        : undefined,
  };
};

export const shouldBroadcastAppliedProviderModelUpdate = (options: {
  readonly syncsLabelFromAppliedConfig: boolean;
  readonly turnConfig: AppliedProviderTurnConfig | null;
}): options is {
  readonly syncsLabelFromAppliedConfig: true;
  readonly turnConfig: AppliedProviderTurnConfig & { readonly modelId: string };
} =>
  options.syncsLabelFromAppliedConfig &&
  typeof options.turnConfig?.modelId === "string" &&
  options.turnConfig.modelId.trim().length > 0 &&
  options.turnConfig.source === "settings_snapshot";

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
