import type React from "react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import type { WorkspaceProject } from "../../types";
import { toWorkflowWorkspaceSlug } from "../../services/workflow-state-client";
import {
  startWorkflowEventPolling,
  type WorkflowEvent,
} from "../../services/workflow-events-client";
import { DescriptionQuestionnairePanel } from "../description/description-questionnaire-panel";
import { ProjectManagerSessionView } from "../sessions/project-manager-session-view";
import { PanelContainer } from "./panel-container";
import { StatusBar } from "./status-bar";
import { Toolbar } from "./toolbar";

interface MainAreaProps {
  sizes: [number, number];
  onSizeChange: (index: 0, delta: number, containerWidth: number) => void;
  activeWorkspace?: WorkspaceProject;
}

/**
 * Main area component (Section 2)
 * Contains Toolbar (Section 3), PanelContainer (Sections 4, 5, 6), and StatusBar (Section 7)
 */
export const MainArea: React.FC<MainAreaProps> = ({
  sizes,
  onSizeChange,
  activeWorkspace,
}) => {
  const tools: readonly string[] = activeWorkspace
    ? ["Description", "Virtual Simulation", "Diagram Modules", "Diagram Facades"]
    : [];
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [preferredSessionId, setPreferredSessionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!activeWorkspace) {
      setActiveTool(null);
      setPreferredSessionId(null);
      return;
    }
    setActiveTool((current) => current ?? "Description");
  }, [activeWorkspace?.id]);

  const handleWorkflowEvents = (events: readonly WorkflowEvent[]) => {
    if (events.length > 0) {
      setPreferredSessionId((current) => current ?? null);
    }
  };

  useEffect(() => {
    if (!activeWorkspace?.name) {
      return;
    }
    const workspaceSlug = toWorkflowWorkspaceSlug(activeWorkspace.name);
    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      return;
    }
    const unsubscribe = startWorkflowEventPolling({
      httpUrl,
      workspaceSlug,
      onEvents: handleWorkflowEvents,
    });
    return () => {
      unsubscribe();
    };
  }, [activeWorkspace?.name]);

  const showDescriptionQuestionnaire = activeTool === "Description";
  const showVirtualSimulation = activeTool === "Virtual Simulation";
  const showDiagramModules = activeTool === "Diagram Modules";
  const showDiagramFacades = activeTool === "Diagram Facades";

  return (
    <main className="pm-main-area">
      <Toolbar
        activeTool={activeTool ?? undefined}
        onToolSelect={setActiveTool}
        tools={tools}
      />
      <PanelContainer
        artifactContent={
          showDescriptionQuestionnaire ? (
            <DescriptionQuestionnairePanel
              onClose={() => setActiveTool(null)}
              onIdeaSessionCreated={setPreferredSessionId}
              workspaceName={activeWorkspace?.name}
              workspacePath={activeWorkspace?.path}
            />
          ) : showVirtualSimulation ? (
            <div className="pm-placeholder">
              Шаг Virtual Simulation пока не подключен.
            </div>
          ) : showDiagramModules ? (
            <div className="pm-placeholder">
              Шаг Diagram Modules пока не подключен.
            </div>
          ) : showDiagramFacades ? (
            <div className="pm-placeholder">
              Шаг Diagram Facades пока не подключен.
            </div>
          ) : (
            <div className="pm-placeholder">Artifacts will appear here.</div>
          )
        }
        onSizeChange={onSizeChange}
        sessionContent={
          <ProjectManagerSessionView
            preferredSessionId={preferredSessionId}
            workspacePath={activeWorkspace?.path}
          />
        }
        sizes={sizes}
      />
      <StatusBar
        workspaceName={activeWorkspace?.name}
      />
    </main>
  );
};
