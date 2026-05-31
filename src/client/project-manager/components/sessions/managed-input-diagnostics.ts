import { api } from "../../api";

const CHANNEL = "managed-input-gate";

export const logManagedInputDiagnostic = (
  event: string,
  context: Record<string, unknown> = {}
): void => {
  try {
    api.logDiagnostic({
      channel: CHANNEL,
      event,
      context: {
        ...context,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch {
    // Diagnostic logging must never affect session input state.
  }
};
