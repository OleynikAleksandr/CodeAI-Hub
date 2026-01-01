type SupervisorRequestMode = "ensure-started" | "restart";

type VsCodeWindow = typeof window & {
  acquireVsCodeApi?: () => { postMessage: (m: unknown) => void };
};

export const requestCoreFromSupervisor = (
  mode: SupervisorRequestMode
): void => {
  try {
    (window as VsCodeWindow).acquireVsCodeApi?.().postMessage({
      type: mode === "restart" ? "core:restart-request" : "core:ensure-started",
    });
  } catch {
    /* noop */
  }
};
