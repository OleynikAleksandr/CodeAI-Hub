import { useCallback, useRef } from "react";
import { api } from "../../api";
import type { WorkspaceProject } from "../../types";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { resolveWorkspaceSlug } from "./main-area-utils";

export const VIRTUAL_SIMULATION_TOOL_LABEL = "VIRTUAL SIMULATION" as const;

type PendingSessionCreate = { readonly providerTitle: string } | null;

type DialogOpenIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly sessionKind: "collector" | "reviewer" | null;
  readonly runSlug: string | null;
};

type UseWorkflowToolSelectParams = {
  readonly activeWorkspace?: WorkspaceProject;
  readonly setActiveTool: (value: string) => void;
  readonly setPreferredSessionId: (value: string | null) => void;
  readonly setPendingSessionCreate: (value: PendingSessionCreate) => void;
};

export const useWorkflowToolSelect = (
  params: UseWorkflowToolSelectParams
): ((tool: string) => void) => {
  const {
    activeWorkspace,
    setActiveTool,
    setPendingSessionCreate,
    setPreferredSessionId,
  } = params;
  const workflowStepStartServiceRef = useRef(new WorkflowStepStartService());
  const virtualSimulationStartInFlightRef = useRef(false);

  return useCallback(
    (tool: string) => {
      setActiveTool(tool);

      if (tool !== VIRTUAL_SIMULATION_TOOL_LABEL) {
        return;
      }
      if (!activeWorkspace?.path) {
        return;
      }
      const workspaceSlug = resolveWorkspaceSlug(activeWorkspace);
      if (!workspaceSlug) {
        return;
      }
      const provider = api.getIdeaCollectorProviders().at(0);
      if (!provider) {
        return;
      }
      if (virtualSimulationStartInFlightRef.current) {
        return;
      }
      virtualSimulationStartInFlightRef.current = true;
      setPendingSessionCreate({
        providerTitle: provider.title ?? provider.id,
      });

      const dialogIntent: DialogOpenIntent = {
        providerId: provider.id,
        providerSessionId: null,
        workspacePath: activeWorkspace.path,
        workspaceSlug,
        initiativeSlug: workspaceSlug,
        stage: "virtual_simulation",
        sessionKind: "reviewer",
        runSlug: null,
      };

      void workflowStepStartServiceRef.current
        .startVirtualSimulation({
          workspaceName: activeWorkspace.name,
          workspacePath: activeWorkspace.path,
          workspaceSlug,
          providerId: provider.id,
          onSessionCreated: setPreferredSessionId,
        })
        .then(() => {
          window.dispatchEvent(
            new CustomEvent("pm:dialog:open", {
              detail: dialogIntent,
            })
          );
        })
        .catch((error: unknown) => {
          // keep best-effort; surface in console for now (avoids dead-click UX)
          console.warn(
            "[PM] Failed to start Virtual Simulation workflow step",
            error
          );
        })
        .finally(() => {
          virtualSimulationStartInFlightRef.current = false;
          setPendingSessionCreate(null);
        });
    },
    [activeWorkspace, setActiveTool, setPendingSessionCreate, setPreferredSessionId]
  );
};
