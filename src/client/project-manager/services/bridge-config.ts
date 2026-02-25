export type ApiConfig = {
  readonly wsUrl: string;
  readonly httpUrl: string;
};

const DEFAULT_WS_URL = "ws://127.0.0.1:8080";
const DEFAULT_HTTP_URL = "http://127.0.0.1:8080";

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/g, "");

const coerceWsUrl = (httpUrl: string): string | null => {
  if (httpUrl.startsWith("https://")) {
    return `wss://${httpUrl.slice("https://".length)}`;
  }
  if (httpUrl.startsWith("http://")) {
    return `ws://${httpUrl.slice("http://".length)}`;
  }
  return null;
};

const coerceHttpUrl = (wsUrl: string): string | null => {
  if (wsUrl.startsWith("wss://")) {
    return `https://${wsUrl.slice("wss://".length)}`;
  }
  if (wsUrl.startsWith("ws://")) {
    return `http://${wsUrl.slice("ws://".length)}`;
  }
  return null;
};

export const resolveBridgeConfig = (): ApiConfig => {
  const globalScope = window as typeof window & {
    codeaiBridgeConfig?: Partial<ApiConfig>;
  };
  const raw = globalScope.codeaiBridgeConfig;
  const rawWsUrl = readNonEmptyString(raw?.wsUrl);
  const rawHttpUrl = readNonEmptyString(raw?.httpUrl);

  const wsUrl =
    rawWsUrl ??
    (rawHttpUrl ? coerceWsUrl(rawHttpUrl) : null) ??
    DEFAULT_WS_URL;
  const httpUrl =
    rawHttpUrl ??
    (rawWsUrl ? coerceHttpUrl(rawWsUrl) : null) ??
    DEFAULT_HTTP_URL;

  return {
    wsUrl: stripTrailingSlashes(wsUrl),
    httpUrl: stripTrailingSlashes(httpUrl),
  };
};
