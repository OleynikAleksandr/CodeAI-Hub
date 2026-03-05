import type React from "react";
import { DescriptionQuestionnairePanel } from "../description/description-questionnaire-panel";
import { DescriptionStepHelp } from "../description/description-step-help";
import { DiagramFacadesHelp } from "../diagram-facades/diagram-facades-help";
import { DiagramFacadesPanel } from "../diagram-facades/diagram-facades-panel";
import { DiagramModulesHelp } from "../diagram-modules/diagram-modules-help";
import { DiagramModulesPanel } from "../diagram-modules/diagram-modules-panel";
import { ProjectManagerSessionView } from "../sessions/project-manager-session-view";
import { VirtualSimulationHelp } from "../virtual-simulation/virtual-simulation-help";
import { VirtualSimulationPanel } from "../virtual-simulation/virtual-simulation-panel";
import { WorkflowArtifactViewer } from "./workflow-artifact-viewer";
import { VIRTUAL_SIMULATION_TOOL_LABEL } from "./use-workflow-tool-select";

interface SelectedArtifact {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
  readonly label: string;
}

export const renderStagePanel = (
  Panel: React.FC<{ readonly workspacePath: string; readonly workspaceSlug: string }>,
  activeWorkspacePath: string | undefined,
  activeWorkspaceSlug: string | null
): React.ReactNode =>
  activeWorkspacePath && activeWorkspaceSlug ? (
    <Panel workspacePath={activeWorkspacePath} workspaceSlug={activeWorkspaceSlug} />
  ) : (
    <div className="pm-placeholder">Выберите workspace, чтобы начать.</div>
  );

interface ArtifactContentProps {
  readonly activeTool: string | null;
  readonly activeWorkspaceName: string | undefined;
  readonly activeWorkspacePath: string | undefined;
  readonly activeWorkspaceSlug: string | null;
  readonly artifactRefreshKey: number;
  readonly descriptionDocumentExists: boolean;
  readonly helpMode: boolean;
  readonly hasDescriptionSession: boolean;
  readonly onDescriptionSessionCreated: (sessionId: string) => void;
  readonly onPendingSessionCreateChange: (
    payload: { readonly providerTitle: string } | null
  ) => void;
  readonly onSetActiveToolNull: () => void;
  readonly onSelectedArtifactClear: () => void;
  readonly questionnaireDocumentExists: boolean;
  readonly selectedArtifact: SelectedArtifact | null;
  readonly shouldShowQuestionnaireEditor: boolean;
}

export const MainAreaArtifactContent: React.FC<ArtifactContentProps> = ({
  activeTool,
  activeWorkspaceName,
  activeWorkspacePath,
  activeWorkspaceSlug,
  artifactRefreshKey,
  descriptionDocumentExists,
  helpMode,
  hasDescriptionSession,
  onDescriptionSessionCreated,
  onPendingSessionCreateChange,
  onSetActiveToolNull,
  onSelectedArtifactClear,
  questionnaireDocumentExists,
  selectedArtifact,
  shouldShowQuestionnaireEditor,
}) => {
  const showArtifactViewer =
    selectedArtifact !== null && !shouldShowQuestionnaireEditor && !helpMode;
  const showDescriptionQuestionnaire =
    activeTool === "Description" &&
    !helpMode &&
    !showArtifactViewer &&
    (shouldShowQuestionnaireEditor || (!descriptionDocumentExists && !questionnaireDocumentExists));

  if (helpMode) {
    if (activeTool === "Description") {
      return (
        <DescriptionStepHelp mode={hasDescriptionSession ? "post_submit" : "pre_submit"} />
      );
    }
    if (activeTool === VIRTUAL_SIMULATION_TOOL_LABEL) {
      return <VirtualSimulationHelp />;
    }
    if (activeTool === "Diagram Modules") {
      return <DiagramModulesHelp />;
    }
    if (activeTool === "Diagram Facades") {
      return <DiagramFacadesHelp />;
    }
  }
  if (showArtifactViewer && selectedArtifact) {
    return (
      <WorkflowArtifactViewer
        label={selectedArtifact.label}
        onClose={onSelectedArtifactClear}
        path={selectedArtifact.path}
        refreshKey={artifactRefreshKey}
        workspacePath={selectedArtifact.workspacePath}
        workspaceSlug={selectedArtifact.workspaceSlug}
      />
    );
  }
  if (showDescriptionQuestionnaire) {
    return (
      <DescriptionQuestionnairePanel
        onClose={onSetActiveToolNull}
        onIdeaSessionCreatePendingChange={onPendingSessionCreateChange}
        onIdeaSessionCreated={onDescriptionSessionCreated}
        workspaceName={activeWorkspaceName}
        workspacePath={activeWorkspacePath}
        workspaceSlug={activeWorkspaceSlug ?? undefined}
      />
    );
  }
  if (activeTool === VIRTUAL_SIMULATION_TOOL_LABEL) {
    return renderStagePanel(VirtualSimulationPanel, activeWorkspacePath, activeWorkspaceSlug);
  }
  if (activeTool === "Diagram Modules") {
    return renderStagePanel(DiagramModulesPanel, activeWorkspacePath, activeWorkspaceSlug);
  }
  if (activeTool === "Diagram Facades") {
    return renderStagePanel(DiagramFacadesPanel, activeWorkspacePath, activeWorkspaceSlug);
  }
  if (activeTool === "Description" && hasDescriptionSession && selectedArtifact === null) {
    return <div className="pm-placeholder">Выберите артефакт Description в дереве workflow.</div>;
  }
  return (
    <div className="pm-placeholder">
      Выберите шаг в Toolbar. Для Description начните с <code>questionnaire.md</code> и
      доведите единую сессию до <code>Final_Description.md</code>.
    </div>
  );
};

interface SessionContentProps {
  readonly pendingSessionCreate: { readonly providerTitle: string } | null;
  readonly preferredSessionId: string | null;
  readonly showDescriptionHelp: boolean;
  readonly workspacePath: string | undefined;
}

export const MainAreaSessionContent: React.FC<SessionContentProps> = ({
  pendingSessionCreate,
  preferredSessionId,
  showDescriptionHelp,
  workspacePath,
}) =>
  showDescriptionHelp ? (
    <DescriptionStepHelp mode="pre_submit" />
  ) : (
    <ProjectManagerSessionView
      pendingSessionCreate={pendingSessionCreate}
      preferredSessionId={preferredSessionId}
      workspacePath={workspacePath}
    />
  );
