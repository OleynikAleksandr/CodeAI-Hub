import type { Session } from "../session-manager";

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

export type SessionBridgeEvent =
  | { readonly type: "session:created"; readonly payload: SerializedSession }
  | { readonly type: "session:message"; readonly payload: unknown }
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

export type SessionIncomingMessage =
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
      readonly type: "session:stop";
      readonly payload: {
        readonly sessionId: string;
      };
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
