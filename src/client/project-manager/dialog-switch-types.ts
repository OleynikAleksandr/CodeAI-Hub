/**
 * Dialog switch / provider recovery types for PM-side consumption.
 * Mirrors Core-side types from packages/core/src/remote-bridge/types.ts.
 */

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

export type DialogSwitchTarget = {
  readonly providerId: string;
  readonly modelId: string | null;
  readonly mode: DialogSwitchMode;
};

export type DialogSwitchOfferPayload = {
  readonly dialogId: string;
  readonly sessionId: string;
  readonly initiator: DialogSwitchInitiator;
  readonly reason: string;
  readonly recommendedTarget: DialogSwitchTarget;
  readonly alternativeTargets: readonly DialogSwitchTarget[];
  readonly canRetryInPlace: boolean;
};

export type DialogSwitchProgressPhase =
  | "analyzing"
  | "awaiting_user"
  | "preparing_transfer"
  | "creating_session"
  | "sending_bootstrap"
  | "done"
  | "failed";

export type DialogSwitchProgressPayload = {
  readonly dialogId: string;
  readonly sessionId: string;
  readonly phase: DialogSwitchProgressPhase;
};

export type DialogSwitchResultPayload = {
  readonly dialogId: string;
  readonly previousSessionId: string;
  readonly newSessionId: string | null;
  readonly newProviderId: string | null;
  readonly success: boolean;
  readonly error: string | null;
};

export type TurnFailedPayload = {
  readonly sessionId: string;
  readonly providerId: string;
  readonly failureClass: ProviderFailureClass;
  readonly retryable: boolean;
  readonly message: string;
  readonly pendingIntentExpired?: boolean;
};
