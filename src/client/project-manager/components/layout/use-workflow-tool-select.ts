import { useCallback, useRef } from "react";
import { api } from "../../api";
import type { WorkspaceProject } from "../../types";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { resolvePreferredWorkflowProviderId } from "../../services/workflow-provider-resolver";
import { resolveWorkspaceSlug } from "./main-area-utils";

export const VIRTUAL_SIMULATION_TOOL_LABEL = "VIRTUAL SIMULATION" as const;
const DIAGRAM_MODULES_TOOL_LABEL = "Diagram Modules" as const;

type DiagramStageToolLabel = typeof DIAGRAM_MODULES_TOOL_LABEL;

const DIAGRAM_STAGE_MAP: Record<
  DiagramStageToolLabel,
  { readonly stage: "diagram_modules"; readonly startMethod: "startDiagramModules" }
> = {
  [DIAGRAM_MODULES_TOOL_LABEL]: { stage: "diagram_modules", startMethod: "startDiagramModules" },
};

type PendingSessionCreate = { readonly providerTitle: string } | null;

type DialogOpenIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly sessionKind: "collector" | null;
  readonly runSlug: string | null;
};

type UseWorkflowToolSelectParams = {
  readonly activeWorkspace?: WorkspaceProject;
  readonly setActiveTool: (value: string) => void;
  readonly setPreferredSessionId: (value: string | null) => void;
  readonly setPendingSessionCreate: (value: PendingSessionCreate) => void;
  readonly onStageActivated?: (tool: string) => void;
};

export const useWorkflowToolSelect = (
  params: UseWorkflowToolSelectParams
): ((tool: string) => void) => {
  const {
    activeWorkspace,
    setActiveTool,
    setPendingSessionCreate,
    setPreferredSessionId,
    onStageActivated,
  } = params;
  const workflowStepStartServiceRef = useRef(new WorkflowStepStartService());
  const virtualSimulationStartInFlightRef = useRef(false);
  const diagramStartInFlightRef = useRef(false);

  const isDiagramTool = (tool: string): tool is DiagramStageToolLabel =>
    tool in DIAGRAM_STAGE_MAP;

  return useCallback(
    (tool: string) => {
      const activateToolAndStage = (nextTool: string): void => {
        setActiveTool(nextTool);
        onStageActivated?.(nextTool);
      };

      // Non-gated tools (Description, etc.): activate immediately
      if (!isDiagramTool(tool) && tool !== VIRTUAL_SIMULATION_TOOL_LABEL) {
        activateToolAndStage(tool);
        return;
      }

      if (isDiagramTool(tool)) {
        if (!activeWorkspace?.path) return;
        const workspaceSlug = resolveWorkspaceSlug(activeWorkspace);
        if (!workspaceSlug) return;
        if (diagramStartInFlightRef.current) return;
        diagramStartInFlightRef.current = true;

        const providers = api.getDescriptionProviders();
        const fallbackProvider = providers.at(0) ?? null;
        if (!fallbackProvider) {
          diagramStartInFlightRef.current = false;
          return;
        }
        const { stage, startMethod } = DIAGRAM_STAGE_MAP[tool];

        void (async () => {
          const workflowState = await api.getWorkflowState(
            workspaceSlug,
            activeWorkspace.path
          );
          if (workflowState?.gating?.blocked?.[stage] ?? true) return;

          activateToolAndStage(tool);

          const preferredProviderId =
            resolvePreferredWorkflowProviderId({ workflowState, providers }) ??
            fallbackProvider.id;
          const provider =
            providers.find((c) => c.id === preferredProviderId) ??
            fallbackProvider;

          setPendingSessionCreate({
            providerTitle: provider.title ?? provider.id,
          });

          window.dispatchEvent(
            new CustomEvent("pm:dialog:open", {
              detail: {
                providerId: provider.id,
                providerSessionId: null,
                workspacePath: activeWorkspace.path,
                workspaceSlug,
                initiativeSlug: workspaceSlug,
                stage,
                sessionKind: "collector",
                runSlug: null,
              } satisfies DialogOpenIntent,
            })
          );

          await workflowStepStartServiceRef.current[startMethod]({
            workspaceName: activeWorkspace.name,
            workspacePath: activeWorkspace.path,
            workspaceSlug,
            providerId: provider.id,
            onSessionCreated: setPreferredSessionId,
          });
        })()
          .catch((error: unknown) => {
            console.warn(`[PM] Failed to start ${stage} workflow step`, error);
          })
          .finally(() => {
            diagramStartInFlightRef.current = false;
            setPendingSessionCreate(null);
          });
        return;
      }

      // Virtual Simulation handler
      if (!activeWorkspace?.path) return;
      const workspaceSlug = resolveWorkspaceSlug(activeWorkspace);
      if (!workspaceSlug) return;
      if (virtualSimulationStartInFlightRef.current) return;
      virtualSimulationStartInFlightRef.current = true;

      const providers = api.getDescriptionProviders();
      const fallbackProvider = providers.at(0) ?? null;
      if (!fallbackProvider) {
        virtualSimulationStartInFlightRef.current = false;
        return;
      }

      void (async () => {
        const workflowState = await api.getWorkflowState(
          workspaceSlug,
          activeWorkspace.path
        );
        if (workflowState?.gating?.blocked?.virtual_simulation ?? true) return;

        activateToolAndStage(tool);

        const preferredProviderId =
          resolvePreferredWorkflowProviderId({ workflowState, providers }) ??
          fallbackProvider.id;
        const provider =
          providers.find((c) => c.id === preferredProviderId) ??
          fallbackProvider;

        setPendingSessionCreate({
          providerTitle: provider.title ?? provider.id,
        });

        window.dispatchEvent(
          new CustomEvent("pm:dialog:open", {
            detail: {
              providerId: provider.id,
              providerSessionId: null,
              workspacePath: activeWorkspace.path,
              workspaceSlug,
              initiativeSlug: workspaceSlug,
              stage: "virtual_simulation",
              sessionKind: "collector",
              runSlug: null,
            } satisfies DialogOpenIntent,
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
          console.warn("[PM] Failed to start Virtual Simulation workflow step", error);
        })
        .finally(() => {
          virtualSimulationStartInFlightRef.current = false;
          setPendingSessionCreate(null);
        });
    },
    [activeWorkspace, onStageActivated, setActiveTool, setPendingSessionCreate, setPreferredSessionId]
  );
};
