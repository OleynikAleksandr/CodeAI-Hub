type ClientContext = "vscode" | "standalone";
type WindowMode = "main" | "detached";

export type WindowContext = {
  readonly mode: WindowMode;
  readonly sessionId: string | null;
};

const DEFAULT_WINDOW_CONTEXT: WindowContext = {
  mode: "main",
  sessionId: null,
};

let cachedClientContext: ClientContext | undefined;
let cachedWindowContext: WindowContext | undefined;

const resolveClientContext = (): ClientContext => {
  if (cachedClientContext) {
    return cachedClientContext;
  }
  if (typeof window === "undefined") {
    cachedClientContext = "vscode";
    return cachedClientContext;
  }
  const globalScope = window as typeof window & {
    __CODEAI_CLIENT_CONTEXT?: ClientContext;
  };
  cachedClientContext =
    globalScope.__CODEAI_CLIENT_CONTEXT === "standalone"
      ? "standalone"
      : "vscode";
  return cachedClientContext;
};

const resolveWindowContext = (): WindowContext => {
  if (cachedWindowContext) {
    return cachedWindowContext;
  }
  if (typeof window === "undefined") {
    cachedWindowContext = DEFAULT_WINDOW_CONTEXT;
    return cachedWindowContext;
  }
  const globalScope = window as typeof window & {
    __CODEAI_WINDOW_CONTEXT?: Partial<WindowContext>;
  };
  const candidate = globalScope.__CODEAI_WINDOW_CONTEXT;
  if (
    !candidate ||
    (candidate.mode !== "detached" && candidate.mode !== "main")
  ) {
    cachedWindowContext = DEFAULT_WINDOW_CONTEXT;
    return cachedWindowContext;
  }
  const sessionId =
    typeof candidate.sessionId === "string" && candidate.sessionId.length > 0
      ? candidate.sessionId
      : null;
  cachedWindowContext = {
    mode: candidate.mode,
    sessionId,
  };
  return cachedWindowContext;
};

export const isStandaloneClient = (): boolean =>
  resolveClientContext() === "standalone";

export const getWindowContext = (): WindowContext => resolveWindowContext();

export const isDetachedWindow = (): boolean =>
  resolveWindowContext().mode === "detached";
