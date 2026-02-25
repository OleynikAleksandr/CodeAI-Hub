import { useCallback, useRef } from "react";
import { api } from "../../api";
import type { WorkspaceProject } from "../../types";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { resolvePreferredWorkflowProviderId } from "../../services/workflow-provider-resolver";
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
      if (virtualSimulationStartInFlightRef.current) {
        return;
      }
      virtualSimulationStartInFlightRef.current = true;

      const providers = api.getIdeaCollectorProviders();
      const fallbackProvider = providers.at(0) ?? null;
      if (!fallbackProvider) {
        virtualSimulationStartInFlightRef.current = false;
        return;
      }
      setPendingSessionCreate({
        providerTitle: fallbackProvider.title ?? fallbackProvider.id,
      });

      void (async () => {
        const workflowState = await api.getWorkflowState(
          workspaceSlug,
          activeWorkspace.path
        );
        const preferredProviderId =
          resolvePreferredWorkflowProviderId({
            workflowState,
            providers,
          }) ?? fallbackProvider.id;
        const provider =
          providers.find((candidate) => candidate.id === preferredProviderId) ??
          fallbackProvider;

        const dialogIntent: DialogOpenIntent = {
          providerId: provider.id,
          providerSessionId: null,
          workspacePath: activeWorkspace.path,
          workspaceSlug,
          initiativeSlug: workspaceSlug,
          stage: "virtual_simulation",
          sessionKind: "collector",
          runSlug: null,
        };

        window.dispatchEvent(
          new CustomEvent("pm:dialog:open", {
            detail: dialogIntent,
          })
        );

        await workflowStepStartServiceRef.current.startVirtualSimulation({
          workspaceName: activeWorkspace.name,
          workspacePath: activeWorkspace.path,
          workspaceSlug,
          providerId: provider.id,
          onSessionCreated: setPreferredSessionId,
        });
      })()
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
