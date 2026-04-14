import { memo, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { DescriptionQuestionnairePanel } from "../description/description-questionnaire-panel";
import { DescriptionStepHelp } from "../description/description-step-help";
import { DiagramModulesHelp } from "../diagram-modules/diagram-modules-help";
import { DiagramModulesPanel } from "../diagram-modules/diagram-modules-panel";
import { ProjectManagerSessionView } from "../sessions/project-manager-session-view";
import { api } from "../../api";
import {
  hasExistingStageSession,
  resolveStageSessionIntent,
  StageConfirmationCard,
  type StageSessionIntent,
} from "../shared/stage-confirmation-card";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
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
import type { BranchNodeSelection } from "./main-area-utils";
import {
  VIRTUAL_SIMULATION_TOOL_LABEL,
} from "./use-workflow-tool-select";

type LocalizationSyncStatus = {
  readonly busy: boolean;
  readonly message: string | null;
};

const isLocalizationSyncStatusPayload = (
  payload: unknown
): payload is LocalizationSyncStatus => {
  if (!(payload && typeof payload === "object" && "busy" in payload)) {
    return false;
  }

  return (
    typeof payload.busy === "boolean" &&
    (!("message" in payload) ||
      payload.message === null ||
      typeof payload.message === "string")
  );
};

const useLocalizationSyncStatus = (): LocalizationSyncStatus => {
  const [status, setStatus] = useState<LocalizationSyncStatus>(
    () => api.getLocalizationSyncStatus()
  );

  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message) => {
      if (
        message.type !== "settings:localization-sync-status" ||
        !isLocalizationSyncStatusPayload(message.payload)
      ) {
        return;
      }
      setStatus(message.payload);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
};

const renderLocalizationSyncBlockedState = (
  message: string | null
): React.ReactNode => (
  <div className="pm-placeholder">
    <strong>Localization sync in progress.</strong>
    <br />
    {message ??
      "Please wait. Translated interface bundles are still being prepared, so Project Manager remains blocked."}
  </div>
);

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
  readonly selectedBranchNode: BranchNodeSelection | null;
  readonly shouldShowQuestionnaireEditor: boolean;
  readonly workflowStoreLoaded: boolean;
}

export const MainAreaArtifactContent: React.FC<ArtifactContentProps> = memo(({
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
  selectedBranchNode,
  shouldShowQuestionnaireEditor,
  workflowStoreLoaded,
}) => {
  const localizationSyncStatus = useLocalizationSyncStatus();

  if (localizationSyncStatus.busy) {
    return renderLocalizationSyncBlockedState(localizationSyncStatus.message);
  }

  if (selectedBranchNode) {
    const kindLabel =
      selectedBranchNode.kind === "product-part"
        ? "Product Part"
        : selectedBranchNode.kind === "cluster"
          ? "Cluster"
          : "Module";
    return (
      <div className="pm-placeholder">
        <strong>{kindLabel}: {selectedBranchNode.label}</strong>
        <br />
        Branch artifact surface will be available after the first Design session.
      </div>
    );
  }
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
  if (activeTool === "Description" && hasDescriptionSession && selectedArtifact === null) {
    return <div className="pm-placeholder">Выберите артефакт Description в дереве workflow.</div>;
  }
  return (
    <div className="pm-placeholder">
      Select a workflow stage in the sidebar tree. For Description, start with{" "}
      <code>questionnaire.md</code> and complete a single session to produce{" "}
      <code>Final_Description.md</code>.
    </div>
  );
});

type ConfirmableStageId = "virtual_simulation" | "diagram_modules";

const TOOL_TO_CONFIRMABLE_STAGE: Record<string, ConfirmableStageId> = {
  [VIRTUAL_SIMULATION_TOOL_LABEL]: "virtual_simulation",
  "Diagram Modules": "diagram_modules",
};

const resolveStartupStageFromTool = (tool: string | null): string => {
  if (!tool) return "description";
  if (tool === VIRTUAL_SIMULATION_TOOL_LABEL) return "virtual_simulation";
  if (tool === "Diagram Modules") return "diagram_modules";
  return "description";
};

interface SessionContentProps {
  readonly activeTool: string | null;
  readonly onStepStarted: (sessionId: string, intent: StageSessionIntent) => void;
  readonly pendingSessionCreate: { readonly providerTitle: string } | null;
  readonly preferredSessionId: string | null;
  readonly showDescriptionHelp: boolean;
  readonly stepStartedIntent: StageSessionIntent | null;
  readonly workflowSnapshot: WorkflowStateSnapshot | null;
  readonly workspacePath: string | undefined;
  readonly workspaceSlug: string | null;
}

export const MainAreaSessionContent: React.FC<SessionContentProps> = ({
  activeTool,
  onStepStarted,
  pendingSessionCreate,
  preferredSessionId,
  showDescriptionHelp,
  stepStartedIntent,
  workflowSnapshot,
  workspacePath,
  workspaceSlug,
}) => {
  const localizationSyncStatus = useLocalizationSyncStatus();

  if (localizationSyncStatus.busy) {
    return renderLocalizationSyncBlockedState(localizationSyncStatus.message);
  }

  if (showDescriptionHelp) {
    return <DescriptionStepHelp />;
  }

  // Show confirmation card for idle VS/DM stages without an existing session,
  // UNLESS the step was just started (stepStartedIntent is set)
  const confirmableStage = activeTool
    ? TOOL_TO_CONFIRMABLE_STAGE[activeTool]
    : undefined;
  if (
    !stepStartedIntent &&
    confirmableStage &&
    workflowSnapshot &&
    workspaceSlug &&
    workspacePath &&
    !hasExistingStageSession(confirmableStage, workflowSnapshot)
  ) {
    return (
      <StageConfirmationCard
        onStarted={onStepStarted}
        stage={confirmableStage}
        workflowSnapshot={workflowSnapshot}
        workspacePath={workspacePath}
        workspaceSlug={workspaceSlug}
      />
    );
  }

  const stageId = resolveStartupStageFromTool(activeTool);
  const nextIntent =
    workflowSnapshot && workspacePath && workspaceSlug
      ? resolveStageSessionIntent(stageId, workflowSnapshot, workspacePath, workspaceSlug)
      : null;
  // Stabilize intent identity — only create a new object when the
  // session actually changed, not on every workflow state poll cycle.
  const intentRef = useRef(nextIntent);
  const initialIntent = useMemo(() => {
    const prev = intentRef.current;
    if (
      prev?.providerId === nextIntent?.providerId &&
      prev?.providerSessionId === nextIntent?.providerSessionId &&
      prev?.stage === nextIntent?.stage
    ) {
      return prev;
    }
    intentRef.current = nextIntent;
    return nextIntent;
  }, [nextIntent]);

  return (
    <ProjectManagerSessionView
      initialDialogIntent={stepStartedIntent ?? initialIntent}
      pendingSessionCreate={pendingSessionCreate}
      preferredSessionId={preferredSessionId}
      startupStage={stageId}
      workspacePath={workspacePath}
    />
  );
};
