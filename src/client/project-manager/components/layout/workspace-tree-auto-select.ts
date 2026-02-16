import { useCallback, useRef } from "react";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";

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
  readonly onSelectArtifact: (artifactPath: string, label: string) => void;
  readonly onResumeSession: (payload: SessionResumeIntent) => void;
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
      if (hasUnsubmittedQuestionnaire) {
        return;
      }
      if (artifactPath || branch?.session?.providerSessionId) {
        pendingWorkspaceIdRef.current = null;
      }
    },
    [
      params.onResumeSession,
      params.onSelectArtifact,
      params.selectedWorkspaceId,
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
