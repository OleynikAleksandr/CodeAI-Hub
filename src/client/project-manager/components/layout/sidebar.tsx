import type React from "react";
import { useEffect, useRef, useState } from "react";
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
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isInitiativeMenuOpen, setIsInitiativeMenuOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const initiativeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const targetNode = event.target as Node | null;
      if (
        isWorkspaceMenuOpen &&
        workspaceMenuRef.current &&
        targetNode &&
        !workspaceMenuRef.current.contains(targetNode)
      ) {
        setIsWorkspaceMenuOpen(false);
      }
      if (
        isInitiativeMenuOpen &&
        initiativeMenuRef.current &&
        targetNode &&
        !initiativeMenuRef.current.contains(targetNode)
      ) {
        setIsInitiativeMenuOpen(false);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [isWorkspaceMenuOpen, isInitiativeMenuOpen]);

  const handleWorkspaceToggle = () => {
    if (workspaces.length === 0) {
      return;
    }
    setIsWorkspaceMenuOpen((prev) => !prev);
  };

  const handleInitiativeToggle = () => {
    if (initiatives.length === 0) {
      return;
    }
    setIsInitiativeMenuOpen((prev) => !prev);
  };

  const handleWorkspaceSelect = (id: string) => {
    onSelectWorkspace?.(id);
    setIsWorkspaceMenuOpen(false);
  };

  const handleInitiativeSelect = (id: string) => {
    onSelectInitiative?.(id);
    setIsInitiativeMenuOpen(false);
  };

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
          <div className="pm-context-select" ref={workspaceMenuRef}>
            <button
              aria-expanded={isWorkspaceMenuOpen}
              aria-haspopup="listbox"
              className="pm-context-select__button"
              disabled={workspaces.length === 0}
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
            {isWorkspaceMenuOpen ? (
              <div className="pm-context-menu" role="listbox">
                {workspaces.map((workspace) => (
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
                ))}
              </div>
            ) : null}
          </div>
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
          <div className="pm-context-select" ref={initiativeMenuRef}>
            <button
              aria-expanded={isInitiativeMenuOpen}
              aria-haspopup="listbox"
              className="pm-context-select__button"
              disabled={initiatives.length === 0}
              onClick={handleInitiativeToggle}
              type="button"
            >
              <span className="pm-context-select__label">
                {activeInitiative?.name ??
                  (initiatives.length === 0 ? "No initiatives yet" : "Select initiative")}
              </span>
              <span className="pm-context-select__chevron" aria-hidden="true">
                ▾
              </span>
            </button>
            {isInitiativeMenuOpen ? (
              <div className="pm-context-menu" role="listbox">
                {initiatives.map((initiative) => (
                  <button
                    className={
                      initiative.id === selectedInitiativeId
                        ? "pm-context-option pm-context-option--active"
                        : "pm-context-option"
                    }
                    key={initiative.id}
                    onClick={() => handleInitiativeSelect(initiative.id)}
                    type="button"
                  >
                    {initiative.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
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
