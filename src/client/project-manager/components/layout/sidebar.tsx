import type React from "react";
import { useEffect, useState } from "react";
import type { WorkspaceProject } from "../../types";

interface SidebarProps {
  workspaces?: WorkspaceProject[];
  selectedWorkspaceId?: string;
  onSelectWorkspace?: (id: string) => void;
  onAddWorkspace?: () => void;
  onForkWorkspace?: (id: string) => void;
  onNewWorkspace?: () => void;
}

/**
 * Sidebar component (Section 1)
 * Width adjusts to content when expanded
 */
export const Sidebar: React.FC<SidebarProps> = ({
  workspaces = [],
  selectedWorkspaceId,
  onSelectWorkspace,
  onAddWorkspace,
  onForkWorkspace,
  onNewWorkspace,
}) => {
  const activeWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);

  useEffect(() => {
    if (!isWorkspaceMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWorkspaceMenuOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isWorkspaceMenuOpen]);

  const handleWorkspaceToggle = () => {
    setIsWorkspaceMenuOpen((prev) => !prev);
  };

  const handleWorkspaceSelect = (id: string) => {
    onSelectWorkspace?.(id);
    setIsWorkspaceMenuOpen(false);
  };

  const handleWorkspaceMenuClose = () => {
    setIsWorkspaceMenuOpen(false);
  };

  const handleAddWorkspaceClick = () => {
    onAddWorkspace?.();
    setIsWorkspaceMenuOpen(false);
  };

  const handleNewWorkspaceClick = () => {
    onNewWorkspace?.();
    setIsWorkspaceMenuOpen(false);
  };

  const handleForkWorkspaceClick = () => {
    if (!selectedWorkspaceId) {
      return;
    }
    onForkWorkspace?.(selectedWorkspaceId);
    setIsWorkspaceMenuOpen(false);
  };

  const treeNodes = selectedWorkspaceId
    ? [
        {
          id: "workspace",
          label: activeWorkspace?.name ?? "Workspace",
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
          </div>
          <div className="pm-context-select">
            <button
              aria-expanded={isWorkspaceMenuOpen}
              aria-haspopup="dialog"
              className="pm-context-select__button"
              onClick={handleWorkspaceToggle}
              type="button"
            >
              <span className="pm-context-select__label">
                {activeWorkspace?.name ??
                  (workspaces.length === 0 ? "No workspaces yet" : "Select workspace")}
              </span>
              <span className="pm-context-select__chevron" aria-hidden="true">
                ▾
              </span>
            </button>
          </div>
        </div>
      </div>
      {isWorkspaceMenuOpen ? (
        <div
          aria-label="Workspace menu"
          className="pm-workspace-overlay"
          onClick={handleWorkspaceMenuClose}
          role="dialog"
        >
          <div
            className="pm-workspace-menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pm-workspace-menu__actions">
              <button
                className="pm-workspace-menu__action"
                onClick={handleAddWorkspaceClick}
                type="button"
              >
                Add workspace
              </button>
              <button
                className="pm-workspace-menu__action"
                disabled={!selectedWorkspaceId || !onForkWorkspace}
                onClick={handleForkWorkspaceClick}
                type="button"
              >
                Fork workspace
              </button>
              <button
                className="pm-workspace-menu__action"
                disabled={!onNewWorkspace}
                onClick={handleNewWorkspaceClick}
                type="button"
              >
                New workspace
              </button>
            </div>
            <div className="pm-workspace-menu__spacer" />
            <div className="pm-workspace-menu__list" role="listbox">
              {workspaces.length === 0 ? (
                <div className="pm-workspace-menu__empty">No workspaces yet.</div>
              ) : (
                workspaces.map((workspace) => (
                  <button
                    className={
                      workspace.id === selectedWorkspaceId
                        ? "pm-context-option pm-context-option--active"
                        : "pm-context-option"
                    }
                    key={workspace.id}
                    onClick={() => handleWorkspaceSelect(workspace.id)}
                    type="button"
                  >
                    {workspace.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
      <div className="pm-sidebar__tree">
        <div className="pm-tree__header">
          <span className="pm-tree__title">Workflow Tree</span>
          <span className="pm-tree__subtitle">
            {activeWorkspace?.name ?? "No workspace"}
          </span>
        </div>
        {treeNodes.length === 0 ? (
          <div className="pm-tree__empty">Select a workspace to start.</div>
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
