import { logCoreBridgeDiagnostic } from "./core-bridge-logger";

type SupervisorRequestMode = "ensure-started" | "restart" | "stop";

interface LauncherBridge {
  readonly ensureCoreRunning?: () => unknown;
  readonly restartCore?: () => unknown;
}

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

const tryRequestCoreFromVsCode = (type: string): boolean => {
  const api = (window as BridgeWindow).acquireVsCodeApi?.();
  if (!api) {
    return false;
  }

  try {
    api.postMessage({ type });
    return true;
  } catch (error) {
    logCoreBridgeDiagnostic("supervisor:vscode-post-message-failed", {
      error,
      type,
    });
    return false;
  }
};

const tryRequestCoreFromLauncher = (mode: SupervisorRequestMode): boolean => {
  const launcher = (window as BridgeWindow).codeaiLauncher;
  if (!launcher) {
    return false;
  }

  try {
    if (mode === "restart" && typeof launcher.restartCore === "function") {
      launcher.restartCore();
      return true;
    }
    if (typeof launcher.ensureCoreRunning === "function") {
      launcher.ensureCoreRunning();
      return true;
    }
    return false;
  } catch (error) {
    logCoreBridgeDiagnostic("supervisor:launcher-request-failed", {
      error,
      mode,
    });
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

  tryRequestCoreFromLauncher(mode);
};
