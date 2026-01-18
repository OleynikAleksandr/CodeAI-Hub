import type React from "react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import {
  WORKFLOW_STAGE_ORDER,
  toWorkflowWorkspaceSlug,
  type WorkflowStageId,
  type WorkflowStageStatus,
  type WorkflowStateSnapshot,
} from "../../services/workflow-state-client";

type TreeStatus = "active" | "todo" | "blocked" | "draft";

type TreeNode = {
  readonly id: string;
  readonly label: string;
  readonly status: TreeStatus;
  readonly visualDepth: number;
  readonly isCollapsible?: boolean;
  readonly children?: readonly TreeNode[];
};

const WORKFLOW_LABELS: Record<WorkflowStageId, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
  diagram_facades: "Diagram Facades",
};

interface WorkspaceTreeProps {
  readonly selectedWorkspaceId?: string;
  readonly workspaceName?: string;
}

export const WorkspaceTree: React.FC<WorkspaceTreeProps> = ({
  selectedWorkspaceId,
  workspaceName,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<
    Readonly<Record<string, boolean>>
  >({});
  const [workflowState, setWorkflowState] = useState<WorkflowStateSnapshot | null>(
    null
  );
  const baseIndent = 12;
  const depthIndent = 16 / 1.5;

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setExpandedNodes({});
      setWorkflowState(null);
      return;
    }

    setExpandedNodes({
      workspace: true,
    });

    // NOTE (MVP): The mock workflow subtree (Description/Diagrams/Modules/...) is intentionally
    // disabled while we wire the Project Manager tree to real workflow artifacts/runs stored
    // under `.codeai-hub/` and produced by Core. We keep the old expansion defaults commented
    // out to preserve the previous UX iteration context.
    //
    // modules: true,
    // "module-core": true,
    // "module-core:execute": false,
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId || !workspaceName) {
      setWorkflowState(null);
      return;
    }

    const workspaceSlug = toWorkflowWorkspaceSlug(workspaceName);
    let cancelled = false;

    const loadState = async () => {
      const state = await api.getWorkflowState(workspaceSlug);
      if (!cancelled) {
        setWorkflowState(state);
      }
    };

    loadState();
    const timer = window.setInterval(loadState, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedWorkspaceId, workspaceName]);

  const resolveTreeStatus = (
    status: WorkflowStageStatus,
    blocked: boolean
  ): TreeStatus => {
    if (blocked) {
      return "blocked";
    }
    if (status === "invalid") {
      return "blocked";
    }
    if (status === "completed" || status === "in_progress") {
      return "active";
    }
    return "todo";
  };

  const resolveStageNodes = (): readonly TreeNode[] => {
    if (!workflowState) {
      return WORKFLOW_STAGE_ORDER.map((stage) => ({
        id: `workflow:${stage}`,
        label: WORKFLOW_LABELS[stage],
        status: "todo",
        visualDepth: 1,
      }));
    }

    return WORKFLOW_STAGE_ORDER.map((stage, index) => {
      const status = workflowState.stages[stage] ?? "idle";
      const previousStage = index > 0 ? WORKFLOW_STAGE_ORDER[index - 1] : null;
      const blocked =
        previousStage !== null &&
        workflowState.stages[previousStage] !== "completed";
      return {
        id: `workflow:${stage}`,
        label: WORKFLOW_LABELS[stage],
        status: resolveTreeStatus(status, blocked),
        visualDepth: 1,
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
    if (!node.children || node.children.length === 0) {
      return result;
    }
    if (!isExpanded) {
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
              key={node.id}
              style={{ paddingLeft: `${baseIndent + node.visualDepth * depthIndent}px` }}
            >
              {node.isCollapsible && (node.children?.length ?? 0) > 0 ? (
                <button
                  aria-expanded={expandedNodes[node.id] ?? true}
                  className="pm-tree__toggle"
                  onClick={() => handleTreeToggle(node.id)}
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
              <span className="pm-tree__label">{node.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
