import { memo, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { DescriptionQuestionnairePanel } from "../description/description-questionnaire-panel";
import { DescriptionStepHelp } from "../description/description-step-help";
import { ProjectManagerSessionView } from "../sessions/project-manager-session-view";
import { api } from "../../api";
import {
  LocalizationProvider,
  useLocalization,
  useResolvedLocalization,
} from "../../../ui/src/app-host/use-localization";
import SettingsView from "../../../ui/src/components/settings-view";
import {
  hasExistingStageSession,
  resolveStageSessionIntent,
  StageConfirmationCard,
  type StageSessionIntent,
} from "../shared/stage-confirmation-card";
import { DevelopmentTreeNodeStartCard } from "./development-tree-node-start-card";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import { useProjectManagerSettingsState } from "../settings/use-project-manager-settings-state";
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
  resolveConfirmableStageFromTool,
  resolveStartupStageFromTool,
  resolveWorkflowToolHeaderTitle,
} from "./workflow-stage-tool-routing";
import { VIRTUAL_SIMULATION_TOOL_LABEL } from "./use-workflow-tool-select";
import {
  renderWorkflowStageHelp,
  renderWorkflowStagePanel,
} from "./workflow-stage-panel-registry";

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
      "Please wait. The translated interface bundles affected by the latest save are still being prepared, so Project Manager remains blocked."}
  </div>
);

const isTechnicalStageRewriteBoundaryActive = (
  snapshot: WorkflowStateSnapshot | null
): boolean => snapshot?.managedWorkflowPreview?.active === true;

const isReadOnlyUpstreamTool = (activeTool: string | null): boolean =>
  activeTool === "Description" || activeTool === VIRTUAL_SIMULATION_TOOL_LABEL;

