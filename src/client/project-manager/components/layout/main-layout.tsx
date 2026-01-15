import type React from "react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { usePanelSizes } from "../../hooks/use-panel-sizes";
import type { Initiative, WorkspaceProject } from "../../types";
import { MainArea } from "./main-area";
import { Sidebar } from "./sidebar";

/**
 * Main layout component (Grid container for Section 1 + Section 2)
 */
export const MainLayout: React.FC = () => {
  const { sizes, updateSize } = usePanelSizes();
  const [projects, setProjects] = useState<readonly WorkspaceProject[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | undefined>();
  const [initiatives, setInitiatives] = useState<readonly Initiative[]>([]);
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string | undefined>();

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

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setInitiatives([]);
      setSelectedInitiativeId(undefined);
      return;
    }

    const seededInitiatives: Initiative[] = [
      {
        id: `${selectedWorkspaceId}:workflow-tree-mvp`,
        name: "Workflow Tree MVP",
      },
    ];

    setInitiatives(seededInitiatives);
    setSelectedInitiativeId((current) => {
      if (current && seededInitiatives.some((item) => item.id === current)) {
        return current;
      }
      return seededInitiatives[0]?.id;
    });
  }, [selectedWorkspaceId]);

  const handleAddWorkspace = () => {
    api.pickFolder();
  };

  const handleCreateInitiative = () => {
    // Placeholder for Initiative creation dialog
  };

  const activeWorkspace = projects.find((p) => p.id === selectedWorkspaceId);
  const activeInitiative = initiatives.find((item) => item.id === selectedInitiativeId);

  return (
    <div className="pm-layout">
      <Sidebar
        initiatives={[...initiatives]}
        onAddWorkspace={handleAddWorkspace}
        onCreateInitiative={handleCreateInitiative}
        onSelectInitiative={setSelectedInitiativeId}
        onSelectWorkspace={setSelectedWorkspaceId}
        selectedInitiativeId={selectedInitiativeId}
        selectedWorkspaceId={selectedWorkspaceId}
        workspaces={[...projects]}
      />
      <MainArea
        activeInitiativeName={activeInitiative?.name}
        activeWorkspaceName={activeWorkspace?.name}
        onSizeChange={updateSize}
        sizes={sizes}
      />
    </div>
  );
};
