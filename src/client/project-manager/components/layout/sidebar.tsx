import type React from "react";
import { CollapseIcon } from "../icons/collapse-icon";
import { ExpandIcon } from "../icons/expand-icon";
import type { WorkspaceProject } from "../../types";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  projects?: WorkspaceProject[];
  onAddProject?: () => void;
  onSelectProject?: (id: string) => void;
  selectedProjectId?: string;
}

/**
 * Sidebar component (Section 1)
 * Width adjusts to content when expanded
 */
export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  projects = [],
  onAddProject,
  onSelectProject,
  selectedProjectId,
}) => (
  <aside className="pm-sidebar">
    <div className="pm-sidebar__header">
      <button
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="pm-sidebar__toggle"
        onClick={onToggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        type="button"
      >
        {collapsed ? <ExpandIcon size={20} /> : <CollapseIcon size={20} />}
      </button>
      {!collapsed && (
        <button
          aria-label="Add Workspace"
          className="pm-sidebar__add"
          onClick={onAddProject}
          title="Add Workspace"
          type="button"
        >
          <span className="pm-icon--add">+</span>
        </button>
      )}
    </div>
    <div className="pm-sidebar__content">
      {!collapsed && (
        <ul className="pm-sidebar__list">
          {projects.map((project) => (
            <li
              className={`pm-sidebar__item ${
                selectedProjectId === project.id ? "pm-sidebar__item--active" : ""
              }`}
              key={project.id}
              onClick={() => onSelectProject?.(project.id)}
              title={project.path}
            >
              <span className="pm-sidebar__item-name">{project.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </aside>
);
