type SupervisorRequestMode = "ensure-started" | "restart" | "stop";

type LauncherBridge = {
  readonly ensureCoreRunning?: () => unknown;
};

type BridgeWindow = typeof window & {
  acquireVsCodeApi?: () => { postMessage: (m: unknown) => void };
  codeaiLauncher?: LauncherBridge;
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

const tryRequestCoreFromVsCode = (type: string): boolean => {
  const api = (window as BridgeWindow).acquireVsCodeApi?.();
  if (!api) {
    return false;
  }

  try {
    api.postMessage({ type });
    return true;
  } catch {
    return false;
  }
};

const tryRequestCoreFromLauncher = (): boolean => {
  const launcher = (window as BridgeWindow).codeaiLauncher;
  if (!launcher || typeof launcher.ensureCoreRunning !== "function") {
    return false;
  }

  try {
    launcher.ensureCoreRunning();
    return true;
  } catch {
    return false;
  }
};

export const requestCoreFromSupervisor = (
  mode: SupervisorRequestMode
): void => {
  coreStopRequestedByUser = mode === "stop";
  const requestType = SUPERVISOR_REQUEST_TYPES[mode];
  if (tryRequestCoreFromVsCode(requestType)) {
    return;
  }

  if (mode === "stop") {
    return;
  }

  tryRequestCoreFromLauncher();
};
