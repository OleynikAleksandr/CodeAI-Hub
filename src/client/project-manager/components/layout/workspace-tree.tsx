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
type TreeStatus = "active" | "todo" | "blocked" | "draft" | "outdated";
type TreeNode = {
  readonly id: string;
  readonly label: string;
  readonly status: TreeStatus;
  readonly visualDepth: number;
  readonly title?: string;
  readonly onSelect?: () => void;
  readonly isCollapsible?: boolean;
  readonly children?: readonly TreeNode[];
};
type SessionResumeIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly runSlug: string | null;
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
  readonly workspacePath?: string;
}
export const WorkspaceTree: React.FC<WorkspaceTreeProps> = ({
  selectedWorkspaceId,
  workspaceName,
  workspacePath,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Readonly<Record<string, boolean>>>({});
  const [workflowState, setWorkflowState] =
    useState<WorkflowStateSnapshot | null>(null);
  const baseIndent = 12;
  const depthIndent = 16 / 1.5;
  const workspaceSlug = workspaceName && workspaceName.trim().length > 0
    ? toWorkflowWorkspaceSlug(workspaceName)
    : null;
  const canContinue = Boolean(workspaceSlug && workspacePath);
  useEffect(() => {
    if (!selectedWorkspaceId) {
      setExpandedNodes({});
      setWorkflowState(null);
      return;
    }
    setExpandedNodes({
      workspace: true,
    });
  }, [selectedWorkspaceId]);
  useEffect(() => {
    if (!selectedWorkspaceId || !workspaceSlug) {
      setWorkflowState(null);
      return;
    }
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
  }, [selectedWorkspaceId, workspaceSlug]);
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
  const resolveDescriptionBranchNodes = (): readonly TreeNode[] => {
    const branch = workflowState?.description;
    if (!branch) {
      return [];
    }
    const session = branch.session;
    const selectArtifact = (artifactPath: string, label: string) => {
      if (!(workspaceSlug && workspacePath)) {
        return;
      }
      window.dispatchEvent(
        new CustomEvent("pm:artifact:selected", {
          detail: { label, path: artifactPath, workspacePath, workspaceSlug },
        })
      );
    };
    const dispatchSessionResumeIntent = (payload: SessionResumeIntent) => {
      window.dispatchEvent(
        new CustomEvent("pm:session:resume", {
          detail: payload,
        })
      );
    };
    const nodes: TreeNode[] = [];
    const questionnairePath = branch.questionnairePath;
    if (questionnairePath)
      nodes.push({
        id: "workflow:description:questionnaire",
        label: "questionnaire.md",
        title: questionnairePath,
        status: "draft",
        visualDepth: 2,
        onSelect: () => selectArtifact(questionnairePath, "questionnaire.md"),
      });
    if (session) {
      const isReviewerSession =
        branch.sessionKind === "reviewer" || Boolean(branch.finalPath);
      const label = isReviewerSession
        ? `Reviewer session · ${session.providerId}`
        : `Session · ${session.providerId}`;
      const runSlug = isReviewerSession ? "reviewer" : null;
      nodes.push({
        id: "workflow:description:session",
        label,
        status: "active",
        visualDepth: 2,
        onSelect: () => {
          if (!(workspaceSlug && workspacePath)) {
            return;
          }
          dispatchSessionResumeIntent({
            providerId: session.providerId,
            providerSessionId: session.providerSessionId,
            workspacePath,
            workspaceSlug,
            initiativeSlug: workspaceSlug,
            stage: "description",
            runSlug,
          });
        },
      });
    }
    const draftPath = branch.draftPath;
    if (draftPath)
      nodes.push({
        id: "workflow:description:draft",
        label: "description.md",
        title: draftPath,
        status: "draft",
        visualDepth: 2,
        onSelect: () => selectArtifact(draftPath, "description.md"),
      });
    const finalPath = branch.finalPath;
    if (finalPath)
      nodes.push({
        id: "workflow:description:final",
        label: "Final_Description.md",
        title: finalPath,
        status: "active",
        visualDepth: 2,
        onSelect: () => selectArtifact(finalPath, "Final_Description.md"),
      });
    return nodes;
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
      const descriptionNodes =
        stage === "description" ? resolveDescriptionBranchNodes() : [];
      return {
        id: `workflow:${stage}`,
        label: WORKFLOW_LABELS[stage],
        status: resolveTreeStatus(status, blocked),
        visualDepth: 1,
        isCollapsible: descriptionNodes.length > 0,
        children: descriptionNodes.length > 0 ? descriptionNodes : undefined,
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
