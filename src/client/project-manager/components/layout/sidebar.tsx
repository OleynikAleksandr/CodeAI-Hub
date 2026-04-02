import type React from "react";
import { useEffect, useState } from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import type { WorkspaceProject } from "../../types";
import { WorkspaceTree } from "./workspace-tree";

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
  const { t } = useLocalization();
  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === selectedWorkspaceId
  );
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const workspaceLabel = t(
    "ui_interface",
    "pm.sidebar.workspace.label",
    "Workspace"
  );
  const emptyWorkspaceLabel = t(
    "ui_interface",
    "pm.sidebar.workspace.empty_label",
    "No workspaces yet"
  );
  const selectWorkspaceLabel = t(
    "ui_interface",
    "pm.sidebar.workspace.select_label",
    "Select workspace"
  );
  const workspaceMenuAriaLabel = t(
    "ui_interface",
    "pm.sidebar.workspace.menu_aria_label",
    "Workspace menu"
  );
  const addWorkspaceLabel = t(
    "ui_interface",
    "pm.sidebar.workspace.add_action",
    "Add workspace"
  );
  const forkWorkspaceLabel = t(
    "ui_interface",
    "pm.sidebar.workspace.fork_action",
    "Fork workspace"
  );
  const newWorkspaceLabel = t(
    "ui_interface",
    "pm.sidebar.workspace.new_action",
    "New workspace"
  );
  const workspaceMenuEmptyLabel = t(
    "system_feedback",
    "pm.sidebar.workspace.menu_empty_label",
    "No workspaces yet."
  );

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

  return (
    <aside className="pm-sidebar">
      <div className="pm-sidebar__context">
        <div className="pm-context-block">
          <div className="pm-context-row">
            <span className="pm-context-label">{workspaceLabel}</span>
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
                  (workspaces.length === 0
                    ? emptyWorkspaceLabel
                    : selectWorkspaceLabel)}
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
          aria-label={workspaceMenuAriaLabel}
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
                {addWorkspaceLabel}
              </button>
              <button
                className="pm-workspace-menu__action"
                disabled={!selectedWorkspaceId || !onForkWorkspace}
                onClick={handleForkWorkspaceClick}
                type="button"
              >
                {forkWorkspaceLabel}
              </button>
              <button
                className="pm-workspace-menu__action"
                disabled={!onNewWorkspace}
                onClick={handleNewWorkspaceClick}
                type="button"
              >
                {newWorkspaceLabel}
              </button>
            </div>
            <div className="pm-workspace-menu__spacer" />
            <div className="pm-workspace-menu__list" role="listbox">
              {workspaces.length === 0 ? (
                <div className="pm-workspace-menu__empty">
                  {workspaceMenuEmptyLabel}
                </div>
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
      <WorkspaceTree
        selectedWorkspaceId={selectedWorkspaceId}
        workspaceName={activeWorkspace?.name}
        workspacePath={activeWorkspace?.path}
        workspaceSlug={activeWorkspace?.slug}
      />
    </aside>
  );
};
