import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import {
  WORKFLOW_STAGE_ORDER,
  toWorkflowWorkspaceSlug,
  type WorkflowStageId,
  type WorkflowStateSnapshot,
} from "../../services/workflow-state-client";
import { useWorkflowStateSnapshot } from "../../services/workflow-state-store";
import { resolveStageChildren } from "./workspace-tree-stage-children";
import { useStagePanelSync } from "./use-stage-panel-sync";
import {
  useWorkspaceTreeAutoSelect,
  type SessionResumeIntent,
} from "./workspace-tree-auto-select";
import {
  WORKFLOW_LABELS,
  resolveTreeStatus,
  type TreeNode,
} from "./workspace-tree-model";
import { useDescriptionArtifactAvailability } from "./use-description-artifact-availability";
import { useVirtualSimulationArtifactAvailability } from "./use-virtual-simulation-artifact-availability";
import { useDiagramModulesArtifactAvailability } from "./use-diagram-modules-artifact-availability";
import { useApplicationFoundationEnvelopeArtifactAvailability } from "./use-application-foundation-envelope-artifact-availability";

const UI_LABELS_CATEGORY = "ui_interface";
const USER_MESSAGES_CATEGORY = "system_feedback";
const DIAGRAM_MODULES_BLOCKED_FALLBACK =
  "BLOCKED: requires virtual-simulation.md (DONE)";
const APPLICATION_FOUNDATION_ENVELOPE_BLOCKED_FALLBACK =
  "BLOCKED: requires Diagram Modules aggregate-ready output (DONE)";

interface WorkspaceTreeProps {
  readonly selectedWorkspaceId?: string;
  readonly workspaceName?: string;
  readonly workspacePath?: string;
  readonly workspaceSlug?: string;
}

type TranslationResolver = ReturnType<typeof useLocalization>["t"];

