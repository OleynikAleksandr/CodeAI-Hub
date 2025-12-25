import type React from "react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { usePanelSizes } from "../../hooks/use-panel-sizes";
import { useSidebarState } from "../../hooks/use-sidebar-state";
import type { WorkspaceProject } from "../../types";
import { MainArea } from "./main-area";
import { Sidebar } from "./sidebar";

/**
 * Main layout component (Grid container for Section 1 + Section 2)
 */
export const MainLayout: React.FC = () => {
  const { collapsed, toggle } = useSidebarState();
  const { sizes, updateSize } = usePanelSizes();
  const [projects, setProjects] = useState<readonly WorkspaceProject[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  useEffect(() => {
    const unsubscribe = api.onProjectsUpdate((updatedProjects) => {
      setProjects(updatedProjects);
      if (updatedProjects.length > 0 && !selectedId) {
        setSelectedId(updatedProjects[0].id);
      }
    });

    api.connect();

    return () => {
      unsubscribe();
    };
  }, [selectedId]);

  const layoutClass = collapsed
    ? "pm-layout pm-layout--collapsed"
    : "pm-layout pm-layout--expanded";

  const handleAddProject = () => {
    api.pickFolder();
  };

  const handleOpenSession = (id: string) => {
    console.log("Open Session for project:", id);
  };

  const handleStartTask = (id: string) => {
    console.log("Start Task for project:", id);
  };

  const activeProject = projects.find((p) => p.id === selectedId);

  return (
    <div className={layoutClass}>
      <Sidebar
        collapsed={collapsed}
        onAddProject={handleAddProject}
        onOpenSession={handleOpenSession}
        onSelectProject={setSelectedId}
        onStartTask={handleStartTask}
        onToggle={toggle}
        projects={[...projects]}
        selectedProjectId={selectedId}
      />
      <MainArea
        activeProject={activeProject}
        activeProjectName={activeProject?.name}
        onSizeChange={updateSize}
        sizes={sizes}
      />
    </div>
  );
};
