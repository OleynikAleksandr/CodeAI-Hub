import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import type { WorkspaceProject } from "../../types";
import { resolveQuestionnairePath } from "../../services/description-questionnaire-utils";
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
import { WorkflowArtifactViewer } from "./workflow-artifact-viewer";

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
  const [selectedArtifact, setSelectedArtifact] = useState<{
    readonly workspacePath: string;
    readonly workspaceSlug: string;
    readonly path: string;
    readonly label: string;
  } | null>(null);
  const [artifactRefreshKey, setArtifactRefreshKey] = useState<number>(0);
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
    if (!activeWorkspace) {
      setActiveTool(null);
      setPreferredSessionId(null);
      setSelectedArtifact(null);
      setQuestionnaireDocument(null);
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
      intervalMs: selectedArtifact ? 2_000 : 10_000,
    });
    return () => {
      unsubscribe();
    };
  }, [activeWorkspace?.name, handleWorkflowEvents, selectedArtifact]);

  useEffect(() => {
    if (!activeWorkspace?.name || !activeWorkspace.path) {
      setDescriptionDocument(null);
      setQuestionnaireDocument(null);
      return;
    }

    const workspaceSlug = toWorkflowWorkspaceSlug(activeWorkspace.name);
    const workspacePath = activeWorkspace.path;
    let cancelled = false;
    let timer = 0;
    let fastPolling = true;

    const loadState = async () => {
      const state = await api.getWorkflowState(workspaceSlug, workspacePath);
      if (cancelled) {
        return;
      }
      if (state && fastPolling) {
        fastPolling = false;
        window.clearInterval(timer);
        timer = window.setInterval(loadState, 10_000);
      }

      const branch = state?.description;
      const nextDescription =
        branch?.finalPath && branch.finalPath.trim().length > 0
          ? { path: branch.finalPath, label: "Final_Description.md" as const }
          : branch?.draftPath && branch.draftPath.trim().length > 0
            ? { path: branch.draftPath, label: "description.md" as const }
            : null;

      setDescriptionDocument(
        nextDescription
          ? { ...nextDescription, workspacePath, workspaceSlug }
          : null
      );

      const hasDescriptionSession = Boolean(
        branch?.session || branch?.sessionKind
      );
      const questionnairePath =
        branch?.questionnairePath && branch.questionnairePath.trim().length > 0
          ? branch.questionnairePath
          : resolveQuestionnairePath(activeWorkspace.name);
      const nextQuestionnaire =
        hasDescriptionSession && !nextDescription
          ? {
              path: questionnairePath,
              label: "questionnaire.md" as const,
            }
          : null;

      setQuestionnaireDocument(
        nextQuestionnaire
          ? { ...nextQuestionnaire, workspacePath, workspaceSlug }
          : null
      );
    };

    loadState();
    timer = window.setInterval(loadState, 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeWorkspace?.name, activeWorkspace?.path]);

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

  const showArtifactViewer = Boolean(selectedArtifact);
  const showDescriptionQuestionnaire =
    !showArtifactViewer &&
    activeTool === "Description" &&
    descriptionDocument === null &&
    questionnaireDocument === null;
  const showVirtualSimulation = activeTool === "Virtual Simulation";
  const showDiagramModules = activeTool === "Diagram Modules";
  const showDiagramFacades = activeTool === "Diagram Facades";

  return (
    <main className="pm-main-area">
      <Toolbar activeTool={activeTool ?? undefined} onToolSelect={setActiveTool} tools={tools} />
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
              onIdeaSessionCreated={setPreferredSessionId}
              workspaceName={activeWorkspace?.name}
              workspacePath={activeWorkspace?.path}
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
