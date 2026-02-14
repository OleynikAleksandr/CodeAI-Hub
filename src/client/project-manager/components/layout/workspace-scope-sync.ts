import { useCallback, useEffect, useRef } from "react";
import { api } from "../../api";
import { activateWorkspace } from "../../services/workspace-activate-client";
import {
  createWorkspaceSelectRequestId,
  syncWorkspaceSelectWithAck,
} from "../../services/workspace-scope-handshake";
import { workspaceSnapshotStore } from "../../services/workspace-snapshot-store";
import type { WorkspaceProject } from "../../types";

const RECONNECT_SCOPE_RESYNC_DEBOUNCE_MS = 15000;
const syncWorkspaceSelection = async (params: {
  readonly workspace: WorkspaceProject | null;
  readonly reason: "workspace_selected" | "workspace_cleared" | "reconnect";
}) => {
  const ack = await syncWorkspaceSelectWithAck({
    workspaceRoot: params.workspace?.path ?? null,
    reason: params.reason,
  });
  if (ack && ack.status === "applied") {
    workspaceSnapshotStore.applySelectAck(ack);
    if (ack.workspaceRoot) {
      api.requestWorkspaceSnapshot({
        requestId: createWorkspaceSelectRequestId(),
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
      const ack = await syncWorkspaceSelection({
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
        // After Core restart/reconnect we must re-activate the workspace,
        // otherwise runtime session registry stays empty and PM can't open sessions.
        activateAfterAck: true,
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
