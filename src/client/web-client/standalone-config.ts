import type { CoreBridgeConfig } from "../ui/src/core-bridge/types";

type StandaloneWindowMode = "main" | "detached";

export type StandaloneWindowContext = {
  readonly mode: StandaloneWindowMode;
  readonly sessionId: string | null;
};

const DEFAULT_WINDOW_CONTEXT: StandaloneWindowContext = {
  mode: "main",
  sessionId: null,
};

const applyWindowContext = (context: StandaloneWindowContext): void => {
  if (typeof window === "undefined") {
    return;
  }
  const globalScope = window as typeof window & {
    __CODEAI_WINDOW_CONTEXT?: StandaloneWindowContext;
  };
  globalScope.__CODEAI_WINDOW_CONTEXT = context;
};

const resolveWindowContextFromUrl = (url: URL): StandaloneWindowContext => {
  const windowMode = url.searchParams.get("windowMode");
  const sessionIdParam = url.searchParams.get("sessionId");
  const mode: StandaloneWindowMode =
    windowMode === "detached" ? "detached" : "main";
  const sessionId =
    typeof sessionIdParam === "string" && sessionIdParam.trim().length > 0
      ? sessionIdParam
      : null;
  if (mode === "main") {
    return DEFAULT_WINDOW_CONTEXT;
  }
  return { mode, sessionId };
};

export const deriveStandaloneCoreConfig = (): CoreBridgeConfig | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const url = new URL(window.location.href);
    applyWindowContext(resolveWindowContextFromUrl(url));
    const explicitHttp = url.searchParams.get("coreHttpUrl");
    const explicitWs = url.searchParams.get("coreWsUrl");
    if (explicitHttp && explicitWs) {
      return { httpUrl: explicitHttp, wsUrl: explicitWs };
    }
    const host = url.searchParams.get("coreHost");
    const portValue = url.searchParams.get("corePort");
    if (!(host && portValue)) {
      return null;
    }
    const port = Number.parseInt(portValue, 10);
    if (!Number.isFinite(port)) {
      return null;
    }
    const normalizedPort = Math.max(0, port);
    return {
      httpUrl: `http://${host}:${normalizedPort}`,
      wsUrl: `ws://${host}:${normalizedPort}/api/v1/stream`,
    };
  } catch {
    applyWindowContext(DEFAULT_WINDOW_CONTEXT);
    return null;
  }
};
