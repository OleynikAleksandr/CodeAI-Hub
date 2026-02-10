import { api } from "../api";
import type {
  WorkspaceSelectAckPayload,
  WorkspaceScopeSyncReason,
} from "../core-stream-message-types";

const SCOPE_ACK_TIMEOUT_MS = 3000;

export const createWorkspaceSelectRequestId = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `workspace-select-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const resolveWorkspaceSelectAckPayload = (
  payload: unknown
): WorkspaceSelectAckPayload | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const candidate = payload as {
    readonly requestId?: unknown;
    readonly status?: unknown;
    readonly workspaceRoot?: unknown;
    readonly selectionId?: unknown;
    readonly error?: unknown;
  };
  if (
    typeof candidate.requestId !== "string" ||
    (candidate.status !== "applied" && candidate.status !== "rejected") ||
    !(candidate.workspaceRoot === null || typeof candidate.workspaceRoot === "string") ||
    !(candidate.selectionId === null || typeof candidate.selectionId === "string")
  ) {
    return null;
  }
  return {
    requestId: candidate.requestId,
    status: candidate.status,
    workspaceRoot: candidate.workspaceRoot,
    selectionId: candidate.selectionId,
    error:
      candidate.error === undefined || candidate.error === null
        ? null
        : String(candidate.error),
  };
};

export const syncWorkspaceSelectWithAck = async (params: {
  readonly workspaceRoot: string | null;
  readonly reason: WorkspaceScopeSyncReason;
}): Promise<WorkspaceSelectAckPayload | null> => {
  const requestId = createWorkspaceSelectRequestId();

  api.selectWorkspace({
    requestId,
    workspaceRoot: params.workspaceRoot,
    reason: params.reason,
  });

  return new Promise<WorkspaceSelectAckPayload | null>((resolve) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, SCOPE_ACK_TIMEOUT_MS);
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type !== "workspace:select:ack") {
        return;
      }
      const parsed = resolveWorkspaceSelectAckPayload(message.payload);
      if (!parsed || parsed.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(parsed);
    });
  });
};
