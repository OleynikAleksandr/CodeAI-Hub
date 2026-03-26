import type { OutgoingMessage } from "../core-stream-message-types";

export type DialogApi = {
  readonly listDialogs: (workspaceSlug: string, requestId?: string) => string;
  readonly openDialog: (
    workspaceSlug: string,
    dialogId: string,
    requestId?: string
  ) => string;
  readonly requestDialogHistory: (
    workspaceSlug: string,
    dialogId: string,
    options?: { readonly cursor?: number; readonly requestId?: string } | string
  ) => string;
  readonly sendDialogMessage: (
    workspaceSlug: string,
    dialogId: string,
    content: string,
    requestId?: string
  ) => string | null;
  readonly sendSwitchRequest: (
    sessionId: string,
    mode: "retry_in_place" | "switch_model" | "switch_provider",
    targetProviderId?: string,
    targetModelId?: string
  ) => void;
};

const createRequestId = (prefix: string): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createDialogApi = (
  send: (message: OutgoingMessage) => void
): DialogApi => ({
  listDialogs: (workspaceSlug, requestId) => {
    const resolvedRequestId = requestId ?? createRequestId("dialog-list");
    send({
      type: "dialog:list",
      payload: { requestId: resolvedRequestId, workspaceSlug },
    });
    return resolvedRequestId;
  },
  openDialog: (workspaceSlug, dialogId, requestId) => {
    const resolvedRequestId = requestId ?? createRequestId("dialog-open");
    send({
      type: "dialog:open",
      payload: { requestId: resolvedRequestId, workspaceSlug, dialogId },
    });
    return resolvedRequestId;
  },
  requestDialogHistory: (workspaceSlug, dialogId, options) => {
    const requestId =
      typeof options === "string" ? options : options?.requestId ?? undefined;
    const resolvedRequestId = requestId ?? createRequestId("dialog-history");
    const cursor =
      typeof options === "object" &&
      options &&
      typeof options.cursor === "number" &&
      Number.isFinite(options.cursor)
        ? Math.max(0, Math.trunc(options.cursor))
        : undefined;
    send({
      type: "dialog:history",
      payload: {
        requestId: resolvedRequestId,
        workspaceSlug,
        dialogId,
        ...(cursor !== undefined ? { cursor } : {}),
      },
    });
    return resolvedRequestId;
  },
  sendDialogMessage: (workspaceSlug, dialogId, content, requestId) => {
    if (!content.trim()) {
      return null;
    }
    const resolvedRequestId = requestId ?? createRequestId("dialog-send");
    send({
      type: "dialog:send",
      payload: { requestId: resolvedRequestId, workspaceSlug, dialogId, content },
    });
    return resolvedRequestId;
  },
  sendSwitchRequest: (sessionId, mode, targetProviderId, targetModelId) => {
    send({
      type: "dialog:switch:request",
      payload: {
        sessionId,
        mode,
        ...(targetProviderId ? { targetProviderId } : {}),
        ...(targetModelId ? { targetModelId } : {}),
      },
    });
  },
});
