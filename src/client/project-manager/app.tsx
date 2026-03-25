import type React from "react";
import { MainLayout } from "./components/layout/main-layout";
import { DetachedDiagramView } from "./components/diagram-editor/detached-diagram-view";
import { usePreventFileDropNavigation } from "./hooks/use-prevent-file-drop-navigation";

const resolveDetachedParams = (): {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
} | null => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== "detached-diagram") return null;
  const workspaceSlug = params.get("workspaceSlug");
  const workspacePath = params.get("workspacePath");
  return workspaceSlug && workspacePath ? { workspaceSlug, workspacePath } : null;
};

/**
 * Project Manager root application component
 */
export const App: React.FC = () => {
  usePreventFileDropNavigation();

  const detached = resolveDetachedParams();
  if (detached) {
    return (
      <DetachedDiagramView
        workspacePath={detached.workspacePath}
        workspaceSlug={detached.workspaceSlug}
      />
    );
  }

  return (
    <div className="pm-workbench">
      <MainLayout />
    </div>
  );
};
