import { useCallback, useEffect } from "react";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import { resolveStageSyncPayload } from "./workspace-tree-branch-nodes";
import type { SessionResumeIntent } from "./workspace-tree-auto-select";

/**
 * Resolves artifact + session for a given stage, dispatches the
 * appropriate events, and listens for `pm:stage:activated` so that
 * toolbar clicks also trigger the same synchronisation.
 */
export const useStagePanelSync = (params: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly workspaceSlug: string | null;
  readonly workspacePath?: string;
  readonly virtualSimulationArtifactAvailable: boolean;
  readonly diagramModulesArtifactAvailable?: boolean;
  readonly foundationEnvelopeArtifactAvailable?: boolean;
  readonly selectArtifact: (path: string, label: string) => void;
  readonly dispatchDialogOpenIntent: (payload: SessionResumeIntent) => void;
  readonly clearArtifactWithTool: (activeTool: string) => void;
}): ((stage: string) => void) => {
  const {
    workflowState,
    workspaceSlug,
    workspacePath,
    virtualSimulationArtifactAvailable,
    diagramModulesArtifactAvailable,
    foundationEnvelopeArtifactAvailable,
    selectArtifact,
    dispatchDialogOpenIntent,
    clearArtifactWithTool,
  } = params;

  const syncPanelsToStage = useCallback(
    (stage: string) => {
      if (!workflowState || !workspaceSlug || !workspacePath) return;
      const p = resolveStageSyncPayload({
        stage,
        workflowState,
        workspaceSlug,
        workspacePath,
        virtualSimulationArtifactAvailable,
        diagramModulesArtifactAvailable,
        foundationEnvelopeArtifactAvailable,
      });
      if (p.artifact) selectArtifact(p.artifact.path, p.artifact.label);
      else if (p.clearTool) clearArtifactWithTool(p.clearTool);
      if (p.session) dispatchDialogOpenIntent(p.session);
    },
    [
      foundationEnvelopeArtifactAvailable,
      clearArtifactWithTool,
      diagramModulesArtifactAvailable,
      dispatchDialogOpenIntent,
      selectArtifact,
      virtualSimulationArtifactAvailable,
      workflowState,
      workspacePath,
      workspaceSlug,
    ]
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const stage = (event as CustomEvent<{ readonly stage?: string }>).detail
        ?.stage;
      if (typeof stage !== "string") {
        return;
      }
      syncPanelsToStage(stage);
    };
    window.addEventListener("pm:stage:activated", handler);
    return () => window.removeEventListener("pm:stage:activated", handler);
  }, [syncPanelsToStage]);

  return syncPanelsToStage;
};
