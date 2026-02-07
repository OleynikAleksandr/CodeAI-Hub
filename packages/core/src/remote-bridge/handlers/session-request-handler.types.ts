export const CONTINUITY_ROLLOVER_PENDING_ERROR_CODE =
  "continuity_rollover_pending";

export const CONTINUITY_ROLLOVER_PENDING_ERROR_MESSAGE =
  "Session continuity rollover is in progress. Please wait for resume to complete.";

export type FlowNodeRolloverSendGuardDecision =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly code: typeof CONTINUITY_ROLLOVER_PENDING_ERROR_CODE;
      readonly message: string;
      readonly sourceSessionId: string;
      readonly targetSessionId: string | null;
    };
