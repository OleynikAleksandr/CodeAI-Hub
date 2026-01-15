import type React from "react";
import type { Initiative, WorkspaceProject } from "../../types";

interface SidebarProps {
  workspaces?: WorkspaceProject[];
  initiatives?: Initiative[];
  selectedWorkspaceId?: string;
  selectedInitiativeId?: string;
  onSelectWorkspace?: (id: string) => void;
  onSelectInitiative?: (id: string) => void;
  onAddWorkspace?: () => void;
  onCreateInitiative?: () => void;
}

/**
 * Sidebar component (Section 1)
 * Width adjusts to content when expanded
 */
export const Sidebar: React.FC<SidebarProps> = ({
  workspaces = [],
  initiatives = [],
  selectedWorkspaceId,
  selectedInitiativeId,
  onSelectWorkspace,
  onSelectInitiative,
  onAddWorkspace,
  onCreateInitiative,
}) => {
  const activeWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
  const activeInitiative = initiatives.find((item) => item.id === selectedInitiativeId);

  const treeNodes = selectedInitiativeId
    ? [
        {
          id: "initiative",
          label: activeInitiative?.name ?? "Initiative",
          depth: 0,
          status: "active",
        },
        { id: "description", label: "Description", depth: 1, status: "todo" },
        { id: "diagrams", label: "Diagrams", depth: 1, status: "blocked" },
        { id: "modules", label: "Modules", depth: 1, status: "draft" },
        { id: "module-a", label: "Module: Core", depth: 2, status: "todo" },
        { id: "spec", label: "Spec", depth: 3, status: "todo" },
        { id: "plan", label: "Plan", depth: 3, status: "todo" },
        { id: "execute", label: "Execute", depth: 3, status: "todo" },
      ]
    : [];

  return (
    <aside className="pm-sidebar">
      <div className="pm-sidebar__context">
        <div className="pm-context-block">
          <div className="pm-context-row">
            <span className="pm-context-label">Workspace</span>
            <button
              className="pm-context-action"
              onClick={onAddWorkspace}
              type="button"
            >
              Add
            </button>
          </div>
          <select
            aria-label="Workspace"
            className="pm-context-select"
            onChange={(event) => {
              const nextId = event.target.value;
              if (nextId) {
                onSelectWorkspace?.(nextId);
              }
            }}
            value={selectedWorkspaceId ?? ""}
          >
            {workspaces.length === 0 ? (
              <option value="" disabled>
                No workspaces yet
              </option>
            ) : null}
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>
        <div className="pm-context-block">
          <div className="pm-context-row">
            <span className="pm-context-label">Initiative</span>
            <button
              className="pm-context-action"
              onClick={onCreateInitiative}
              type="button"
            >
              New
            </button>
          </div>
          <select
            aria-label="Initiative"
            className="pm-context-select"
            disabled={initiatives.length === 0}
            onChange={(event) => {
              const nextId = event.target.value;
              if (nextId) {
                onSelectInitiative?.(nextId);
              }
            }}
            value={selectedInitiativeId ?? ""}
          >
            {initiatives.length === 0 ? (
              <option value="">No initiatives yet</option>
            ) : null}
            {initiatives.map((initiative) => (
              <option key={initiative.id} value={initiative.id}>
                {initiative.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="pm-sidebar__tree">
        <div className="pm-tree__header">
          <span className="pm-tree__title">Workflow Tree</span>
          <span className="pm-tree__subtitle">
            {activeWorkspace?.name ?? "No workspace"}
          </span>
        </div>
        {treeNodes.length === 0 ? (
          <div className="pm-tree__empty">Select a workspace and initiative.</div>
        ) : (
          <ul className="pm-tree__list">
            {treeNodes.map((node) => (
              <li
                className={`pm-tree__item pm-tree__item--${node.status}`}
                key={node.id}
                style={{ paddingLeft: `${12 + node.depth * 16}px` }}
              >
                <span className="pm-tree__status" />
                <span className="pm-tree__label">{node.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};
