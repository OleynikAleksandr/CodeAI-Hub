import type { Session } from "../../session-manager";

export interface ManagedInternalContinuationDispatch {
  dispatchUserMessage?: (options: {
    readonly content: string;
    readonly hiddenUserMessage: boolean;
    readonly messageTag?: string;
    readonly session: Session;
    readonly sessionId: string;
  }) => Promise<void>;
  sendInternalMessage(sessionId: string, content: string): Promise<void>;
}

export interface ManagedInternalContinuationDispatchOptions {
  readonly content: string;
  readonly onDeliveryFailure?: (error: unknown) => void;
  readonly session: Session | null | undefined;
  readonly sessionId: string;
}

export const buildContinuationDeliveryFailureMessage = (
  error: unknown
): string =>
  [
    `Core could not deliver the continuation prompt to the agent after a retry: ${
      error instanceof Error ? error.message : String(error)
    }`,
    "The input is released. Send any message and Core will re-validate the workflow state and re-dispatch the next step.",
  ].join("\n");

export const dispatchManagedInternalContinuation = (
  dispatch: ManagedInternalContinuationDispatch,
  options: ManagedInternalContinuationDispatchOptions
): void => {
  const send = (): Promise<void> =>
    options.session && dispatch.dispatchUserMessage
      ? dispatch.dispatchUserMessage({
          content: options.content,
          hiddenUserMessage: false,
          messageTag: "managed-workflow-continuation",
          session: options.session,
          sessionId: options.sessionId,
        })
      : dispatch.sendInternalMessage(options.sessionId, options.content);
  send()
    .catch(() => send())
    .catch((error: unknown) => {
      options.onDeliveryFailure?.(error);
    });
};
