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
import MarkdownContent from "../../../ui/src/session/markdown-content";
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
  const [selectedArtifact, setSelectedArtifact] = useState<{
    readonly workspacePath: string;
    readonly workspaceSlug: string;
    readonly path: string;
    readonly label: string;
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

  const showArtifactViewer = Boolean(selectedArtifact);
  const showDescriptionQuestionnaire = !showArtifactViewer && activeTool === "Description";
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
          showArtifactViewer && selectedArtifact ? (
            <WorkflowArtifactViewer
              label={selectedArtifact.label}
              onClose={() => setSelectedArtifact(null)}
              path={selectedArtifact.path}
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

const WorkflowArtifactViewer = (props: {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
  readonly label: string;
  readonly onClose: () => void;
}) => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);
    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      setError("Не удалось загрузить артефакт: Core HTTP недоступен.");
      return () => {
        cancelled = true;
      };
    }
    const query = new URLSearchParams({
      workspacePath: props.workspacePath,
      workspaceSlug: props.workspaceSlug,
      path: props.path,
      maxBytes: "300000",
    });
    fetch(`${httpUrl}/api/v1/orchestrator/workflow-artifact?${query.toString()}`, {
      method: "GET",
    })
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setError("Не удалось загрузить артефакт (endpoint недоступен или файл не найден).");
          return;
        }
        const payload = (await response.json()) as unknown;
        if (!payload || typeof payload !== "object") {
          setError("Не удалось загрузить артефакт: неверный ответ сервера.");
          return;
        }
        const record = payload as Record<string, unknown>;
        const nextContent = typeof record.content === "string" ? record.content : null;
        if (nextContent === null) {
          setError("Не удалось загрузить артефакт: контент отсутствует.");
          return;
        }
        setContent(nextContent);
      })
      .catch((readError: unknown) => {
        if (cancelled) {
          return;
        }
        setError(readError instanceof Error ? readError.message : String(readError));
      });
    return () => {
      cancelled = true;
    };
  }, [props.path, props.workspacePath, props.workspaceSlug]);

  return (
    <div className="pm-details">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={props.onClose} type="button">
          Back
        </button>
        <strong title={props.path}>{props.label}</strong>
      </div>
      {error ? <div className="pm-placeholder">{error}</div> : null}
      {!error && content === null ? (
        <div className="pm-placeholder">Загружаем артефакт...</div>
      ) : null}
      {!error && content !== null ? (
        <MarkdownContent content={content} />
      ) : null}
    </div>
  );
};
