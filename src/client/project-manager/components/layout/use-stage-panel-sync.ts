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
  readonly diagramFacadesArtifactAvailable?: boolean;
  readonly selectArtifact: (path: string, label: string) => void;
  readonly dispatchDialogOpenIntent: (payload: SessionResumeIntent) => void;
  readonly clearArtifactWithTool: (activeTool: string) => void;
}): ((stage: string, opts?: { skipSession?: boolean }) => void) => {
  const {
    workflowState,
    workspaceSlug,
    workspacePath,
    virtualSimulationArtifactAvailable,
    diagramModulesArtifactAvailable,
    diagramFacadesArtifactAvailable,
    selectArtifact,
    dispatchDialogOpenIntent,
    clearArtifactWithTool,
  } = params;

  const syncPanelsToStage = useCallback(
    (stage: string, opts?: { skipSession?: boolean }) => {
      if (!workflowState || !workspaceSlug || !workspacePath) return;
      const p = resolveStageSyncPayload({
        stage,
        workflowState,
        workspaceSlug,
        workspacePath,
        virtualSimulationArtifactAvailable,
        diagramModulesArtifactAvailable,
        diagramFacadesArtifactAvailable,
      });
      if (p.artifact) selectArtifact(p.artifact.path, p.artifact.label);
      else if (p.clearTool) clearArtifactWithTool(p.clearTool);
      if (!opts?.skipSession && p.session) dispatchDialogOpenIntent(p.session);
    },
    [clearArtifactWithTool, diagramFacadesArtifactAvailable, diagramModulesArtifactAvailable, dispatchDialogOpenIntent, selectArtifact, virtualSimulationArtifactAvailable, workflowState, workspacePath, workspaceSlug]
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const { stage, skipSession } = (event as CustomEvent).detail;
      syncPanelsToStage(stage, { skipSession });
    };
    window.addEventListener("pm:stage:activated", handler);
    return () => window.removeEventListener("pm:stage:activated", handler);
  }, [syncPanelsToStage]);

  return syncPanelsToStage;
};
