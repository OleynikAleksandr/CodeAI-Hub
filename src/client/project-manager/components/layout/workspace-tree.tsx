import type React from "react";
import { useEffect, useState } from "react";

type TreeStatus = "active" | "todo" | "blocked" | "draft";

type TreeNode = {
  readonly id: string;
  readonly label: string;
  readonly status: TreeStatus;
  readonly visualDepth: number;
  readonly isCollapsible?: boolean;
  readonly children?: readonly TreeNode[];
};

interface WorkspaceTreeProps {
  readonly selectedWorkspaceId?: string;
  readonly workspaceName?: string;
}

export const WorkspaceTree: React.FC<WorkspaceTreeProps> = ({
  selectedWorkspaceId,
  workspaceName,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Readonly<Record<string, boolean>>>({});
  const baseIndent = 12;
  const depthIndent = 16 / 1.5;

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setExpandedNodes({});
      return;
    }

    setExpandedNodes({
      workspace: true,
      modules: true,
      "module-core": true,
      "module-core:execute": false,
    });
  }, [selectedWorkspaceId]);

  const rootNode: TreeNode | null = selectedWorkspaceId
    ? {
        id: "workspace",
        label: workspaceName ?? "Workspace",
        status: "active",
        visualDepth: 0,
        isCollapsible: true,
        children: [
          { id: "description", label: "Description", status: "todo", visualDepth: 0 },
          { id: "diagrams", label: "Diagrams", status: "blocked", visualDepth: 0 },
          {
            id: "modules",
            label: "Modules",
            status: "draft",
            visualDepth: 1,
            isCollapsible: true,
            children: [
              {
                id: "module-core",
                label: "Module: Core",
                status: "todo",
                visualDepth: 2,
                isCollapsible: true,
                children: [
                  { id: "module-core:spec", label: "Spec", status: "todo", visualDepth: 3 },
                  { id: "module-core:plan", label: "Plan", status: "todo", visualDepth: 3 },
                  {
                    id: "module-core:execute",
                    label: "Execute",
                    status: "todo",
                    visualDepth: 3,
                    isCollapsible: true,
                    children: [
                      {
                        id: "module-core:execute:orchestration",
                        label: "Orchestration",
                        status: "draft",
                        visualDepth: 4,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
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
              {node.isCollapsible ? (
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
