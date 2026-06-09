import type { OutgoingMessage } from "../core-stream-message-types";

export type DialogApi = {
  readonly listDialogs: (
    workspaceSlug: string,
    options?: DialogRequestOptions | string
  ) => string;
  readonly openDialog: (
    workspaceSlug: string,
    dialogId: string,
    options?: DialogRequestOptions | string
  ) => string;
  readonly requestDialogHistory: (
    workspaceSlug: string,
    dialogId: string,
    options?: DialogHistoryRequestOptions | string
  ) => string;
  readonly sendDialogMessage: (
    workspaceSlug: string,
    dialogId: string,
    content: string,
    options?: DialogSendRequestOptions | string
  ) => string | null;
};

type DialogRequestOptions = {
  readonly requestId?: string;
  readonly workspacePath?: string;
};

type DialogHistoryRequestOptions = DialogRequestOptions & {
  readonly cursor?: number;
};

type DialogSendRequestOptions = DialogRequestOptions & {
  readonly turnOptions?: Record<string, unknown>;
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
  listDialogs: (workspaceSlug, options) => {
    const requestId =
      typeof options === "string" ? options : options?.requestId ?? undefined;
    const resolvedRequestId = requestId ?? createRequestId("dialog-list");
    send({
      type: "dialog:list",
      payload: {
        requestId: resolvedRequestId,
        workspaceSlug,
        ...(typeof options === "object" && options?.workspacePath
          ? { workspacePath: options.workspacePath }
          : {}),
      },
    });
    return resolvedRequestId;
  },
  openDialog: (workspaceSlug, dialogId, options) => {
    const requestId =
      typeof options === "string" ? options : options?.requestId ?? undefined;
    const resolvedRequestId = requestId ?? createRequestId("dialog-open");
    send({
      type: "dialog:open",
      payload: {
        requestId: resolvedRequestId,
        workspaceSlug,
        dialogId,
        ...(typeof options === "object" && options?.workspacePath
          ? { workspacePath: options.workspacePath }
          : {}),
      },
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
        ...(typeof options === "object" && options?.workspacePath
          ? { workspacePath: options.workspacePath }
          : {}),
      },
    });
    return resolvedRequestId;
  },
  sendDialogMessage: (workspaceSlug, dialogId, content, options) => {
    if (!content.trim()) {
      return null;
    }
    const requestId =
      typeof options === "string" ? options : options?.requestId ?? undefined;
    const resolvedRequestId = requestId ?? createRequestId("dialog-send");
    send({
      type: "dialog:send",
      payload: {
        requestId: resolvedRequestId,
        workspaceSlug,
        dialogId,
        content,
        ...(typeof options === "object" && options?.workspacePath
          ? { workspacePath: options.workspacePath }
          : {}),
        ...(typeof options === "object" && options?.turnOptions
          ? { turnOptions: options.turnOptions }
          : {}),
      },
    });
    return resolvedRequestId;
  },
});
