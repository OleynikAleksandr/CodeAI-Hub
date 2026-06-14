import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import {
  WORKFLOW_STAGE_ORDER,
  toWorkflowWorkspaceSlug,
  type WorkflowStageId,
  type WorkflowStateSnapshot,
} from "../../services/workflow-state-client";
import { useWorkflowStateSnapshot } from "../../services/workflow-state-store";
import { useStagePanelSync } from "./use-stage-panel-sync";
import {
  buildDevelopmentTreeLockedNodes,
  buildDevelopmentTreeNodes,
} from "./workspace-tree-diagram-branch-nodes";
import {
  useWorkspaceTreeAutoSelect,
  type SessionResumeIntent,
} from "./workspace-tree-auto-select";
import { useWorkspaceTreeActiveStage } from "./use-workspace-tree-active-stage";
import { useWorkspaceTreeClearMenu } from "./use-workspace-tree-clear-menu";
import { resolveTreeStatus, type TreeNode } from "./workspace-tree-model";
import {
  resolveStageLabel,
  resolveStageTitle,
} from "./workspace-tree-stage-labels";
import { useVirtualSimulationArtifactAvailability } from "./use-virtual-simulation-artifact-availability";
import { useDiagramModulesArtifactAvailability } from "./use-diagram-modules-artifact-availability";
import { useStepProviderResolver } from "./use-step-provider-resolver";
import { renderTypeMarker } from "./workspace-tree-type-marker";
import {
  resolveUserGateNodeTargets,
  useWorkspaceTreeUserGateFocus,
} from "./workspace-tree-user-gate-focus";
import { useWorkspaceTreeSelectionCursor } from "./workspace-tree-selection";
const USER_MESSAGES_CATEGORY = "system_feedback";
const isTechnicalStageRewriteBoundaryActive = (
  workflowState: WorkflowStateSnapshot | null
): boolean =>
  workflowState?.stages.diagram_modules !== undefined &&
  workflowState.stages.diagram_modules !== "idle";
const isReadOnlyUpstreamStage = (stage: WorkflowStageId): boolean =>
  stage === "description" || stage === "virtual_simulation";
