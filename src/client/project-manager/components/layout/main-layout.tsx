import type React from "react";
import { useState } from "react";
import { usePanelSizes } from "../../hooks/use-panel-sizes";
import { useSidebarState } from "../../hooks/use-sidebar-state";
import { MainArea } from "./main-area";
import { Sidebar } from "./sidebar";
import type { WorkspaceProject } from "../../types";

const MOCK_PROJECTS: WorkspaceProject[] = [
  {
    id: "1",
    name: "CodeAI-Hub",
    path: "/Users/user/VSCODE/CodeAI-Hub",
    lastUsed: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Project-with-very-long-name-to-expand-the-sidebar",
    path: "/Users/user/VSCODE/Long-Project",
    lastUsed: new Date().toISOString(),
  },
];

/**
 * Main layout component (Grid container for Section 1 + Section 2)
 */
export const MainLayout: React.FC = () => {
  const { collapsed, toggle } = useSidebarState();
  const { sizes, updateSize } = usePanelSizes();
  const [selectedId, setSelectedId] = useState<string>("1");

  const layoutClass = collapsed
    ? "pm-layout pm-layout--collapsed"
    : "pm-layout pm-layout--expanded";

  const handleAddProject = () => {
    console.log("Add Project clicked");
  };

  return (
    <div className={layoutClass}>
      <Sidebar
        collapsed={collapsed}
        onAddProject={handleAddProject}
        onSelectProject={setSelectedId}
        onToggle={toggle}
        projects={MOCK_PROJECTS}
        selectedProjectId={selectedId}
      />
      <MainArea onSizeChange={updateSize} sizes={sizes} />
    </div>
  );
};
