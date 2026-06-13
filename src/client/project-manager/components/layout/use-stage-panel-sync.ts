import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import { resolveStageSyncPayload } from "./workspace-tree-branch-nodes";
import type { SessionResumeIntent } from "./workspace-tree-auto-select";

const WORKFLOW_STATE_LAST_ACTIVE_SOURCE = "workflow-state-last-active";

/**
 * Resolves artifact + session for a given stage and listens for
 * `pm:stage:activated` so that sidebar tree clicks trigger panel sync.
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
  const [pendingCoreActivation, setPendingCoreActivation] = useState<{
    readonly seenUpdatedAt: string | null;
    readonly stage: string;
  } | null>(null);
  const lastWorkflowStateActivationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          readonly source?: string;
          readonly stage?: string;
        }>
      ).detail;
      const stage = detail?.stage;
      if (typeof stage !== "string") {
        return;
      }
      syncPanelsToStage(stage);
      if (detail?.source === "core-workflow-stage-activate") {
        setPendingCoreActivation({
          seenUpdatedAt: workflowState?.updatedAt ?? null,
          stage,
        });
      } else {
        setPendingCoreActivation(null);
      }
    };
    window.addEventListener("pm:stage:activated", handler);
    return () => window.removeEventListener("pm:stage:activated", handler);
  }, [syncPanelsToStage, workflowState?.updatedAt]);

  useEffect(() => {
    if (!pendingCoreActivation) {
      return;
    }
    const updatedAt = workflowState?.updatedAt ?? null;
    if (!updatedAt || updatedAt === pendingCoreActivation.seenUpdatedAt) {
      return;
    }
    syncPanelsToStage(pendingCoreActivation.stage);
    setPendingCoreActivation((current) =>
      current?.stage === pendingCoreActivation.stage &&
      current.seenUpdatedAt === pendingCoreActivation.seenUpdatedAt
        ? null
        : current
    );
  }, [pendingCoreActivation, syncPanelsToStage, workflowState?.updatedAt]);

  useEffect(() => {
    const lastActive = workflowState?.lastActive;
    if (!lastActive) {
      return;
    }
    const activationKey = `${workflowState.workspaceSlug}:${lastActive.stage}`;
    if (lastWorkflowStateActivationKeyRef.current === activationKey) {
      return;
    }
    lastWorkflowStateActivationKeyRef.current = activationKey;
    window.dispatchEvent(
      new CustomEvent("pm:stage:activated", {
        detail: {
          source: WORKFLOW_STATE_LAST_ACTIVE_SOURCE,
          stage: lastActive.stage,
        },
      })
    );
  }, [workflowState?.lastActive, workflowState?.workspaceSlug]);

  return syncPanelsToStage;
};
