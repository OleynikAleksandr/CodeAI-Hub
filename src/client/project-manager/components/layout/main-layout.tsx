import type React from "react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { usePanelSizes } from "../../hooks/use-panel-sizes";
import type { WorkspaceProject } from "../../types";
import { MainArea } from "./main-area";
import { Sidebar } from "./sidebar";

/**
 * Main layout component (Grid container for Section 1 + Section 2)
 */
export const MainLayout: React.FC = () => {
  const { sizes, updateSize } = usePanelSizes();
  const [projects, setProjects] = useState<readonly WorkspaceProject[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | undefined>();

  useEffect(() => {
    const unsubscribe = api.onProjectsUpdate((updatedProjects) => {
      setProjects(updatedProjects);
      setSelectedWorkspaceId((current) => {
        if (current && updatedProjects.some((project) => project.id === current)) {
          return current;
        }
        return updatedProjects[0]?.id;
      });
    });

    api.connect();

    return () => {
      unsubscribe();
    };
  }, []);

  const handleAddWorkspace = () => {
    api.pickFolder();
  };

  const activeWorkspace = projects.find((p) => p.id === selectedWorkspaceId);

  return (
    <div className="pm-layout">
      <Sidebar
        onAddWorkspace={handleAddWorkspace}
        onSelectWorkspace={setSelectedWorkspaceId}
        selectedWorkspaceId={selectedWorkspaceId}
        workspaces={[...projects]}
      />
      <MainArea
        activeWorkspace={activeWorkspace}
        onSizeChange={updateSize}
        sizes={sizes}
      />
    </div>
  );
};
