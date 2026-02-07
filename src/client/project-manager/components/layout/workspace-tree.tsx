import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { getDefaultProviderTitle } from "../../../../types/provider";
import { api } from "../../api";
import {
  WORKFLOW_STAGE_ORDER,
  toWorkflowWorkspaceSlug,
  type WorkflowStageId,
  type WorkflowStageStatus,
  type WorkflowStateSnapshot,
} from "../../services/workflow-state-client";
import {
  useWorkspaceTreeAutoSelect,
  type SessionResumeIntent,
} from "./workspace-tree-auto-select";
import { WORKFLOW_LABELS, type TreeNode, type TreeStatus } from "./workspace-tree-model";
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

  const dispatchSessionResumeIntent = useCallback((payload: SessionResumeIntent) => {
    window.dispatchEvent(
      new CustomEvent("pm:session:resume", {
        detail: payload,
      })
    );
  }, []);

  const { handleStateUpdate, markWorkspaceChanged, resetPendingSelection } =
    useWorkspaceTreeAutoSelect({
      selectedWorkspaceId,
      workspacePath,
      workspaceSlug,
      onSelectArtifact: selectArtifact,
      onResumeSession: () => {},
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
  }, [markWorkspaceChanged, resetPendingSelection, selectedWorkspaceId, workspacePath, workspaceSlug]);
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
  const resolveDescriptionBranchNodes = (): readonly TreeNode[] => {
    const branch = workflowState?.description;
    if (!branch) {
      return [];
    }
    const session = branch.session;
    const nodes: TreeNode[] = [];
    const artifactPath =
      branch.finalPath ?? branch.draftPath ?? branch.questionnairePath;
    const artifactLabel = branch.finalPath
      ? "Final_Description.md"
      : branch.draftPath
        ? "description.md"
        : "questionnaire.md";
    const artifactStatus = branch.finalPath ? "active" : "draft";
    if (artifactPath) {
      nodes.push({
        id: "workflow:description:artifact",
        label: artifactLabel,
        title: artifactPath,
        status: artifactStatus,
        visualDepth: 2,
        onSelect: () => selectArtifact(artifactPath, artifactLabel),
      });
    }
    if (session) {
      const isReviewerSession =
        branch.sessionKind === "reviewer" || Boolean(branch.finalPath);
      const providerTitle =
        session.providerId === "claudeCodeCli" ||
        session.providerId === "codexCli" ||
        session.providerId === "geminiCli"
          ? getDefaultProviderTitle(session.providerId)
          : session.providerId;
      const label = isReviewerSession
        ? `Reviewer ${providerTitle}`
        : `Description ${providerTitle}`;
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
            sessionKind: isReviewerSession ? "reviewer" : "collector",
            runSlug,
          });
        },
      });
    }
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
