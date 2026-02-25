import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import type { WorkspaceProject } from "../../types";
import {
  startWorkflowEventPolling,
  type WorkflowEvent,
} from "../../services/workflow-events-client";
import { DescriptionQuestionnairePanel } from "../description/description-questionnaire-panel";
import { ProjectManagerSessionView } from "../sessions/project-manager-session-view";
import { resolveWorkspaceSlug } from "./main-area-utils";
import { useMainAreaWorkflowState } from "./use-main-area-workflow-state";
import { PanelContainer } from "./panel-container";
import { StatusBar } from "./status-bar";
import { Toolbar } from "./toolbar";
import { WorkflowArtifactViewer } from "./workflow-artifact-viewer";
import {
  VIRTUAL_SIMULATION_TOOL_LABEL,
  useWorkflowToolSelect,
} from "./use-workflow-tool-select";

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
    ? ["Description", VIRTUAL_SIMULATION_TOOL_LABEL, "Diagram Modules", "Diagram Facades"]
    : [];
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [preferredSessionId, setPreferredSessionId] = useState<string | null>(
    null
  );
  const [selectedArtifact, setSelectedArtifact] = useState<{
    readonly workspacePath: string;
    readonly workspaceSlug: string;
    readonly path: string;
    readonly label: string;
  } | null>(null);
  const [artifactRefreshKey, setArtifactRefreshKey] = useState(0);
  const [descriptionDocument, setDescriptionDocument] = useState<{
    readonly workspacePath: string;
    readonly workspaceSlug: string;
    readonly path: string;
    readonly label: "description.md" | "Final_Description.md";
  } | null>(null);
  const [questionnaireDocument, setQuestionnaireDocument] = useState<{
    readonly workspacePath: string;
    readonly workspaceSlug: string;
    readonly path: string;
    readonly label: "questionnaire.md";
  } | null>(null);
  const [hasDescriptionSession, setHasDescriptionSession] =
    useState<boolean>(false);
  const [pendingSessionCreate, setPendingSessionCreate] = useState<{
    readonly providerTitle: string;
  } | null>(null);
  const handleToolSelect = useWorkflowToolSelect({
    activeWorkspace,
    setActiveTool,
    setPendingSessionCreate,
    setPreferredSessionId,
  });

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{
        readonly workspacePath: string;
        readonly workspaceSlug: string;
        readonly path: string;
        readonly label: string;
      }>;
      setSelectedArtifact(custom.detail);
    };
    window.addEventListener("pm:artifact:selected", handler);
    return () => {
      window.removeEventListener("pm:artifact:selected", handler);
    };
  }, []);

  useEffect(() => {
    setPreferredSessionId(null);
    setSelectedArtifact(null);
    setDescriptionDocument(null);
    setQuestionnaireDocument(null);
    setHasDescriptionSession(false);
    setPendingSessionCreate(null);
    if (!activeWorkspace) {
      setActiveTool(null);
      return;
    }
    setActiveTool((current) => current ?? "Description");
  }, [activeWorkspace?.id]);

  const handleWorkflowEvents = useCallback(
    (events: readonly WorkflowEvent[]) => {
      if (events.length > 0) {
        setPreferredSessionId((current) => current ?? null);
      }

      if (!selectedArtifact) {
        return;
      }

      const normalizedSelectedPath = selectedArtifact.path.replace(/\\/g, "/");
      const needsRefresh = events.some((event) => {
        if (event.type !== "workflow.artifact.written") {
          return false;
        }
        if (event.workspaceSlug !== selectedArtifact.workspaceSlug) {
          return false;
        }
        if (!event.filePath) {
          return true;
        }
        const normalizedFilePath = event.filePath.replace(/\\/g, "/");
        return normalizedSelectedPath.endsWith(normalizedFilePath);
      });

      if (needsRefresh) {
        setArtifactRefreshKey((current) => current + 1);
      }
    },
    [selectedArtifact]
  );

  const handleIdeaSessionCreated = useCallback((sessionId: string) => {
    setPreferredSessionId(sessionId);
    setHasDescriptionSession(true);
  }, []);

  useEffect(() => {
    if (!activeWorkspace?.path) {
      return;
    }
    const workspaceSlug = resolveWorkspaceSlug(activeWorkspace);
    if (!workspaceSlug) {
      return;
    }
    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      return;
    }
    const unsubscribe = startWorkflowEventPolling({
      httpUrl,
      workspaceSlug,
      onEvents: handleWorkflowEvents,
      intervalMs: selectedArtifact ? 2_000 : 10_000,
    });
    return () => {
      unsubscribe();
    };
  }, [
    activeWorkspace?.id,
    activeWorkspace?.path,
    activeWorkspace?.slug,
    activeWorkspace?.name,
    handleWorkflowEvents,
    selectedArtifact,
  ]);

  useMainAreaWorkflowState({
    activeWorkspace,
    activeTool,
    setActiveTool,
    setDescriptionDocument,
    setQuestionnaireDocument,
    setHasDescriptionSession,
  });

  useEffect(() => {
    const autoDocument = descriptionDocument ?? questionnaireDocument;
    if (!autoDocument) {
      return;
    }
    if (activeTool !== "Description") {
      return;
    }

    const shouldAutoReplace =
      selectedArtifact === null ||
      (selectedArtifact.workspaceSlug === autoDocument.workspaceSlug &&
        (selectedArtifact.label === "description.md" ||
          selectedArtifact.label === "Final_Description.md" ||
          selectedArtifact.label === "questionnaire.md"));

    if (!shouldAutoReplace) {
      return;
    }

    if (selectedArtifact?.path === autoDocument.path) {
      return;
    }

    setSelectedArtifact(autoDocument);
  }, [
    activeTool,
    descriptionDocument,
    questionnaireDocument,
    selectedArtifact?.label,
    selectedArtifact?.path,
    selectedArtifact?.workspaceSlug,
  ]);

  const activeWorkspaceSlug = activeWorkspace
    ? resolveWorkspaceSlug(activeWorkspace)
    : null;
  const shouldShowQuestionnaireEditor = Boolean(
    activeTool === "Description" &&
      selectedArtifact?.label === "questionnaire.md" &&
      selectedArtifact.workspaceSlug === activeWorkspaceSlug &&
      !hasDescriptionSession
  );
  const showArtifactViewer = Boolean(selectedArtifact) && !shouldShowQuestionnaireEditor;
  const showDescriptionQuestionnaire =
    activeTool === "Description" &&
    !showArtifactViewer &&
    (shouldShowQuestionnaireEditor ||
      (descriptionDocument === null && questionnaireDocument === null));
  const showVirtualSimulation = activeTool === VIRTUAL_SIMULATION_TOOL_LABEL;
  const showDiagramModules = activeTool === "Diagram Modules";
  const showDiagramFacades = activeTool === "Diagram Facades";

  return (
    <main className="pm-main-area">
      <Toolbar
        activeTool={activeTool ?? undefined}
        onToolSelect={handleToolSelect}
        tools={tools}
      />
      <PanelContainer
        artifactContent={
          showArtifactViewer && selectedArtifact ? (
            <WorkflowArtifactViewer
              label={selectedArtifact.label}
              onClose={() => setSelectedArtifact(null)}
              path={selectedArtifact.path}
              refreshKey={artifactRefreshKey}
              workspacePath={selectedArtifact.workspacePath}
              workspaceSlug={selectedArtifact.workspaceSlug}
            />
          ) : showDescriptionQuestionnaire ? (
            <DescriptionQuestionnairePanel
              onClose={() => setActiveTool(null)}
              onIdeaSessionCreatePendingChange={setPendingSessionCreate}
              onIdeaSessionCreated={handleIdeaSessionCreated}
              workspaceName={activeWorkspace?.name}
              workspacePath={activeWorkspace?.path}
              workspaceSlug={activeWorkspace?.slug}
            />
          ) : showVirtualSimulation ? (
            <div className="pm-placeholder">Шаг Virtual Simulation пока не подключен.</div>
          ) : showDiagramModules ? (
            <div className="pm-placeholder">Шаг Diagram Modules пока не подключен.</div>
          ) : showDiagramFacades ? (
            <div className="pm-placeholder">Шаг Diagram Facades пока не подключен.</div>
          ) : (
            <div className="pm-placeholder">Artifacts will appear here.</div>
          )
        }
        onSizeChange={onSizeChange}
        sessionContent={
          <ProjectManagerSessionView
            pendingSessionCreate={pendingSessionCreate}
            preferredSessionId={preferredSessionId}
            workspacePath={activeWorkspace?.path}
          />
        }
        sizes={sizes}
      />
      <StatusBar workspaceName={activeWorkspace?.name} />
    </main>
  );
};
