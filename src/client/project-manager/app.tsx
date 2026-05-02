import type React from "react";
import {
  LocalizationProvider,
  useResolvedLocalization,
} from "../ui/src/app-host/use-localization";
import { MainLayout } from "./components/layout/main-layout";
import { useProjectManagerSettings } from "./components/settings/use-project-manager-settings";
import { DetachedCaptureWorkbench } from "./components/capture-workbench/detached-capture-workbench";
import { DetachedDiagramView } from "./components/diagram-editor/detached-diagram-view";
import { usePreventFileDropNavigation } from "./hooks/use-prevent-file-drop-navigation";

type DetachedMode =
  | {
      readonly mode: "detached-capture";
      readonly workspacePath: string;
      readonly workspaceSlug: string;
    }
  | {
      readonly mode: "detached-diagram";
      readonly workspacePath: string;
      readonly workspaceSlug: string;
    };

const resolveDetachedMode = (): DetachedMode | null => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  if (mode !== "detached-diagram" && mode !== "detached-capture") return null;
  const workspaceSlug = params.get("workspaceSlug");
  const workspacePath = params.get("workspacePath");
  return workspaceSlug && workspacePath
    ? { mode, workspaceSlug, workspacePath }
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
  if (detached?.mode === "detached-capture") {
    return (
      <DetachedCaptureWorkbench
        workspacePath={detached.workspacePath}
        workspaceSlug={detached.workspaceSlug}
      />
    );
  }
  return <ProjectManagerWorkbenchApp />;
};
