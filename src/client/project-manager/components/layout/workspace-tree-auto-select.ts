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

      // Resolve the latest DM chain (highest-priority step)
      const dmChain = resolveLatestStageChain(state.continuity.chains, "diagram_modules");
      const dmLast = dmChain?.segments.at(-1) ?? null;

      if (dmLast) {
        dispatchStageActivated("diagram_modules");
        const dmArtifactPath =
          `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`;
        if (params.diagramModulesArtifactAvailable) {
          params.onSelectArtifact(dmArtifactPath, "Module Graph");
        } else {
          params.onClearArtifactWithTool("Diagram Modules");
        }
        params.onResumeSession({
          providerId: dmLast.providerId,
          providerSessionId: dmLast.providerSessionId,
          workspacePath: params.workspacePath,
          workspaceSlug: params.workspaceSlug,
          initiativeSlug: params.workspaceSlug,
          stage: "diagram_modules",
          sessionKind: "collector",
          runSlug: null,
        });
        pendingWorkspaceIdRef.current = null;
        return;
      }

      // Resolve the latest VS chain (next-priority step)
      const vsChain = resolveLatestStageChain(state.continuity.chains, "virtual_simulation");
      const vsLast = vsChain?.segments.at(-1) ?? null;

      if (vsLast) {
        dispatchStageActivated("virtual_simulation");
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
      const descriptionSession = branch?.primarySession;
      const isCanonicalDraft = branch?.draftPath && /\/description\/Final_Description\.md$/.test(branch.draftPath);
      const validDraft = isCanonicalDraft ? branch?.draftPath : null;
      const hasDraftOrFinal = Boolean(branch?.finalPath || validDraft);
      const hasUnsubmittedQuestionnaire = Boolean(
        branch?.questionnairePath &&
          !hasDraftOrFinal &&
          !descriptionSession?.providerSessionId
      );
      const artifactPath = branch?.finalPath ?? validDraft ?? null;
      const artifactLabel = branch?.finalPath
        ? "Final_Description.md"
        : validDraft
          ? "Final_Description.md"
          : null;
      dispatchStageActivated("description");
      if (artifactPath && artifactLabel) {
        params.onSelectArtifact(artifactPath, artifactLabel);
      }
      if (descriptionSession?.providerSessionId) {
        params.onResumeSession({
          providerId: descriptionSession.providerId,
          providerSessionId: descriptionSession.providerSessionId,
          workspacePath: params.workspacePath,
          workspaceSlug: params.workspaceSlug,
          initiativeSlug: params.workspaceSlug,
          stage: "description",
          sessionKind: "collector",
          runSlug: null,
        });
      }
      if (hasUnsubmittedQuestionnaire) return;
      if (artifactPath || descriptionSession?.providerSessionId) {
        pendingWorkspaceIdRef.current = null;
      }
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
