import type React from "react";
import {
  LocalizationProvider,
  useResolvedLocalization,
} from "../ui/src/app-host/use-localization";
import { MainLayout } from "./components/layout/main-layout";
import { useProjectManagerSettings } from "./components/settings/use-project-manager-settings";
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
  const { settings, localizationRuntime } = useProjectManagerSettings();
  const localization = useResolvedLocalization(settings, localizationRuntime);

  const detached = resolveDetachedParams();
  return (
    <LocalizationProvider value={localization}>
      {detached ? (
        <DetachedDiagramView
          workspacePath={detached.workspacePath}
          workspaceSlug={detached.workspaceSlug}
        />
      ) : (
        <div className="pm-workbench">
          <MainLayout />
        </div>
      )}
    </LocalizationProvider>
  );
};
