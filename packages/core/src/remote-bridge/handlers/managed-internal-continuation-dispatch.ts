interface ManagedInternalContinuationDispatch {
  sendInternalMessage(sessionId: string, content: string): Promise<void>;
}

export const dispatchManagedInternalContinuation = (
  dispatch: ManagedInternalContinuationDispatch,
  sessionId: string,
  content: string
): void => {
  dispatch.sendInternalMessage(sessionId, content).catch(() => undefined);
};
