import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import {
  WORKFLOW_STAGE_ORDER,
  toWorkflowWorkspaceSlug,
  type WorkflowStageId,
  type WorkflowStageStatus,
  type WorkflowStateSnapshot,
} from "../../services/workflow-state-client";
import { buildDescriptionBranchNodes, buildVirtualSimulationBranchNodes } from "./workspace-tree-branch-nodes";
import { useStagePanelSync } from "./use-stage-panel-sync";
import {
  useWorkspaceTreeAutoSelect,
  type SessionResumeIntent,
} from "./workspace-tree-auto-select";
import { WORKFLOW_LABELS, WORKFLOW_STAGE_BLOCKED_TITLES, WORKFLOW_STAGE_OUTDATED_TITLE, type TreeNode, type TreeStatus } from "./workspace-tree-model";
import { useVirtualSimulationArtifactAvailability } from "./use-virtual-simulation-artifact-availability";
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
  const [expandedNodes, setExpandedNodes] = useState<Readonly<Record<string, boolean>>>({});
  const [workflowState, setWorkflowState] =
    useState<WorkflowStateSnapshot | null>(null);
  const baseIndent = 12;
  const depthIndent = 16 / 1.5;
  const workspaceSlug =
    resolvedWorkspaceSlug ??
    (workspaceName && workspaceName.trim().length > 0
      ? toWorkflowWorkspaceSlug(workspaceName)
      : null);

  const virtualSimulationArtifactAvailable =
    useVirtualSimulationArtifactAvailability({
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

  const syncPanelsToStage = useStagePanelSync({
    workflowState,
    workspaceSlug,
    workspacePath,
    virtualSimulationArtifactAvailable,
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
      onSelectArtifact: selectArtifact,
      onResumeSession: dispatchDialogOpenIntent,
      onClearArtifactWithTool: clearArtifactWithTool,
    });

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setExpandedNodes({});
      setWorkflowState(null);
      resetPendingSelection();
      return;
    }
    markWorkspaceChanged();
    setExpandedNodes({
      workspace: true,
    });
  }, [
    markWorkspaceChanged,
    resetPendingSelection,
    selectedWorkspaceId,
    workspacePath,
    workspaceSlug,
  ]);

  useEffect(() => {
    if (!selectedWorkspaceId || !workspaceSlug) {
      setWorkflowState(null);
      return;
    }
    let cancelled = false;
    let timer = 0;
    let fastPolling = true;
    const loadState = async () => {
      const state = await api.getWorkflowState(workspaceSlug, workspacePath);
      if (cancelled) {
        return;
      }
      if (state && fastPolling) {
        fastPolling = false;
        window.clearInterval(timer);
        timer = window.setInterval(loadState, 15_000);
      }
      setWorkflowState(state);
      handleStateUpdate(state);
    };
    loadState();
    timer = window.setInterval(loadState, 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [handleStateUpdate, selectedWorkspaceId, workspacePath, workspaceSlug]);

  const resolveTreeStatus = (
    status: WorkflowStageStatus,
    blocked: boolean
  ): TreeStatus =>
    status === "outdated"
      ? "outdated"
      : blocked || status === "invalid"
        ? "blocked"
        : status === "completed" || status === "in_progress"
          ? "active"
          : "todo";

  const resolveStageNodes = (): readonly TreeNode[] => {
    if (!workflowState) {
      return WORKFLOW_STAGE_ORDER.map((stage) => ({
        id: `workflow:${stage}`,
        label: WORKFLOW_LABELS[stage],
        status: "todo",
        visualDepth: 1,
      }));
    }

    return WORKFLOW_STAGE_ORDER.map((stage) => {
      const status = workflowState.stages[stage] ?? "idle";
      const blocked = workflowState.gating.blocked[stage] ?? false;
      const children =
        stage === "description"
          ? buildDescriptionBranchNodes({
              workflowState,
              workspaceSlug,
              workspacePath,
              selectArtifact,
              dispatchDialogOpenIntent,
            })
          : stage === "virtual_simulation"
            ? buildVirtualSimulationBranchNodes({
                workflowState,
                virtualSimulationArtifactAvailable,
                workspaceSlug,
                workspacePath,
                selectArtifact,
                dispatchDialogOpenIntent,
                clearArtifactWithTool,
              })
            : [];
      return {
        id: `workflow:${stage}`,
        label: WORKFLOW_LABELS[stage],
        title: status === "outdated" ? WORKFLOW_STAGE_OUTDATED_TITLE : blocked ? WORKFLOW_STAGE_BLOCKED_TITLES[stage] : undefined,
        status: resolveTreeStatus(status, blocked),
        visualDepth: 1,
        isCollapsible: children.length > 0,
        children: children.length > 0 ? children : undefined,
        onSelect: children.length > 0 ? () => syncPanelsToStage(stage) : undefined,
      };
    });
  };

  const rootNode: TreeNode | null = selectedWorkspaceId
    ? {
        id: "workspace",
        label: workspaceName ?? "Workspace",
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
        <div className="pm-tree__empty">Select a workspace to start.</div>
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
