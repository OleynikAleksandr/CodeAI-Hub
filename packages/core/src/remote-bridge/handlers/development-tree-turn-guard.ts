export interface DevelopmentTreeGuardedTurnMessage {
  readonly content: string;
  readonly tag: string;
}

export const buildDevelopmentTreeTurnFailureMessage = (
  error: unknown
): DevelopmentTreeGuardedTurnMessage => ({
  content: [
    `Core could not process this Development Tree turn: ${
      error instanceof Error ? error.message : String(error)
    }`,
    "The input is released. Send any message and Core will re-read the managed plan state and continue from the current truth.",
  ].join("\n"),
  tag: "managed-workflow-validation",
});

export const runGuardedDevelopmentTreeTurn = async <R>(
  run: () => Promise<R>,
  onError: (error: unknown) => R
): Promise<R> => {
  try {
    return await run();
  } catch (error) {
    return onError(error);
  }
};
