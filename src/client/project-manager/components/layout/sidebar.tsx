import type React from "react";
import { CollapseIcon } from "../icons/collapse-icon";
import { ExpandIcon } from "../icons/expand-icon";

interface SidebarProps {
	collapsed: boolean;
	onToggle: () => void;
}

/**
 * Sidebar component (Section 1)
 * Width toggles between 120px (expanded) and 40px (collapsed)
 */
export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => (
	<aside className="pm-sidebar">
		<button
			type="button"
			className="pm-sidebar__toggle"
			onClick={onToggle}
			aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
			title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
		>
			{collapsed ? <ExpandIcon size={20} /> : <CollapseIcon size={20} />}
		</button>
		<div className="pm-sidebar__content">
			{/* Future: Navigation items will go here */}
		</div>
	</aside>
);
