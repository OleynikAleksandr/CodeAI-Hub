export type DevelopmentTreeTurnDispatchResult = "continued" | "settled";

export interface DevelopmentTreeTurnDispatchMessage {
  readonly content: string;
  readonly tag: string;
}

export interface DevelopmentTreeTurnDispatchTarget {
  readonly content: string;
  readonly sessionId: string;
}

export interface DevelopmentTreeTurnDispatchableResult {
  readonly message: DevelopmentTreeTurnDispatchMessage;
  readonly nextInternalMessage?: string;
  readonly targetInternalMessage?: DevelopmentTreeTurnDispatchTarget;
}

export const dispatchDevelopmentTreeTurnResult = (params: {
  readonly appendCoreMessage: (
    sessionId: string,
    payload: DevelopmentTreeTurnDispatchMessage
  ) => void;
  readonly dispatchAgentContinuation: (
    sessionId: string,
    content: string
  ) => void;
  readonly result: DevelopmentTreeTurnDispatchableResult;
  readonly sessionId: string;
}): DevelopmentTreeTurnDispatchResult => {
  params.appendCoreMessage(params.sessionId, params.result.message);
  if (params.result.targetInternalMessage) {
    params.dispatchAgentContinuation(
      params.result.targetInternalMessage.sessionId,
      params.result.targetInternalMessage.content
    );
    return "continued";
  }
  if (params.result.nextInternalMessage) {
    params.dispatchAgentContinuation(
      params.sessionId,
      params.result.nextInternalMessage
    );
    return "continued";
  }
  return "settled";
};
