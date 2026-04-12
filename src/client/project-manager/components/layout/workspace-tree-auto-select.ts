import { useCallback, useRef } from "react";
import {
  WORKFLOW_STAGE_ORDER,
  type WorkflowStageId,
  type WorkflowStateSnapshot,
} from "../../services/workflow-state-client";
import { resolveStageSyncPayload } from "./workspace-tree-branch-nodes";

const FALLBACK_STAGE: WorkflowStageId = "description";

const resolveLastActiveStage = (
  state: WorkflowStateSnapshot
): WorkflowStageId => {
  for (let i = WORKFLOW_STAGE_ORDER.length - 1; i >= 0; i--) {
    const stage = WORKFLOW_STAGE_ORDER[i]!;
    if (state.stages[stage] !== "idle") return stage;
  }
  return FALLBACK_STAGE;
};

export type SessionResumeIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly sessionKind: "collector" | null;
  readonly runSlug: string | null;
};

type WorkspaceTreeAutoSelectParams = {
  readonly selectedWorkspaceId?: string;
  readonly workspacePath?: string;
  readonly workspaceSlug?: string | null;
  readonly virtualSimulationArtifactAvailable: boolean;
  readonly diagramModulesArtifactAvailable: boolean;
  readonly onSelectArtifact: (artifactPath: string, label: string) => void;
  readonly onResumeSession: (payload: SessionResumeIntent) => void;
  readonly onClearArtifactWithTool: (activeTool: string) => void;
};

const dispatchStageActivated = (stage: string): void => {
  window.dispatchEvent(
    new CustomEvent("pm:stage:activated", {
      detail: { stage, source: "workspace-tree-auto-select" },
    })
  );
};

export const useWorkspaceTreeAutoSelect = (
  params: WorkspaceTreeAutoSelectParams
) => {
  const pendingWorkspaceIdRef = useRef<string | null>(null);
  // Track whether stage activation was already dispatched for the
  // current workspace — prevents duplicate pm:stage:activated / artifact
  // events on retry while still allowing the session dispatch to retry.
  const stageDispatchedRef = useRef(false);

  const markWorkspaceChanged = useCallback(() => {
    pendingWorkspaceIdRef.current = params.selectedWorkspaceId ?? null;
    stageDispatchedRef.current = false;
  }, [params.selectedWorkspaceId]);

  const resetPendingSelection = useCallback(() => {
    pendingWorkspaceIdRef.current = null;
    stageDispatchedRef.current = false;
  }, []);

  const handleStateUpdate = useCallback(
    (state: WorkflowStateSnapshot | null) => {
      // [DIAG] Session restore diagnostics — remove after investigation
      console.log("[AutoSelect] handleStateUpdate called", {
        pendingId: pendingWorkspaceIdRef.current,
        selectedId: params.selectedWorkspaceId,
        hasState: Boolean(state),
        slug: params.workspaceSlug,
        path: Boolean(params.workspacePath),
        stageDispatched: stageDispatchedRef.current,
      });
      if (pendingWorkspaceIdRef.current !== params.selectedWorkspaceId) {
        console.log("[AutoSelect] SKIP: pendingId mismatch");
        return;
      }
      if (!state || !params.workspaceSlug || !params.workspacePath) {
        console.log("[AutoSelect] SKIP: missing state/slug/path");
        return;
      }

      const startupStage = resolveLastActiveStage(state);
      const payload = resolveStageSyncPayload({
        stage: startupStage,
        workflowState: state,
        workspaceSlug: params.workspaceSlug,
        workspacePath: params.workspacePath,
        virtualSimulationArtifactAvailable:
          params.virtualSimulationArtifactAvailable,
        diagramModulesArtifactAvailable:
          params.diagramModulesArtifactAvailable,
      });

      console.log("[AutoSelect] resolved", {
        startupStage,
        hasSession: Boolean(payload.session),
        sessionProviderId: payload.session?.providerId ?? "null",
        chainsLength: state.continuity?.chains?.length ?? 0,
      });

      // Dispatch stage activation and artifact events only once per
      // workspace — retries should only attempt the session dispatch.
      if (!stageDispatchedRef.current) {
        stageDispatchedRef.current = true;
        dispatchStageActivated(startupStage);
        if (payload.artifact) {
          params.onSelectArtifact(payload.artifact.path, payload.artifact.label);
        } else if (payload.clearTool) {
          params.onClearArtifactWithTool(payload.clearTool);
        }
      }
      if (payload.session) {
        console.log("[AutoSelect] dispatching pm:dialog:open", payload.session.stage);
        params.onResumeSession(payload.session);
        pendingWorkspaceIdRef.current = null;
      } else {
        console.log("[AutoSelect] NO session — keeping pending for retry");
      }
      // If no session found (continuity chains may still be loading),
      // keep pendingWorkspaceIdRef alive so the next store snapshot
      // retries auto-select for the session dispatch only.
    },
    [
      params.diagramModulesArtifactAvailable,
      params.onClearArtifactWithTool,
      params.onResumeSession,
      params.onSelectArtifact,
      params.selectedWorkspaceId,
      params.virtualSimulationArtifactAvailable,
      params.workspacePath,
      params.workspaceSlug,
    ]
  );

  return {
    handleStateUpdate,
    markWorkspaceChanged,
    resetPendingSelection,
  };
};
