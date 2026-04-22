import type React from "react";
import {
  LocalizationProvider,
  useResolvedLocalization,
} from "../ui/src/app-host/use-localization";
import SettingsView from "../ui/src/components/settings-view";
import { MainLayout } from "./components/layout/main-layout";
import { useProjectManagerSettings } from "./components/settings/use-project-manager-settings";
import { useProjectManagerSettingsState } from "./components/settings/use-project-manager-settings-state";
import { DetachedDiagramView } from "./components/diagram-editor/detached-diagram-view";
import { usePreventFileDropNavigation } from "./hooks/use-prevent-file-drop-navigation";

type DetachedMode =
  | {
      readonly mode: "detached-diagram";
      readonly workspacePath: string;
      readonly workspaceSlug: string;
    }
  | { readonly mode: "detached-settings" };

const resolveDetachedMode = (): DetachedMode | null => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") === "detached-settings") {
    return { mode: "detached-settings" };
  }
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

const DetachedSettingsApp: React.FC = () => {
  const settingsState = useProjectManagerSettingsState();
  const localization = useResolvedLocalization(
    settingsState.settings,
    settingsState.localizationRuntime
  );

  return (
    <LocalizationProvider value={localization}>
      <div className="pm-workbench">
        <SettingsView
          mode="project-manager"
          onClose={() => window.close()}
          state={settingsState}
        />
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
  if (detached?.mode === "detached-settings") {
    return <DetachedSettingsApp />;
  }
  return <ProjectManagerWorkbenchApp />;
};
