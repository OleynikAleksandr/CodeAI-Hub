import { useCallback, useEffect, useRef } from "react";
import { api } from "../../api";
import type { WorkspaceSelectAckPayload } from "../../core-stream-message-types";
import { activateWorkspace } from "../../services/workspace-activate-client";
import { workspaceSnapshotStore } from "../../services/workspace-snapshot-store";
import type { WorkspaceProject } from "../../types";

const RECONNECT_SCOPE_RESYNC_DEBOUNCE_MS = 15000;
const WORKSPACE_SELECT_ACK_TIMEOUT_MS = 3000;

const createRequestId = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `workspace-select-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseWorkspaceSelectAckPayload = (
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
    (candidate.status !== "applied" && candidate.status !== "rejected")
  ) {
    return null;
  }
  if (!(candidate.workspaceRoot === null || typeof candidate.workspaceRoot === "string")) {
    return null;
  }
  if (!(candidate.selectionId === null || typeof candidate.selectionId === "string")) {
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

const waitWorkspaceSelectAck = async (
  requestId: string
): Promise<WorkspaceSelectAckPayload | null> =>
  new Promise<WorkspaceSelectAckPayload | null>((resolve) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, WORKSPACE_SELECT_ACK_TIMEOUT_MS);
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type !== "workspace:select:ack") {
        return;
      }
      const parsed = parseWorkspaceSelectAckPayload(message.payload);
      if (!parsed || parsed.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(parsed);
    });
  });

const syncWorkspaceSelectWithAck = async (params: {
  readonly workspace: WorkspaceProject | null;
  readonly reason: "workspace_selected" | "workspace_cleared" | "reconnect";
}): Promise<WorkspaceSelectAckPayload | null> => {
  const requestId = createRequestId();
  const workspaceRoot = params.workspace?.path ?? null;

  api.selectWorkspace({
    requestId,
    workspaceRoot,
    reason: params.reason,
  });

  const ack = await waitWorkspaceSelectAck(requestId);
  if (ack && ack.status === "applied") {
    workspaceSnapshotStore.applySelectAck(ack);
    if (ack.workspaceRoot) {
      api.requestWorkspaceSnapshot({
        requestId: createRequestId(),
        workspaceRoot: ack.workspaceRoot,
        reason: "resync",
      });
    }
  }
  return ack;
};

export const useWorkspaceScopeSync = (activeWorkspace?: WorkspaceProject) => {
  const latestScopeSyncTokenRef = useRef(0);
  const lastReconnectScopeSyncAtRef = useRef(0);

  const syncWorkspaceScope = useCallback(
    async (params: {
      readonly workspace: WorkspaceProject | null;
      readonly reason: "workspace_selected" | "workspace_cleared" | "reconnect";
      readonly activateAfterAck: boolean;
    }) => {
      const syncToken = ++latestScopeSyncTokenRef.current;
      const ack = await syncWorkspaceSelectWithAck({
        workspace: params.workspace,
        reason: params.reason,
      });
      if (
        !params.activateAfterAck ||
        !params.workspace ||
        !ack ||
        ack.status !== "applied" ||
        ack.workspaceRoot !== params.workspace.path ||
        syncToken !== latestScopeSyncTokenRef.current
      ) {
        return;
      }
      const httpUrl = api.getHttpUrl();
      if (!httpUrl) {
        return;
      }
      activateWorkspace({
        httpUrl,
        workspacePath: params.workspace.path,
        workspaceSlug: params.workspace.slug,
      }).catch(() => {});
    },
    []
  );

  useEffect(() => {
    void syncWorkspaceScope({
      workspace: activeWorkspace ?? null,
      reason: activeWorkspace ? "workspace_selected" : "workspace_cleared",
      activateAfterAck: Boolean(activeWorkspace),
    });
  }, [
    activeWorkspace?.id,
    activeWorkspace?.path,
    activeWorkspace?.slug,
    syncWorkspaceScope,
  ]);

  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type !== "core:state" || !activeWorkspace) {
        return;
      }
      const now = Date.now();
      if (
        now - lastReconnectScopeSyncAtRef.current <
        RECONNECT_SCOPE_RESYNC_DEBOUNCE_MS
      ) {
        return;
      }
      lastReconnectScopeSyncAtRef.current = now;
      void syncWorkspaceScope({
        workspace: activeWorkspace,
        reason: "reconnect",
        activateAfterAck: false,
      });
    });
    return () => {
      unsubscribe();
    };
  }, [
    activeWorkspace?.id,
    activeWorkspace?.path,
    activeWorkspace?.slug,
    syncWorkspaceScope,
  ]);
};
