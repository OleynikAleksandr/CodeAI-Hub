import type { Session } from "../../session-manager";

export interface ManagedInternalContinuationDispatch {
  dispatchUserMessage?: (options: {
    readonly content: string;
    readonly hiddenUserMessage: boolean;
    readonly session: Session;
    readonly sessionId: string;
  }) => Promise<void>;
  sendInternalMessage(sessionId: string, content: string): Promise<void>;
}

export const dispatchManagedInternalContinuation = (
  dispatch: ManagedInternalContinuationDispatch,
  options: {
    readonly content: string;
    readonly session: Session | null | undefined;
    readonly sessionId: string;
  }
): void => {
  const task =
    options.session && dispatch.dispatchUserMessage
      ? dispatch.dispatchUserMessage({
          content: options.content,
          hiddenUserMessage: false,
          session: options.session,
          sessionId: options.sessionId,
        })
      : dispatch.sendInternalMessage(options.sessionId, options.content);
  task.catch(() => undefined);
};
