import { useCallback, useRef } from "react";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import { resolveLatestStageChain } from "./workspace-tree-branch-nodes";

export type SessionResumeIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly sessionKind: "collector" | "reviewer" | null;
  readonly runSlug: string | null;
};

type WorkspaceTreeAutoSelectParams = {
  readonly selectedWorkspaceId?: string;
  readonly workspacePath?: string;
  readonly workspaceSlug?: string | null;
  readonly virtualSimulationArtifactAvailable: boolean;
  readonly onSelectArtifact: (artifactPath: string, label: string) => void;
  readonly onResumeSession: (payload: SessionResumeIntent) => void;
  readonly onClearArtifactWithTool: (activeTool: string) => void;
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

      // Resolve the latest VS chain (higher-priority step)
      const vsChain = resolveLatestStageChain(state.continuity.chains, "virtual_simulation");
      const vsLast = vsChain?.segments.at(-1) ?? null;

      if (vsLast) {
        // VS session exists → open VS as the latest step
        const vsArtifactPath =
          `.codeai-hub/${params.workspaceSlug}/virtual_simulation/virtual-simulation.md`;
        if (params.virtualSimulationArtifactAvailable) {
          params.onSelectArtifact(vsArtifactPath, "virtual-simulation.md");
        } else {
          params.onClearArtifactWithTool("VIRTUAL SIMULATION");
        }
        params.onResumeSession({
          providerId: vsLast.providerId,
          providerSessionId: vsLast.providerSessionId,
          workspacePath: params.workspacePath,
          workspaceSlug: params.workspaceSlug,
          initiativeSlug: params.workspaceSlug,
          stage: "virtual_simulation",
          sessionKind: "collector",
          runSlug: null,
        });
        pendingWorkspaceIdRef.current = null;
        return;
      }

      // Fallback: open Description step
      const branch = state.description;
      const hasDraftOrFinal = Boolean(branch?.finalPath || branch?.draftPath);
      const hasUnsubmittedQuestionnaire = Boolean(
        branch?.questionnairePath &&
          !hasDraftOrFinal &&
          !branch?.session?.providerSessionId
      );
      const artifactPath = branch?.finalPath ?? branch?.draftPath ?? null;
      const artifactLabel = branch?.finalPath
        ? "Final_Description.md"
        : branch?.draftPath
          ? "description.md"
          : null;
      if (artifactPath && artifactLabel) {
        params.onSelectArtifact(artifactPath, artifactLabel);
      }
      if (branch?.session?.providerSessionId) {
        const isReviewerSession =
          branch.sessionKind === "reviewer" || Boolean(branch.finalPath);
        params.onResumeSession({
          providerId: branch.session.providerId,
          providerSessionId: branch.session.providerSessionId,
          workspacePath: params.workspacePath,
          workspaceSlug: params.workspaceSlug,
          initiativeSlug: params.workspaceSlug,
          stage: "description",
          sessionKind: isReviewerSession ? "reviewer" : "collector",
          runSlug: isReviewerSession ? "reviewer" : null,
        });
      }
      if (hasUnsubmittedQuestionnaire) return;
      if (artifactPath || branch?.session?.providerSessionId) {
        pendingWorkspaceIdRef.current = null;
      }
    },
    [
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
