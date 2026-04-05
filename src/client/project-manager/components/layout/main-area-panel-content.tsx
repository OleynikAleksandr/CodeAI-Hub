import type React from "react";
import {
  ApplicationFoundationEnvelopeHelp,
  ApplicationFoundationEnvelopePanel,
} from "../application-foundation-envelope/application-foundation-envelope-panel";
import { DescriptionQuestionnairePanel } from "../description/description-questionnaire-panel";
import { DescriptionStepHelp } from "../description/description-step-help";
import { DiagramModulesHelp } from "../diagram-modules/diagram-modules-help";
import { DiagramModulesPanel } from "../diagram-modules/diagram-modules-panel";
import { ProjectManagerSessionView } from "../sessions/project-manager-session-view";
import { VirtualSimulationHelp } from "../virtual-simulation/virtual-simulation-help";
import { VirtualSimulationPanel } from "../virtual-simulation/virtual-simulation-panel";
import { useDescriptionArtifactAvailability } from "./use-description-artifact-availability";
import { useDiagramModulesArtifactAvailability } from "./use-diagram-modules-artifact-availability";
import {
  isDiagramTool,
  resolveDiagramSourceArtifact,
  resolveDiagramSourcePendingMessage,
  type ArtifactHeaderMode,
} from "./stage-artifact-mode";
import { WorkflowArtifactViewer } from "./workflow-artifact-viewer";
import {
  APPLICATION_FOUNDATION_ENVELOPE_TOOL_LABEL,
  VIRTUAL_SIMULATION_TOOL_LABEL,
} from "./use-workflow-tool-select";

interface SelectedArtifact {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
  readonly label: string;
}

const renderStagePanel = (
  Panel: React.FC<{
    readonly workspacePath: string;
    readonly workspaceSlug: string;
    readonly refreshKey?: number;
  }>,
  activeWorkspacePath: string | undefined,
  activeWorkspaceSlug: string | null,
  refreshKey?: number
): React.ReactNode =>
  activeWorkspacePath && activeWorkspaceSlug ? (
    <Panel
      refreshKey={refreshKey}
      workspacePath={activeWorkspacePath}
      workspaceSlug={activeWorkspaceSlug}
    />
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
  readonly headerMode: ArtifactHeaderMode;
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
  readonly workflowStoreLoaded: boolean;
}

export const MainAreaArtifactContent: React.FC<ArtifactContentProps> = ({
  activeTool,
  activeWorkspaceName,
  activeWorkspacePath,
  activeWorkspaceSlug,
  artifactRefreshKey,
  descriptionDocumentExists,
  headerMode,
  hasDescriptionSession,
  onDescriptionSessionCreated,
  onPendingSessionCreateChange,
  onSetActiveToolNull,
  onSelectedArtifactClear,
  questionnaireDocumentExists,
  selectedArtifact,
  shouldShowQuestionnaireEditor,
  workflowStoreLoaded,
}) => {
  const sourceArtifact = resolveDiagramSourceArtifact({
    activeTool,
    workspacePath: activeWorkspacePath,
    workspaceSlug: activeWorkspaceSlug,
  });
  const descriptionArtifactAvailable = useDescriptionArtifactAvailability({
    enabled: activeTool === "Description" && descriptionDocumentExists,
    workspacePath: activeWorkspacePath,
    workspaceSlug: activeWorkspaceSlug,
  });
  const diagramModulesSourceAvailable = useDiagramModulesArtifactAvailability({
    enabled: headerMode === "source" && activeTool === "Diagram Modules",
    workspacePath: activeWorkspacePath,
    workspaceSlug: activeWorkspaceSlug,
  });
  const sourceArtifactAvailable =
    activeTool === "Diagram Modules"
      ? diagramModulesSourceAvailable
      : false;
  const helpMode = headerMode === "help";
  const showSourceViewer =
    headerMode === "source" && sourceArtifact !== null;
  const showArtifactViewer =
    selectedArtifact !== null &&
    !shouldShowQuestionnaireEditor &&
    headerMode === "artifacts" &&
    !isDiagramTool(activeTool);
  const showDescriptionQuestionnaire =
    activeTool === "Description" &&
    headerMode === "artifacts" &&
    !showArtifactViewer &&
    !showSourceViewer &&
    workflowStoreLoaded &&
    (shouldShowQuestionnaireEditor || (!descriptionDocumentExists && !questionnaireDocumentExists));

  if (helpMode) {
    if (activeTool === "Description") {
      return <DescriptionStepHelp />;
    }
    if (activeTool === VIRTUAL_SIMULATION_TOOL_LABEL) {
      return <VirtualSimulationHelp />;
    }
    if (activeTool === "Diagram Modules") {
      return <DiagramModulesHelp />;
    }
    if (activeTool === APPLICATION_FOUNDATION_ENVELOPE_TOOL_LABEL) {
      return <ApplicationFoundationEnvelopeHelp />;
    }
  }
  if (showSourceViewer && sourceArtifact) {
    if (!sourceArtifactAvailable) {
      return (
        <div className="pm-placeholder">
          {resolveDiagramSourcePendingMessage(activeTool)}
        </div>
      );
    }
    return (
      <WorkflowArtifactViewer
        description="Source shows the canonical Markdown artifact used by runtime and agents. Layout sidecars stay hidden from the user-facing surface."
        label={sourceArtifact.label}
        onClose={onSelectedArtifactClear}
        path={sourceArtifact.path}
        refreshKey={artifactRefreshKey}
        workspacePath={sourceArtifact.workspacePath}
        workspaceSlug={sourceArtifact.workspaceSlug}
      />
    );
  }
  if (showArtifactViewer && selectedArtifact) {
    const isDescriptionArtifact = selectedArtifact.label === "Final_Description.md";
    if (isDescriptionArtifact && !descriptionArtifactAvailable) {
      return (
        <div className="pm-placeholder">
          Description artifact is not available yet. The session may still be generating.
        </div>
      );
    }
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
        onDescriptionSessionCreatePendingChange={onPendingSessionCreateChange}
        onDescriptionSessionCreated={onDescriptionSessionCreated}
        workspaceName={activeWorkspaceName}
        workspacePath={activeWorkspacePath}
        workspaceSlug={activeWorkspaceSlug ?? undefined}
      />
    );
  }
  if (activeTool === VIRTUAL_SIMULATION_TOOL_LABEL) {
    return renderStagePanel(
      VirtualSimulationPanel,
      activeWorkspacePath,
      activeWorkspaceSlug
    );
  }
  if (activeTool === "Diagram Modules") {
    return renderStagePanel(
      DiagramModulesPanel,
      activeWorkspacePath,
      activeWorkspaceSlug,
      artifactRefreshKey
    );
  }
  if (activeTool === APPLICATION_FOUNDATION_ENVELOPE_TOOL_LABEL) {
    return renderStagePanel(
      ApplicationFoundationEnvelopePanel,
      activeWorkspacePath,
      activeWorkspaceSlug
    );
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
    <DescriptionStepHelp />
  ) : (
    <ProjectManagerSessionView
      pendingSessionCreate={pendingSessionCreate}
      preferredSessionId={preferredSessionId}
      workspacePath={workspacePath}
    />
  );