interface WorkspaceTreeProps {
  readonly selectedWorkspaceId?: string;
  readonly workspaceName?: string;
  readonly workspacePath?: string;
  readonly workspaceSlug?: string;
}
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
  const { selectedNodeId, selectTreeNodeId } = useWorkspaceTreeSelectionCursor({
    activeStage,
    selectedWorkspaceId,
  });
  const storeState = useWorkflowStateSnapshot();
  const workflowState: WorkflowStateSnapshot | null = storeState.snapshot;
  const technicalStageRewriteBoundaryActive =
    isTechnicalStageRewriteBoundaryActive(workflowState);
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
  const clearMenu = useWorkspaceTreeClearMenu({ workspacePath, workspaceSlug });
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
    selectTreeNodeId(`workflow:${stage}`);
    window.dispatchEvent(
      new CustomEvent("pm:stage:activated", {
        detail: { stage, source: "workspace-tree-stage" },
      })
    );
  }, [selectTreeNodeId]);
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
  useEffect(() => {
    if (storeState.loaded && storeState.workspaceSlug === workspaceSlug) {
      handleStateUpdate(storeState.snapshot);
    }
  }, [handleStateUpdate, storeState, workspaceSlug]);

  const resolveStageNodes = (): readonly TreeNode[] => {
    if (!workflowState) {
      return WORKFLOW_STAGE_ORDER.map((stage) => ({
        id: `workflow:${stage}`,
        isSelected: selectedNodeId === `workflow:${stage}`,
        label: resolveStageLabel(stage, t),
        status: "todo",
        stage,
        clearTarget: { kind: "workflow_stage", stage },
        visualDepth: 0,
      }));
    }

    return WORKFLOW_STAGE_ORDER.map((stage) => {
      const status = workflowState.stages[stage] ?? "idle";
      const blocked = workflowState.gating.blocked[stage] ?? false;
      const readOnly =
        technicalStageRewriteBoundaryActive && isReadOnlyUpstreamStage(stage);
      const title = resolveStageTitle(stage, status, blocked, t);
      return {
        id: `workflow:${stage}`,
        clearTarget: { kind: "workflow_stage", stage },
        label: resolveStageLabel(stage, t),
        stage,
        title: readOnly
          ? `${title} Rewrite boundary active: read-only upstream stage.`
          : title,
        isSelected: selectedNodeId === `workflow:${stage}`,
        status: resolveTreeStatus(status, blocked),
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
  const devTreeLockedNodes =
    selectedWorkspaceId && devTreeNodes.length === 0
      ? buildDevelopmentTreeLockedNodes(workflowState, 0)
      : [];
  const providerResolver = useStepProviderResolver({ snapshot: workflowState });
  const userGateTargets = resolveUserGateNodeTargets(
    workflowState?.userGateCursor,
    workspacePath,
    workspaceSlug
  );
  useWorkspaceTreeUserGateFocus({
    ...userGateTargets,
    devTreeLockedNodes,
    devTreeNodes,
    dispatchDialogOpenIntent,
    trunkNodes,
  });
  const renderItemClass = (node: TreeNode) =>
    [
      "pm-tree__item",
      `pm-tree__item--${node.status}`,
      node.nodeType ? `pm-tree__item--type-${node.nodeType}` : null,
      (node.isSelected || node.id === selectedNodeId) ? "pm-tree__item--selected" : null,
      node.id === userGateTargets.activeGateNodeId
        ? "pm-tree__item--user-gate-active"
        : null,
      userGateTargets.queuedGateNodeIds.has(node.id)
        ? "pm-tree__item--user-gate-queued"
        : null,
    ]
      .filter((className): className is string => Boolean(className))
      .join(" ");
  const selectNode = (node: TreeNode) => {
    selectTreeNodeId(node.id);
    node.onSelect?.();
  };
  const renderTreeLabel = (label: string): React.ReactNode =>
    label.split("\n").map((line, index) => (
      <Fragment key={`${line}-${index}`}>
        {index > 0 ? <br /> : null}
        {line}
      </Fragment>
    ));
  const renderTypeMarkerControl = (
    node: TreeNode,
    toggleNode?: () => void,
    isExpanded?: boolean
  ): React.ReactNode =>
    toggleNode ? (
      <button
        aria-expanded={isExpanded}
        aria-label={`Toggle ${node.label}`}
        className="pm-tree__type-toggle"
        onClick={(event) => {
          event.stopPropagation();
          toggleNode();
        }}
        type="button"
      >
        {renderTypeMarker(node)}
      </button>
    ) : (
      renderTypeMarker(node)
    );
  const renderModuleRow = (node: TreeNode): React.ReactNode => {
    const children = node.children ?? [];
    const hasChildren = children.length > 0;
    const isCollapsible = Boolean(node.isCollapsible && hasChildren);
    const isExpanded = isCollapsible ? resolveNodeExpanded(node.id) : true;
    return (
      <Fragment key={node.id}>
        <li
          className={renderItemClass(node)}
          data-provider={providerResolver.forBranchModule(node.id) ?? undefined}
          onClick={() => selectNode(node)}
          {...clearMenu.bind(node.clearTarget, node.label)}
          role={node.onSelect ? "button" : undefined}
          style={
            node.nodeType === "operation"
              ? {
                  paddingLeft: `${baseIndent + node.visualDepth * depthIndent}px`,
                }
              : undefined
          }
        >
          {renderTypeMarkerControl(
            node,
            isCollapsible ? () => handleTreeToggle(node.id) : undefined,
            isExpanded
          )}
          <span className="pm-tree__label" title={node.title ?? node.label}>
            {renderTreeLabel(node.label)}
          </span>
        </li>
        {isExpanded ? children.map((child) => renderModuleRow(child)) : null}
      </Fragment>
    );
  };

  const renderClusterNode = (node: TreeNode) => {
    const isOpen = openClusterId === node.id;
    const clusterModules = node.children ?? [];
    const clusterProvider =
      providerResolver.forBranchCluster(node.id) ?? undefined;
    return (
      <li
        className={`pm-tree__cluster-wrapper${isOpen ? " pm-tree__cluster-wrapper--open" : ""}`}
        key={node.id}
      >
        <div
          className={renderItemClass(node)}
          data-provider={clusterProvider}
          onClick={() => selectNode(node)}
          {...clearMenu.bind(node.clearTarget, node.label)}
          role="button"
        >
          {renderTypeMarkerControl(
            node,
            node.isCollapsible && clusterModules.length > 0
              ? () => toggleCluster(node.id)
              : undefined,
            isOpen
          )}
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
      node.children?.filter((c) => c.nodeType !== "cluster") ?? [];
    const partProvider =
      providerResolver.forBranchPart(node.id) ?? undefined;
    return (
      <li
        className={`pm-tree__pp-wrapper${isOpen ? " pm-tree__pp-wrapper--open" : ""}`}
        data-provider={partProvider}
        key={node.id}
      >
        <div
          className={renderItemClass(node)}
          data-provider={partProvider}
          onClick={() => selectNode(node)}
          {...clearMenu.bind(node.clearTarget, node.label)}
          role="button"
        >
          {renderTypeMarkerControl(
            node,
            node.isCollapsible && (clusters.length > 0 || standaloneModules.length > 0)
              ? () => togglePart(node.id)
              : undefined,
            isOpen
          )}
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
            const trunkProvider =
              (node.stage && providerResolver.forStage(node.stage)) ||
              undefined;
            return (
              <li
                aria-current={node.isSelected ? "true" : undefined}
                className={renderItemClass(node)}
                data-provider={trunkProvider}
                onClick={node.onSelect}
                {...clearMenu.bind(node.clearTarget, node.label)}
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
          {(devTreeNodes.length > 0 || devTreeLockedNodes.length > 0) && (
            <>
              <li className="pm-tree__separator" key="section:development">
                Development Tree
              </li>
              {devTreeLockedNodes.map((node) => renderModuleRow(node))}
              {devTreeNodes.map((partNode) => renderPartNode(partNode))}
            </>
          )}
        </ul>
      )}
      {clearMenu.element}
    </div>
  );
};
