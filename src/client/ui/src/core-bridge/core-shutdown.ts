import { DEFAULT_CONFIG } from "./constants";
import type { CoreBridgeConfig } from "./types";

const globalScope = window as typeof window & {
  __CODEAI_CORE_CONFIG?: CoreBridgeConfig;
};

export const requestCoreShutdown = async (): Promise<boolean> => {
  const httpUrl =
    typeof globalScope.__CODEAI_CORE_CONFIG?.httpUrl === "string"
      ? globalScope.__CODEAI_CORE_CONFIG.httpUrl
      : DEFAULT_CONFIG.httpUrl;
  try {
    const response = await fetch(`${httpUrl}/api/v1/shutdown`, {
      method: "POST",
    });
    return response.ok;
  } catch {
    return false;
  }
};
