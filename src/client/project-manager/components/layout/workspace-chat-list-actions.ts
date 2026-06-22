import { api } from "../../api";

const STANDALONE_SESSION_MODE = "standalone-session";
const STANDALONE_POPUP_FEATURES = "popup,width=1180,height=900";
const PENDING_SESSION_ID = "__pending_standalone_session__";
const SESSION_READY_MESSAGE = "codeai:standalone-session-ready";
const SESSION_READY_RETRY_DELAYS_MS = [0, 100, 350, 1000] as const;

const resolveTargetOrigin = (): string =>
  window.location.origin === "null" ? "*" : window.location.origin;

const buildStandaloneSessionUrl = (params: {
  readonly createdAfter?: number;
  readonly pending?: boolean;
  readonly providerId?: string;
  readonly providerSessionId?: string;
  readonly sessionId: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): string => {
  const base = window.location.href.split("?")[0];
  const query = new URLSearchParams({
    mode: STANDALONE_SESSION_MODE,
    sessionId: params.sessionId,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  if (params.pending) {
    query.set("pending", "1");
  }
  if (params.providerId) {
    query.set("providerId", params.providerId);
  }
  if (params.providerSessionId) {
    query.set("providerSessionId", params.providerSessionId);
  }
  if (typeof params.createdAfter === "number") {
    query.set("createdAfter", String(params.createdAfter));
  }
  return `${base}?${query.toString()}`;
};

export const openStandaloneSessionPlaceholder = (params: {
  readonly createdAfter: number;
  readonly providerId: string;
  readonly providerSessionId?: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Window | null =>
  window.open(
    buildStandaloneSessionUrl({
      createdAfter: params.createdAfter,
      pending: true,
      providerId: params.providerId,
      providerSessionId: params.providerSessionId,
      sessionId: PENDING_SESSION_ID,
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
    }),
    "_blank",
    STANDALONE_POPUP_FEATURES
  );

export const openStandaloneSessionWindow = (params: {
  readonly placeholder?: Window | null;
  readonly sessionId: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): void => {
  const url = buildStandaloneSessionUrl(params);
  if (params.placeholder && !params.placeholder.closed) {
    const placeholder = params.placeholder;
    const message = {
      sessionId: params.sessionId,
      type: SESSION_READY_MESSAGE,
      url,
      workspacePath: params.workspacePath,
    };
    const targetOrigin = resolveTargetOrigin();
    for (const delay of SESSION_READY_RETRY_DELAYS_MS) {
      window.setTimeout(() => {
        if (!placeholder.closed) {
          placeholder.postMessage(message, targetOrigin);
        }
      }, delay);
    }
    placeholder.focus();
    return;
  }
  window.open(url, "_blank", STANDALONE_POPUP_FEATURES);
};

export const requestWorkspaceChatAction = async (params: {
  readonly method: "DELETE" | "PATCH";
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly title?: string;
  readonly workspacePath: string;
}): Promise<void> => {
  const httpUrl = api.getHttpUrl();
  if (!httpUrl) {
    throw new Error("Core HTTP API unavailable.");
  }
  const { method, ...chat } = params;
  const query = new URLSearchParams({
    providerId: chat.providerId,
    providerSessionId: chat.providerSessionId,
    workspacePath: chat.workspacePath,
  });
  const response = await fetch(
    `${httpUrl}/api/v1/standalone-chats${method === "DELETE" ? `?${query}` : ""}`,
    method === "DELETE"
      ? { method }
      : {
          body: JSON.stringify(chat),
          headers: { "Content-Type": "application/json" },
          method,
        }
  );
  if (!response.ok) {
    throw new Error(
      `Unable to ${method === "DELETE" ? "delete" : "rename"} chat.`
    );
  }
};
