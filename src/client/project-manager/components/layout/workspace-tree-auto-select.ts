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

  const markWorkspaceChanged = useCallback(() => {
    pendingWorkspaceIdRef.current = params.selectedWorkspaceId ?? null;
  }, [params.selectedWorkspaceId]);

  const resetPendingSelection = useCallback(() => {
    pendingWorkspaceIdRef.current = null;
  }, []);

  const handleStateUpdate = useCallback(
    (state: WorkflowStateSnapshot | null) => {
      if (pendingWorkspaceIdRef.current !== params.selectedWorkspaceId) {
        return;
      }
      if (!state || !params.workspaceSlug || !params.workspacePath) {
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

      dispatchStageActivated(startupStage);
      if (payload.artifact) {
        params.onSelectArtifact(payload.artifact.path, payload.artifact.label);
      } else if (payload.clearTool) {
        params.onClearArtifactWithTool(payload.clearTool);
      }
      if (payload.session) {
        params.onResumeSession(payload.session);
      }
      pendingWorkspaceIdRef.current = null;
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
