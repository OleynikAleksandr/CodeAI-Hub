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
  readonly action?: {
    readonly label: string;
    readonly onClick: () => void;
    readonly disabled?: boolean;
  };
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
    const nodes: TreeNode[] = [];
    if (branch.questionnairePath) nodes.push({ id: "workflow:description:questionnaire", label: "questionnaire.md", title: branch.questionnairePath, status: "draft", visualDepth: 2 });
    if (session) {
      nodes.push({
        id: "workflow:description:session",
        label: `Session · ${session.providerId}`,
        status: "active",
        visualDepth: 2,
        action: {
          label: "Continue",
          disabled: !canContinue,
          onClick: () => {
            if (!(workspaceSlug && workspacePath)) {
              return;
            }
            api.createSession({
              providerId: session.providerId,
              providerSessionId: session.providerSessionId,
              workspacePath,
              initiativeSlug: workspaceSlug,
              stage: "description",
              runSlug: "reviewer",
            });
          },
        },
      });
    }
    if (branch.draftPath) nodes.push({ id: "workflow:description:draft", label: "description.md", title: branch.draftPath, status: "draft", visualDepth: 2 });
    if (branch.finalPath) nodes.push({ id: "workflow:description:final", label: "Final_Description.md", title: branch.finalPath, status: "active", visualDepth: 2 });
    return nodes;
  };
  const resolveContinuityNodes = (stage: WorkflowStageId): readonly TreeNode[] => {
    if (!workflowState) {
      return [];
    }
    const chains = workflowState.continuity.chains.filter(
      (chain) => chain.stage === stage
    );
    if (chains.length === 0) {
      return [];
    }
    return chains.map((chain) => {
      const chainLabel = `Handoff chain ${chain.rootSessionId.slice(0, 6)}`;
      const segments = chain.segments.map((segment, segmentIndex) => {
        const reportNodes = segment.handoffReportPath
          ? [
              {
                id: `workflow:${stage}:segment:${segment.sessionId}:report`,
                label: "handoff-report.md",
                title: segment.handoffReportPath,
                status: "draft" as const,
                visualDepth: 4,
              },
            ]
          : undefined;
        return {
          id: `workflow:${stage}:segment:${segment.sessionId}`,
          label: `Session ${segmentIndex + 1} · ${segment.providerId}`,
          title: segment.providerSessionId,
          status: "draft" as const,
          visualDepth: 3,
          isCollapsible: Boolean(reportNodes),
          children: reportNodes,
        };
      });

      return {
        id: `workflow:${stage}:chain:${chain.rootSessionId}`,
        label: chainLabel,
        title: chain.rootSessionId,
        status: "draft" as const,
        visualDepth: 2,
        isCollapsible: segments.length > 0,
        children: segments.length > 0 ? segments : undefined,
      };
    });
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
      const continuityNodes = resolveContinuityNodes(stage);
      const childNodes =
        descriptionNodes.length > 0
          ? [...descriptionNodes, ...continuityNodes]
          : continuityNodes;
      return {
        id: `workflow:${stage}`,
        label: WORKFLOW_LABELS[stage],
        status: resolveTreeStatus(status, blocked),
        visualDepth: 1,
        isCollapsible: childNodes.length > 0,
        children: childNodes.length > 0 ? childNodes : undefined,
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
              <span className="pm-tree__label" title={node.title ?? node.label}>
                {node.label}
              </span>
              {node.action ? (
                <button
                  className="pm-tree__action"
                  disabled={node.action.disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    node.action?.onClick();
                  }}
                  style={{ marginLeft: "auto" }}
                  type="button"
                >
                  {node.action.label}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
