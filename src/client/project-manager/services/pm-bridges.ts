export type VscodeBridge = {
  postMessage: (message: unknown) => void;
};

export type LauncherBridge = {
  pickFolder: () => boolean;
};

export const resolveVscodeBridge = (): VscodeBridge | null => {
  const acquire = (
    window as unknown as { acquireVsCodeApi?: () => VscodeBridge }
  ).acquireVsCodeApi;
  if (typeof acquire !== "function") {
    return null;
  }
  try {
    const api = acquire();
    if (api && typeof api.postMessage === "function") {
      return api;
    }
  } catch {
    return null;
  }
  return null;
};

export const resolveLauncherBridge = (): LauncherBridge | null => {
  const globalScope = window as Window & { codeaiLauncher?: LauncherBridge };
  const bridge = globalScope.codeaiLauncher;
  if (!bridge || typeof bridge.pickFolder !== "function") {
    return null;
  }
  return bridge;
};

