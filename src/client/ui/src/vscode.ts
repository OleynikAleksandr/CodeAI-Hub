export type VsCodeApi = {
  postMessage: (message: unknown) => void;
};

let cachedApi: VsCodeApi | undefined;

export const getVsCodeApi = (): VsCodeApi | undefined => {
  if (cachedApi) {
    return cachedApi;
  }

  const globalScope = window as typeof window & {
    acquireVsCodeApi?: () => VsCodeApi;
    vscode?: VsCodeApi;
  };

  if (globalScope.vscode) {
    cachedApi = globalScope.vscode;
    return cachedApi;
  }

  if (typeof globalScope.acquireVsCodeApi === "function") {
    try {
      cachedApi = globalScope.acquireVsCodeApi();
      globalScope.vscode = cachedApi;
      return cachedApi;
    } catch (_error) {
      return cachedApi;
    }
  }

  return cachedApi;
};

import { handleOutgoingVsCodeMessage } from "./core-bridge/core-bridge";

export const postVsCodeMessage = (message: unknown) => {
  if (handleOutgoingVsCodeMessage(message)) {
    return;
  }
  const api = getVsCodeApi();
  if (!api) {
    return;
  }
  api.postMessage(message);
};

const vscodeInstance = getVsCodeApi();

const fallbackApi: VsCodeApi = {
  postMessage: () => {
    /* no-op */
  },
};

const vscode = vscodeInstance ?? fallbackApi;

export default vscode;
