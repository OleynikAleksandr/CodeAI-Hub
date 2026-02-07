import { api } from "../api";
import type {
  WorkspaceScopeAckPayload,
  WorkspaceScopeSyncReason,
} from "../core-stream-message-types";

const SCOPE_ACK_TIMEOUT_MS = 3000;

const createScopeRequestId = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `scope-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const resolveScopeAckPayload = (
  payload: unknown
): WorkspaceScopeAckPayload | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const candidate = payload as {
    readonly requestId?: unknown;
    readonly status?: unknown;
    readonly workspacePath?: unknown;
    readonly error?: unknown;
  };
  if (
    typeof candidate.requestId !== "string" ||
    (candidate.status !== "applied" && candidate.status !== "rejected") ||
    !(candidate.workspacePath === null || typeof candidate.workspacePath === "string")
  ) {
    return null;
  }
  return {
    requestId: candidate.requestId,
    status: candidate.status,
    workspacePath: candidate.workspacePath,
    error:
      candidate.error === undefined || candidate.error === null
        ? null
        : String(candidate.error),
  };
};

export const syncWorkspaceScopeWithAck = async (params: {
  readonly workspacePath: string | null;
  readonly workspaceSlug?: string | null;
  readonly reason: WorkspaceScopeSyncReason;
}): Promise<WorkspaceScopeAckPayload | null> => {
  const requestId = createScopeRequestId();

  api.setWorkspaceScope({
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
    requestId,
    reason: params.reason,
  });

  return new Promise<WorkspaceScopeAckPayload | null>((resolve) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, SCOPE_ACK_TIMEOUT_MS);
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type !== "workspace:scope:ack") {
        return;
      }
      const parsed = resolveScopeAckPayload(message.payload);
      if (!parsed || parsed.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(parsed);
    });
  });
};