interface SelectedArtifact {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
  readonly label: string;
}

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
  readonly onSettingsClose: () => void;
  readonly onSetActiveToolNull: () => void;
  readonly onSelectedArtifactClear: () => void;
  readonly questionnaireDocumentExists: boolean;
  readonly settingsOpen: boolean;
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
  onSettingsClose,
  onSetActiveToolNull,
  onSelectedArtifactClear,
  questionnaireDocumentExists,
  settingsOpen,
  selectedArtifact,
  selectedBranchNode,
  shouldShowQuestionnaireEditor,
  workflowStoreLoaded,
}) => {
  const localizationSyncStatus = useLocalizationSyncStatus();
  const settingsState = useProjectManagerSettingsState({
    activeWorkspaceName,
    activeWorkspacePath,
    activeWorkspaceSlug,
  });
  const settingsLocalization = useResolvedLocalization(
    settingsState.settings,
    settingsState.localizationRuntime
  );
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
  const branchArtifacts = selectedBranchNode?.artifacts ?? [];
  const branchKey = selectedBranchNode
    ? `${selectedBranchNode.kind}:${selectedBranchNode.partId}:${selectedBranchNode.clusterId ?? ""}:${selectedBranchNode.nodeId}`
    : null;
  const [selectedBranchArtifactPath, setSelectedBranchArtifactPath] =
    useState<string | null>(null);
  useEffect(() => {
    setSelectedBranchArtifactPath(branchArtifacts[0]?.path ?? null);
  }, [branchKey]);
  const selectedBranchArtifact =
    branchArtifacts.find((item) => item.path === selectedBranchArtifactPath) ??
    branchArtifacts[0] ??
    null;
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
    (shouldShowQuestionnaireEditor ||
      (!descriptionDocumentExists && !questionnaireDocumentExists));

  if (settingsOpen) {
    return (
      <LocalizationProvider value={settingsLocalization}>
        <SettingsView
          mode="project-manager"
          onClose={onSettingsClose}
          state={settingsState}
        />
      </LocalizationProvider>
    );
  }

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
    if (!selectedBranchArtifact) {
      return (
        <div className="pm-placeholder">
          <strong>{kindLabel}: {selectedBranchNode.label}</strong>
          <br />
          Draft artifacts are not available for this node yet.
        </div>
      );
    }
    return (
      <div className="pm-details">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {branchArtifacts.map((artifact) => (
            <button
              key={artifact.path}
              onClick={() => setSelectedBranchArtifactPath(artifact.path)}
              type="button"
            >
              {artifact.fileName}
            </button>
          ))}
        </div>
        <WorkflowArtifactViewer
          description={`${kindLabel}: ${selectedBranchNode.label}`}
          label={selectedBranchArtifact.fileName}
          onClose={onSelectedArtifactClear}
          path={selectedBranchArtifact.path}
          refreshKey={artifactRefreshKey}
          workspacePath={activeWorkspacePath ?? ""}
          workspaceSlug={activeWorkspaceSlug ?? ""}
        />
      </div>
    );
  }
  if (helpMode) {
    if (activeTool === "Description") {
      return <DescriptionStepHelp />;
    }
    const stageHelp = renderWorkflowStageHelp(activeTool);
    if (stageHelp) return stageHelp;
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
  const stagePanel = renderWorkflowStagePanel({
    activeTool,
    refreshKey: artifactRefreshKey,
    workspacePath: activeWorkspacePath,
    workspaceSlug: activeWorkspaceSlug,
  });
  if (stagePanel) return stagePanel;
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

interface SessionContentProps {
  readonly activeTool: string | null;
  readonly onStepStarted: (sessionId: string, intent: StageSessionIntent) => void;
  readonly pendingSessionCreate: { readonly providerTitle: string } | null;
  readonly preferredSessionId: string | null;
  readonly selectedBranchNode: BranchNodeSelection | null;
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
  selectedBranchNode,
  showDescriptionHelp,
  stepStartedIntent,
  workflowSnapshot,
  workspacePath,
  workspaceSlug,
}) => {
  const { t } = useLocalization();
  const localizationSyncStatus = useLocalizationSyncStatus();
  const stageId = resolveStartupStageFromTool(activeTool);
  const confirmableStage = resolveConfirmableStageFromTool(activeTool);
  const sessionStartupStage = selectedBranchNode?.workflowPath ?? stageId;
  const nextIntent =
    selectedBranchNode
      ? selectedBranchNode.session && workspacePath && workspaceSlug
        ? {
            providerId: selectedBranchNode.session.providerId,
            providerSessionId: selectedBranchNode.session.providerSessionId,
            targetDialogId: selectedBranchNode.session.dialogId,
            targetRootSessionId: selectedBranchNode.session.rootSessionId,
            targetSessionId: selectedBranchNode.session.sessionId,
            workspacePath,
            workspaceSlug,
            initiativeSlug: workspaceSlug,
            stage: selectedBranchNode.workflowPath ?? "diagram_modules",
            sessionKind: "collector" as const,
            runSlug: null,
          }
        : null
      : workflowSnapshot && workspacePath && workspaceSlug
        ? resolveStageSessionIntent(
            stageId,
            workflowSnapshot,
            workspacePath,
            workspaceSlug
          )
      : null;
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
  const sessionInitialDialogIntent = selectedBranchNode
    ? initialIntent
    : stepStartedIntent ?? initialIntent;

  if (localizationSyncStatus.busy) {
    return renderLocalizationSyncBlockedState(localizationSyncStatus.message);
  }

  if (showDescriptionHelp) {
    return <DescriptionStepHelp />;
  }

  if (selectedBranchNode && !selectedBranchNode.session && selectedBranchNode.workflowPath && workspacePath && workspaceSlug) {
    return (
      <DevelopmentTreeNodeStartCard
        kind={selectedBranchNode.kind}
        label={selectedBranchNode.label}
        nodeId={selectedBranchNode.nodeId}
        workflowPath={selectedBranchNode.workflowPath}
        workspacePath={workspacePath}
        workspaceSlug={workspaceSlug}
      />
    );
  }

  if (
    isReadOnlyUpstreamTool(activeTool) &&
    isTechnicalStageRewriteBoundaryActive(workflowSnapshot)
  ) {
    const stageTitle =
      resolveWorkflowToolHeaderTitle(activeTool) ?? activeTool ?? "Workflow stage";
    return (
      <div className="pm-placeholder">
        <strong>
          {t(
            "ui_interface",
            "pm.workflow.upstream_readonly.title",
            "{stage} is read-only.",
            { stage: stageTitle }
          )}
        </strong>
        <br />
        {t(
          "ui_interface",
          "pm.workflow.upstream_readonly.body",
          "Managed Workflow Orchestration preview is active for technical stages. Existing upstream artifacts remain available from the tree while step execution is routed through the new Core boundary."
        )}
      </div>
    );
  }

  // Show confirmation card for idle VS/DM stages without an existing session,
  // UNLESS the step was just started (stepStartedIntent is set)
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

  return (
    <ProjectManagerSessionView
      initialDialogIntent={sessionInitialDialogIntent}
      pendingSessionCreate={pendingSessionCreate}
      preferredSessionId={preferredSessionId}
      startupStage={sessionStartupStage}
      workspacePath={workspacePath}
    />
  );
};
