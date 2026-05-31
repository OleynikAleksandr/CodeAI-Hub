const CHANNEL = "managed-input-gate";

export const logManagedInputDiagnostic = (
  event: string,
  context: Record<string, unknown> = {}
): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    void import("../../api")
      .then(({ api }) => {
        api.logDiagnostic({
          channel: CHANNEL,
          event,
          context: {
            ...context,
            recordedAt: new Date().toISOString(),
          },
        });
      })
      .catch(() => {
        // Diagnostic logging must never affect session input state.
      });
  } catch {
    // Diagnostic logging must never affect session input state.
  }
};
