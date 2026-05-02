import type React from "react";
import { useEffect, useMemo } from "react";
import {
  LocalizationProvider,
  useResolvedLocalization,
} from "../ui/src/app-host/use-localization";
import { api } from "./api";
import { MainLayout } from "./components/layout/main-layout";
import { useProjectManagerSettings } from "./components/settings/use-project-manager-settings";
import { DetachedCaptureWorkbench } from "./components/capture-workbench/detached-capture-workbench";
import { DetachedDiagramView } from "./components/diagram-editor/detached-diagram-view";
import { usePreventFileDropNavigation } from "./hooks/use-prevent-file-drop-navigation";
import { createWorkbenchStateClient } from "./services/workbench-state-client";

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

const DetachedCaptureWorkbenchApp: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = ({ workspacePath, workspaceSlug }) => {
  const { settings, localizationRuntime } = useProjectManagerSettings();
  const localization = useResolvedLocalization(settings, localizationRuntime);
  const stateClient = useMemo(() => createWorkbenchStateClient(api), []);

  useEffect(() => {
    api.connect();
    return () => {
      api.disconnect({ dispose: true });
    };
  }, []);

  return (
    <LocalizationProvider value={localization}>
      <DetachedCaptureWorkbench
        stateClient={stateClient}
        workspacePath={workspacePath}
        workspaceSlug={workspaceSlug}
      />
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
      <DetachedCaptureWorkbenchApp
        workspacePath={detached.workspacePath}
        workspaceSlug={detached.workspaceSlug}
      />
    );
  }
  return <ProjectManagerWorkbenchApp />;
};
