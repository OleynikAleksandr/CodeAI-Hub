type SupervisorRequestMode = "ensure-started" | "restart" | "stop";

type VsCodeWindow = typeof window & {
  acquireVsCodeApi?: () => { postMessage: (m: unknown) => void };
};

const SUPERVISOR_REQUEST_TYPES = {
  "ensure-started": "core:ensure-started",
  restart: "core:restart-request",
  stop: "core:stop-request",
} as const;

let coreStopRequestedByUser = false;

export const isCoreStopRequestedByUser = (): boolean => coreStopRequestedByUser;

export const clearCoreStopRequestedByUser = (): void => {
  coreStopRequestedByUser = false;
};

export const requestCoreFromSupervisor = (
  mode: SupervisorRequestMode
): void => {
  coreStopRequestedByUser = mode === "stop";
  try {
    (window as VsCodeWindow).acquireVsCodeApi?.().postMessage({
      type: SUPERVISOR_REQUEST_TYPES[mode],
    });
  } catch {
    /* noop */
  }
};
