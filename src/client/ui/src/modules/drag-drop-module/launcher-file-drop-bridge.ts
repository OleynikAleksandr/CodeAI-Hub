import type { DragDropLogger } from "./data-transfer-file-extractor";

type LauncherBridge = {
  readonly requestFileDrop?: () => unknown;
};

const resolveLauncherBridge = (): LauncherBridge | null => {
  const globalScope = window as typeof window & {
    codeaiLauncher?: LauncherBridge;
  };

  return globalScope.codeaiLauncher ?? null;
};

export const requestLauncherFileDrop = (logger?: DragDropLogger): boolean => {
  const bridge = resolveLauncherBridge();
  if (!bridge || typeof bridge.requestFileDrop !== "function") {
    return false;
  }

  try {
    bridge.requestFileDrop();
    logger?.("message-handler:launcher-file-drop-request");
    return true;
  } catch (error) {
    logger?.("message-handler:launcher-file-drop-request-error", error);
    return false;
  }
};
