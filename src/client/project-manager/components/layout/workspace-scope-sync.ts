import { useCallback, useEffect, useRef } from "react";
import { api } from "../../api";
import { activateWorkspace } from "../../services/workspace-activate-client";
import type { WorkspaceProject } from "../../types";

const SCOPE_ACK_TIMEOUT_MS = 3000;
const RECONNECT_SCOPE_RESYNC_DEBOUNCE_MS = 15000;

type WorkspaceScopeAckPayload = {
  readonly requestId: string;
  readonly status: "applied" | "rejected";
  readonly workspacePath: string | null;
};

const createScopeRequestId = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `scope-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const resolveScopeAckPayload = (payload: unknown): WorkspaceScopeAckPayload | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const candidate = payload as {
    readonly requestId?: unknown;
    readonly status?: unknown;
    readonly workspacePath?: unknown;
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
  };
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
      const requestId = createScopeRequestId();
      const scopePath = params.workspace?.path ?? null;
      const scopeSlug = params.workspace?.slug ?? null;
      const syncToken = ++latestScopeSyncTokenRef.current;
      api.setWorkspaceScope({
        workspacePath: scopePath,
        workspaceSlug: scopeSlug,
        requestId,
        reason: params.reason,
      });
      const ack = await new Promise<WorkspaceScopeAckPayload | null>((resolve) => {
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
      if (
        !params.activateAfterAck ||
        !params.workspace ||
        !ack ||
        ack.status !== "applied" ||
        ack.workspacePath !== params.workspace.path ||
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
