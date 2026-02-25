import { useCallback, useRef } from "react";
import { api } from "../../api";
import type { WorkspaceProject } from "../../types";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { resolveWorkspaceSlug } from "./main-area-utils";

export const VIRTUAL_SIMULATION_TOOL_LABEL = "VIRTUAL SIMULATION" as const;

type PendingSessionCreate = { readonly providerTitle: string } | null;

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
      void workflowStepStartServiceRef.current
        .startVirtualSimulation({
          workspaceName: activeWorkspace.name,
          workspacePath: activeWorkspace.path,
          workspaceSlug,
          providerId: provider.id,
          onSessionCreated: setPreferredSessionId,
        })
        .catch(() => {
          // ignore: the step start will be best-effort until hint/error UX is added
        })
        .finally(() => {
          virtualSimulationStartInFlightRef.current = false;
          setPendingSessionCreate(null);
        });
    },
    [activeWorkspace, setActiveTool, setPendingSessionCreate, setPreferredSessionId]
  );
};
