import type React from "react";
import {
  LocalizationProvider,
  useResolvedLocalization,
} from "../ui/src/app-host/use-localization";
import { MainLayout } from "./components/layout/main-layout";
import { useProjectManagerSettings } from "./components/settings/use-project-manager-settings";
import { DetachedDiagramView } from "./components/diagram-editor/detached-diagram-view";
import { usePreventFileDropNavigation } from "./hooks/use-prevent-file-drop-navigation";

type DetachedMode = {
  readonly mode: "detached-diagram";
  readonly workspacePath: string;
  readonly workspaceSlug: string;
};

const resolveDetachedMode = (): DetachedMode | null => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== "detached-diagram") return null;
  const workspaceSlug = params.get("workspaceSlug");
  const workspacePath = params.get("workspacePath");
  return workspaceSlug && workspacePath
    ? { mode: "detached-diagram", workspaceSlug, workspacePath }
    : null;
};

const ProjectManagerWorkbenchApp: React.FC = () => {
  const { settings, localizationRuntime } = useProjectManagerSettings();
  const localization = useResolvedLocalization(settings, localizationRuntime);

  return (
    <LocalizationProvider value={localization}>
      <div className="pm-workbench">
        <MainLayout />
      </div>
    </LocalizationProvider>
  );
};

/**
 * Project Manager root application component
 */
export const App: React.FC = () => {
  usePreventFileDropNavigation();
  const detached = resolveDetachedMode();
  if (detached?.mode === "detached-diagram") {
    return (
      <DetachedDiagramView
        workspacePath={detached.workspacePath}
        workspaceSlug={detached.workspaceSlug}
      />
    );
  }
  return <ProjectManagerWorkbenchApp />;
};
