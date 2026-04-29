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
import { useStagePanelSync } from "./use-stage-panel-sync";
import { buildDevelopmentTreeNodes } from "./workspace-tree-diagram-branch-nodes";
import {
  useWorkspaceTreeAutoSelect,
  type SessionResumeIntent,
} from "./workspace-tree-auto-select";
import { useWorkspaceTreeActiveStage } from "./use-workspace-tree-active-stage";
import {
  WORKFLOW_LABELS,
  resolveTreeStatus,
  type TreeNode,
} from "./workspace-tree-model";
import { useDescriptionArtifactAvailability } from "./use-description-artifact-availability";
import { useVirtualSimulationArtifactAvailability } from "./use-virtual-simulation-artifact-availability";
import { useDiagramModulesArtifactAvailability } from "./use-diagram-modules-artifact-availability";
import { useStepProviderResolver } from "./use-step-provider-resolver";

const UI_LABELS_CATEGORY = "ui_interface";
const USER_MESSAGES_CATEGORY = "system_feedback";
const DIAGRAM_MODULES_BLOCKED_FALLBACK =
  "BLOCKED: requires virtual-simulation.md (DONE)";

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
  const [openPartId, setOpenPartId] = useState<string | null>(null);
  const [openClusterId, setOpenClusterId] = useState<string | null>(null);
  const activeStage = useWorkspaceTreeActiveStage(selectedWorkspaceId);
  const storeState = useWorkflowStateSnapshot();
  const workflowState: WorkflowStateSnapshot | null = storeState.snapshot;
  const baseIndent = 12;
  const depthIndent = 16 / 1.5;
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
    setExpandedNodes({});
    setOpenPartId(null);
    setOpenClusterId(null);
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
        isSelected: stage === activeStage,
        label: resolveStageLabel(stage, t),
        status: "todo",
        stage,
        visualDepth: 0,
      }));
    }

    const stageArtifactAvailable: Record<WorkflowStageId, boolean> = {
      description: descriptionArtifactAvailable,
      virtual_simulation: virtualSimulationArtifactAvailable,
      diagram_modules: diagramModulesArtifactAvailable,
    };

    return WORKFLOW_STAGE_ORDER.map((stage) => {
      const status = workflowState.stages[stage] ?? "idle";
      const blocked = workflowState.gating.blocked[stage] ?? false;
      const hasArtifact = stageArtifactAvailable[stage];
      return {
        id: `workflow:${stage}`,
        label: resolveStageLabel(stage, t),
        stage,
        title: resolveStageTitle(stage, status, blocked, t),
        isSelected: stage === activeStage,
        status: resolveTreeStatus(status, blocked, hasArtifact),
        visualDepth: 0,
        onSelect: () => dispatchStageActivated(stage),
      };
    });
  };

  const resolveNodeExpanded = (nodeId: string): boolean =>
    expandedNodes[nodeId] ?? false;

  const handleTreeToggle = (id: string) => {
    setExpandedNodes((current) => {
      const next = { ...current };
      next[id] = !current[id];
      return next;
    });
  };

  const togglePart = (partId: string) => {
    if (openPartId === partId) {
      setOpenPartId(null);
      setOpenClusterId(null);
    } else {
      setOpenPartId(partId);
      setOpenClusterId(null);
    }
  };

  const toggleCluster = (clusterId: string) => {
    setOpenClusterId(openClusterId === clusterId ? null : clusterId);
  };

  const trunkNodes = resolveStageNodes();
  const devTree = workflowState?.developmentTree;
  const devTreeNodes =
    selectedWorkspaceId && devTree?.parts.length
      ? buildDevelopmentTreeNodes(devTree, 0)
      : [];
  const providerResolver = useStepProviderResolver({ snapshot: workflowState });

  const TYPE_MARKER_LABELS: Record<string, string> = {
    "product-part": "P",
    cluster: "C",
    module: "M",
  };

  const renderTypeMarker = (node: TreeNode) => {
    const letter = TYPE_MARKER_LABELS[node.nodeType ?? ""];
    if (!letter) return <span className="pm-tree__status" />;
    const hasChildren = (node.children?.length ?? 0) > 0;
    return (
      <span
        className={`pm-tree__type-marker${hasChildren ? " pm-tree__type-marker--has-children" : ""}`}
      >
        {letter}
      </span>
    );
  };

  const renderItemClass = (node: TreeNode) =>
    `pm-tree__item pm-tree__item--${node.status}${node.isSelected ? " pm-tree__item--selected" : ""}`;

  const renderModuleRow = (node: TreeNode) => (
    <li
      className={renderItemClass(node)}
      key={node.id}
      onClick={node.onSelect}
      role={node.onSelect ? "button" : undefined}
    >
      {renderTypeMarker(node)}
      <span className="pm-tree__label" title={node.title ?? node.label}>
        {node.label}
      </span>
    </li>
  );

  const renderClusterNode = (node: TreeNode) => {
    const isOpen = openClusterId === node.id;
    const clusterModules = node.children ?? [];
    return (
      <li
        className={`pm-tree__cluster-wrapper${isOpen ? " pm-tree__cluster-wrapper--open" : ""}`}
        key={node.id}
      >
        <div
          className={renderItemClass(node)}
          onClick={() => {
            node.onSelect?.();
            if (node.isCollapsible) toggleCluster(node.id);
          }}
          role="button"
        >
          {renderTypeMarker(node)}
          <span className="pm-tree__label" title={node.title ?? node.label}>
            {node.label}
          </span>
        </div>
        {isOpen && clusterModules.length > 0 && (
          <ul className="pm-tree__cluster-children">
            {clusterModules.map((mod) => renderModuleRow(mod))}
          </ul>
        )}
      </li>
    );
  };

  const renderPartNode = (node: TreeNode) => {
    const isOpen = openPartId === node.id;
    const clusters =
      node.children?.filter((c) => c.nodeType === "cluster") ?? [];
    const standaloneModules =
      node.children?.filter((c) => c.nodeType === "module") ?? [];
    return (
      <li
        className={`pm-tree__pp-wrapper${isOpen ? " pm-tree__pp-wrapper--open" : ""}`}
        key={node.id}
      >
        <div
          className={renderItemClass(node)}
          onClick={() => {
            node.onSelect?.();
            if (node.isCollapsible) togglePart(node.id);
          }}
          role="button"
        >
          {renderTypeMarker(node)}
          <span className="pm-tree__label" title={node.title ?? node.label}>
            {node.label}
          </span>
        </div>
        {isOpen && (clusters.length > 0 || standaloneModules.length > 0) && (
          <ul className="pm-tree__pp-children">
            {clusters.map((cluster) => renderClusterNode(cluster))}
            {standaloneModules.map((mod) => renderModuleRow(mod))}
          </ul>
        )}
      </li>
    );
  };

  const hasContent =
    selectedWorkspaceId && (trunkNodes.length > 0 || devTreeNodes.length > 0);

  return (
    <div className="pm-sidebar__tree">
      {!hasContent ? (
        <div className="pm-tree__empty">{emptyWorkspaceLabel}</div>
      ) : (
        <ul className="pm-tree__list">
          {/* Documentation Tree — flat trunk rows */}
          <li className="pm-tree__separator" key="section:documentation">
            Documentation Tree
          </li>
          {trunkNodes.map((node) => {
            const isExpanded = resolveNodeExpanded(node.id);
            const trunkProvider = node.stage
              ? providerResolver.forStage(node.stage)
              : undefined;
            return (
              <li
                aria-current={node.isSelected ? "true" : undefined}
                className={renderItemClass(node)}
                data-provider={trunkProvider}
                onClick={node.onSelect}
                key={node.id}
                role={node.onSelect ? "button" : undefined}
                style={{
                  paddingLeft: `${baseIndent + node.visualDepth * depthIndent}px`,
                }}
              >
                {node.isCollapsible && (node.children?.length ?? 0) > 0 ? (
                  <button
                    aria-expanded={isExpanded}
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
                        isExpanded
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
                <span
                  className="pm-tree__label"
                  title={node.title ?? node.label}
                >
                  {node.label}
                </span>
              </li>
            );
          })}

          {/* Development Tree — nested structure */}
          {devTreeNodes.length > 0 && (
            <>
              <li className="pm-tree__separator" key="section:development">
                Development Tree
              </li>
              {devTreeNodes.map((partNode) => renderPartNode(partNode))}
            </>
          )}
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
  }
};
