import type React from "react";
import { usePanelSizes } from "../../hooks/use-panel-sizes";
import { useSidebarState } from "../../hooks/use-sidebar-state";
import { MainArea } from "./main-area";
import { Sidebar } from "./sidebar";

/**
 * Main layout component (Grid container for Section 1 + Section 2)
 */
export const MainLayout: React.FC = () => {
	const { collapsed, toggle } = useSidebarState();
	const { sizes, updateSize } = usePanelSizes();

	const layoutClass = collapsed
		? "pm-layout pm-layout--collapsed"
		: "pm-layout pm-layout--expanded";

	return (
		<div className={layoutClass}>
			<Sidebar collapsed={collapsed} onToggle={toggle} />
			<MainArea sizes={sizes} onSizeChange={updateSize} />
		</div>
	);
};