export const WorkspaceTree: React.FC<WorkspaceTreeProps> = ({
  selectedWorkspaceId,
  workspaceName,
  workspacePath,
  workspaceSlug: resolvedWorkspaceSlug,
}) => {
  const { t } = useLocalization();
  const [expandedNodes, setExpandedNodes] = useState<
    Readonly<Record<string, boolean>>
  >({});
  const storeState = useWorkflowStateSnapshot();
  const workflowState: WorkflowStateSnapshot | null = storeState.snapshot;
  const baseIndent = 12;
  const depthIndent = 16 / 1.5;
  const workspaceLabel = t(
    UI_LABELS_CATEGORY,
    "pm.sidebar.workspace.label",
    "Workspace"
  );
  const emptyWorkspaceLabel = t(
    USER_MESSAGES_CATEGORY,
    "pm.workspace_tree.empty_label",
    "Select a workspace to start."
  );
  const workspaceSlug =
    resolvedWorkspaceSlug ??
    (workspaceName && workspaceName.trim().length > 0
      ? toWorkflowWorkspaceSlug(workspaceName)
      : null);

  const descriptionArtifactAvailable = useDescriptionArtifactAvailability({
    enabled: Boolean(selectedWorkspaceId),
    workspacePath,
    workspaceSlug,
  });
  const virtualSimulationArtifactAvailable =
    useVirtualSimulationArtifactAvailability({
      enabled: Boolean(selectedWorkspaceId),
      workspacePath,
      workspaceSlug,
    });

  const diagramModulesArtifactAvailable =
    useDiagramModulesArtifactAvailability({
      enabled: Boolean(selectedWorkspaceId),
      workspacePath,
      workspaceSlug,
    });
  const applicationFoundationEnvelopeArtifactAvailable =
    useApplicationFoundationEnvelopeArtifactAvailability({
      enabled: Boolean(selectedWorkspaceId),
      workspacePath,
      workspaceSlug,
    });

  const selectArtifact = useCallback(
    (artifactPath: string, label: string) => {
      if (!(workspaceSlug && workspacePath)) {
        return;
      }
      window.dispatchEvent(
        new CustomEvent("pm:artifact:selected", {
          detail: { label, path: artifactPath, workspacePath, workspaceSlug },
        })
      );
    },
    [workspacePath, workspaceSlug]
  );

  const dispatchDialogOpenIntent = useCallback(
    (payload: SessionResumeIntent) => {
      window.dispatchEvent(
        new CustomEvent("pm:dialog:open", {
          detail: payload,
        })
      );
    },
    []
  );

  const clearArtifactWithTool = useCallback(
    (activeTool: string) => {
      window.dispatchEvent(
        new CustomEvent("pm:artifact:cleared", {
          detail: { activeTool },
        })
      );
    },
    []
  );

  const dispatchStageActivated = useCallback((stage: string) => {
    window.dispatchEvent(
      new CustomEvent("pm:stage:activated", {
        detail: { stage, source: "workspace-tree-stage" },
      })
    );
  }, []);

  useStagePanelSync({
    workflowState,
    workspaceSlug,
    workspacePath,
    virtualSimulationArtifactAvailable,
    diagramModulesArtifactAvailable,
    applicationFoundationEnvelopeArtifactAvailable,
    selectArtifact,
    dispatchDialogOpenIntent,
    clearArtifactWithTool,
  });

  const { handleStateUpdate, markWorkspaceChanged, resetPendingSelection } =
    useWorkspaceTreeAutoSelect({
      selectedWorkspaceId,
      workspacePath,
      workspaceSlug,
      virtualSimulationArtifactAvailable,
      diagramModulesArtifactAvailable,
      applicationFoundationEnvelopeArtifactAvailable,
      onSelectArtifact: selectArtifact,
      onResumeSession: dispatchDialogOpenIntent,
      onClearArtifactWithTool: clearArtifactWithTool,
    });

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setExpandedNodes({});
      resetPendingSelection();
      return;
    }
    markWorkspaceChanged();
    setExpandedNodes({ workspace: true });
  }, [
    markWorkspaceChanged,
    resetPendingSelection,
    selectedWorkspaceId,
    workspacePath,
    workspaceSlug,
  ]);

  // Forward shared store snapshot to auto-select logic.
  // Guard: only forward when the store has loaded data for the CURRENT
  // workspace.  Without this, a stale previous-workspace snapshot can
  // fire handleStateUpdate (which uses the new selectedWorkspaceId)
  // and permanently null out pendingWorkspaceIdRef before the correct
  // snapshot arrives, preventing auto-select from ever dispatching
  // pm:dialog:open for the new workspace.
  useEffect(() => {
    if (storeState.loaded && storeState.workspaceSlug === workspaceSlug) {
      handleStateUpdate(storeState.snapshot);
    }
  }, [handleStateUpdate, storeState, workspaceSlug]);

  const resolveStageNodes = (): readonly TreeNode[] => {
    if (!workflowState) {
      return WORKFLOW_STAGE_ORDER.map((stage) => ({
        id: `workflow:${stage}`,
        label: resolveStageLabel(stage, t),
        status: "todo",
        visualDepth: 1,
      }));
    }

    const applicationFoundationEnvelopeStageLabel = resolveStageLabel(
      "application_foundation_envelope",
      t
    );
    const stageCtx = {
      workflowState,
      workspaceSlug,
      workspacePath,
      descriptionArtifactAvailable,
      virtualSimulationArtifactAvailable,
      diagramModulesArtifactAvailable,
      applicationFoundationEnvelopeArtifactAvailable,
      selectArtifact,
      dispatchDialogOpenIntent,
      clearArtifactWithTool,
      resolveApplicationFoundationEnvelopeSessionLabel: (providerTitle: string) =>
        t(
          UI_LABELS_CATEGORY,
          "pm.workflow.stage.application_foundation_envelope.session_label",
          "{stageLabel} {providerTitle}",
          {
            providerTitle,
            stageLabel: applicationFoundationEnvelopeStageLabel,
          }
        ),
    };

    return WORKFLOW_STAGE_ORDER.map((stage) => {
      const status = workflowState.stages[stage] ?? "idle";
      const blocked = workflowState.gating.blocked[stage] ?? false;
      const children = resolveStageChildren(stage, stageCtx);
      return {
        id: `workflow:${stage}`,
        label: resolveStageLabel(stage, t),
        title: resolveStageTitle(stage, status, blocked, t),
        status: resolveTreeStatus(status, blocked),
        visualDepth: 1,
        isCollapsible: children.length > 0,
        children: children.length > 0 ? children : undefined,
        onSelect: () => dispatchStageActivated(stage),
      };
    });
  };

  const rootNode: TreeNode | null = selectedWorkspaceId
    ? {
        id: "workspace",
        label: workspaceName ?? workspaceLabel,
        status: "active",
        visualDepth: 0,
        isCollapsible: true,
        children: resolveStageNodes(),
      }
    : null;

  const flattenTree = (node: TreeNode): TreeNode[] => {
    const result: TreeNode[] = [node];
    const isExpanded = expandedNodes[node.id] ?? true;
    if (!node.children || node.children.length === 0 || !isExpanded) {
      return result;
    }
    for (const child of node.children) {
      result.push(...flattenTree(child));
    }
    return result;
  };

  const treeNodes = rootNode ? flattenTree(rootNode) : [];

  const handleTreeToggle = (id: string) => {
    setExpandedNodes((current) => {
      const next = { ...current };
      next[id] = !(current[id] ?? true);
      return next;
    });
  };

  return (
    <div className="pm-sidebar__tree">
      {treeNodes.length === 0 ? (
        <div className="pm-tree__empty">{emptyWorkspaceLabel}</div>
      ) : (
        <ul className="pm-tree__list">
          {treeNodes.map((node) => (
            <li
              className={`pm-tree__item pm-tree__item--${node.status}`}
              onClick={node.onSelect}
              key={node.id}
              role={node.onSelect ? "button" : undefined}
              style={{ paddingLeft: `${baseIndent + node.visualDepth * depthIndent}px` }}
            >
              {node.isCollapsible && (node.children?.length ?? 0) > 0 ? (
                <button
                  aria-expanded={expandedNodes[node.id] ?? true}
                  className="pm-tree__toggle"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleTreeToggle(node.id);
                  }}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={
                      expandedNodes[node.id] ?? true
                        ? "pm-tree__toggle-icon pm-tree__toggle-icon--expanded"
                        : "pm-tree__toggle-icon"
                    }
                  >
                    ▸
                  </span>
                </button>
              ) : (
                <span className="pm-tree__status" />
              )}
              <span className="pm-tree__label" title={node.title ?? node.label}>
                {node.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const resolveStageLabel = (
  stage: WorkflowStageId,
  t: TranslationResolver
): string => {
  switch (stage) {
    case "description":
      return t(
        UI_LABELS_CATEGORY,
        "pm.workflow.stage.description.label",
        WORKFLOW_LABELS.description
      );
    case "virtual_simulation":
      return t(
        UI_LABELS_CATEGORY,
        "pm.workflow.stage.virtual_simulation.label",
        WORKFLOW_LABELS.virtual_simulation
      );
    case "diagram_modules":
      return t(
        UI_LABELS_CATEGORY,
        "pm.workflow.stage.diagram_modules.label",
        WORKFLOW_LABELS.diagram_modules
      );
    case "application_foundation_envelope":
      return t(
        UI_LABELS_CATEGORY,
        "pm.workflow.stage.application_foundation_envelope.label",
        WORKFLOW_LABELS.application_foundation_envelope
      );
  }
};

const resolveStageTitle = (
  stage: WorkflowStageId,
  status: string,
  blocked: boolean,
  t: TranslationResolver
): string | undefined => {
  if (status === "outdated") {
    return t(
      UI_LABELS_CATEGORY,
      "pm.workflow.stage.outdated_title",
      "OUTDATED: upstream input changed; resync recommended."
    );
  }

  if (!blocked) {
    return undefined;
  }

  switch (stage) {
    case "description":
      return t(
        UI_LABELS_CATEGORY,
        "pm.workflow.stage.description.ready_title",
        "READY"
      );
    case "virtual_simulation":
      return t(
        UI_LABELS_CATEGORY,
        "pm.workflow.stage.virtual_simulation.blocked_title",
        "BLOCKED: requires Final_Description.md"
      );
    case "diagram_modules":
      return t(
        UI_LABELS_CATEGORY,
        "pm.workflow.stage.diagram_modules.blocked_title",
        DIAGRAM_MODULES_BLOCKED_FALLBACK
      );
    case "application_foundation_envelope":
      return t(
        UI_LABELS_CATEGORY,
        "pm.workflow.stage.application_foundation_envelope.blocked_title",
        APPLICATION_FOUNDATION_ENVELOPE_BLOCKED_FALLBACK
      );
  }
};
