import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import type { WorkspaceProject } from "../../types";
import { useDescriptionSessionGuard } from "./use-description-session-guard";
import { type WorkflowEvent, startWorkflowEventPolling } from "../../services/workflow-events-client";
import {
  type BranchNodeSelection,
  parseBranchNodeSelection,
  resolveToolByStage,
  resolveWorkspaceSlug,
  shouldRefreshArtifactForWorkflowEvents,
} from "./main-area-utils";
import { MainAreaArtifactContent, MainAreaSessionContent } from "./main-area-panel-content";
import {
  normalizeArtifactHeaderMode,
  resolveArtifactHeaderModes,
  type ArtifactHeaderMode,
} from "./stage-artifact-mode";
import { useMainAreaWorkflowState } from "./use-main-area-workflow-state";
import {
  type WorkflowStatePollingMode,
  useWorkflowStateSnapshot,
  workflowStateStore,
} from "../../services/workflow-state-store";
import { shouldRefreshWorkflowStateForCoreEvent } from "./workflow-state-refresh-events";
import { useDetachDiagramButton } from "./detach-diagram-button";
import { PanelContainer } from "./panel-container";
import { StageArtifactHeaderToggle } from "./stage-artifact-header-toggle";
import { resolveWorkflowToolHeaderTitle } from "./workflow-stage-tool-routing";

const resolveWorkflowPollingMode = (): WorkflowStatePollingMode => {
  if (typeof document === "undefined") {
    return "foreground";
  }
  if (document.visibilityState !== "visible") {
    return "hidden";
  }
  return document.hasFocus() ? "foreground" : "background";
};

const isDevelopmentTreeArtifactPath = (value: string | undefined): boolean =>
  Boolean(value?.includes("/development_tree/"));

const readCoreStageActivation = (message: {
  readonly payload?: unknown;
  readonly type?: string;
}): string | null => {
  if (message.type !== "workflow:stage:activate") {
    return null;
  }
  const { payload } = message;
  if (!payload || typeof payload !== "object" || !("stage" in payload)) {
    return null;
  }
  const stage = (payload as { readonly stage?: unknown }).stage;
  return typeof stage === "string" ? stage : null;
};

interface MainAreaProps {
  sizes: [number, number];
  onSizeChange: (index: 0, delta: number, containerWidth: number) => void;
  activeWorkspace?: WorkspaceProject;
}

export const MainArea: React.FC<MainAreaProps> = ({
  sizes,
  onSizeChange,
  activeWorkspace,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [preferredSessionId, setPreferredSessionId] = useState<string | null>(null);
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
    readonly label: "Final_Description.md";
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
  const [selectedBranchNode, setSelectedBranchNode] =
    useState<BranchNodeSelection | null>(null);
  const [artifactHeaderMode, setArtifactHeaderMode] =
    useState<ArtifactHeaderMode>("artifacts");
  const [workflowPollingMode, setWorkflowPollingMode] =
    useState<WorkflowStatePollingMode>(() => resolveWorkflowPollingMode());
  const selectedArtifactRef = useRef<typeof selectedArtifact>(null);
  const selectedBranchNodeRef = useRef<BranchNodeSelection | null>(null);
  const lastDevelopmentTreeRefreshRef = useRef<string | null>(null);
  const activeWorkspaceSlug = activeWorkspace ? resolveWorkspaceSlug(activeWorkspace) : null;
  const activeWorkspaceSlugRef = useRef<string | null>(activeWorkspaceSlug);
  const { guardRef: descriptionGuardRef, activateGuard, resetGuard } =
    useDescriptionSessionGuard(hasDescriptionSession);

  useEffect(() => {
    selectedArtifactRef.current = selectedArtifact;
  }, [selectedArtifact]);

  useEffect(() => {
    selectedBranchNodeRef.current = selectedBranchNode;
  }, [selectedBranchNode]);

  useEffect(() => {
    activeWorkspaceSlugRef.current = activeWorkspaceSlug;
  }, [activeWorkspaceSlug]);

  useEffect(() => {
    const syncWorkflowPollingMode = () => {
      setWorkflowPollingMode(resolveWorkflowPollingMode());
    };
    syncWorkflowPollingMode();
    window.addEventListener("focus", syncWorkflowPollingMode);
    window.addEventListener("blur", syncWorkflowPollingMode);
    document.addEventListener("visibilitychange", syncWorkflowPollingMode);
    return () => {
      window.removeEventListener("focus", syncWorkflowPollingMode);
      window.removeEventListener("blur", syncWorkflowPollingMode);
      document.removeEventListener("visibilitychange", syncWorkflowPollingMode);
    };
  }, []);

  useEffect(() => {
    workflowStateStore.setVisibilityMode(workflowPollingMode);
  }, [workflowPollingMode]);

  useEffect(
    () =>
      api.onCoreEvent((message) => {
        if (shouldRefreshWorkflowStateForCoreEvent(message)) {
          workflowStateStore.requestImmediatePoll();
        }
        const stage = readCoreStageActivation(message);
        if (!stage) {
          return;
        }
        workflowStateStore.requestImmediatePoll();
        window.dispatchEvent(
          new CustomEvent("pm:stage:activated", {
            detail: { source: "core-workflow-stage-activate", stage },
          })
        );
      }),
    []
  );

  useEffect(() => {
    const onSelected = (event: Event) => {
      const custom = event as CustomEvent<{
        readonly workspacePath: string;
        readonly workspaceSlug: string;
        readonly path: string;
        readonly label: string;
      }>;
      setSelectedArtifact(custom.detail);
    };
    const onCleared = (event: Event) => {
      const custom = event as CustomEvent<{ readonly activeTool: string }>;
      setSelectedArtifact(null);
      setActiveTool(custom.detail.activeTool);
    };
    const onStageActivated = (event: Event) => {
      const stage = (event as CustomEvent<{ readonly stage?: string }>).detail?.stage;
      if (typeof stage !== "string") {
        return;
      }
      const nextTool = resolveToolByStage(stage);
      if (nextTool) {
        setActiveTool(nextTool);
        setSelectedBranchNode(null);
        setArtifactHeaderMode("artifacts");
      }
    };
    const onBranchSelected = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const parsed = parseBranchNodeSelection(detail);
      if (parsed) {
        setActiveTool("Diagram Modules");
        setSelectedArtifact(null);
        setSelectedBranchNode(parsed);
        setSettingsOpen(false);
        setArtifactHeaderMode("artifacts");
      }
    };
    const onSettingsOpen = () => {
      setSettingsOpen(true);
    };
    window.addEventListener("pm:artifact:selected", onSelected);
    window.addEventListener("pm:artifact:cleared", onCleared);
    window.addEventListener("pm:stage:activated", onStageActivated);
    window.addEventListener("pm:branch:selected", onBranchSelected);
    window.addEventListener("pm:settings:open", onSettingsOpen);
    return () => {
      window.removeEventListener("pm:artifact:selected", onSelected);
      window.removeEventListener("pm:artifact:cleared", onCleared);
      window.removeEventListener("pm:stage:activated", onStageActivated);
      window.removeEventListener("pm:branch:selected", onBranchSelected);
      window.removeEventListener("pm:settings:open", onSettingsOpen);
    };
  }, []);

  useEffect(() => {
    setPreferredSessionId(null);
    setSelectedArtifact(null);
    setDescriptionDocument(null);
    setQuestionnaireDocument(null);
    // hasDescriptionSession: owned by useMainAreaWorkflowState after store poll
    setPendingSessionCreate(null);
    setSelectedBranchNode(null);
    setSettingsOpen(false);
    setArtifactHeaderMode("artifacts");
    resetGuard();
    if (!activeWorkspace) {
      setActiveTool(null);
    }
    // Startup tool is resolved by useMainAreaWorkflowState after store
    // load and reinforced by the sidebar auto-select event.
  }, [activeWorkspace?.id]);

  useEffect(() => {
    setArtifactHeaderMode((current) => normalizeArtifactHeaderMode(activeTool, current));
  }, [activeTool]);

  const handleWorkflowEvents = useCallback(
    (events: readonly WorkflowEvent[]) => {
      if (events.length > 0) {
        setPreferredSessionId((current) => current ?? null);
      }
      const needsRefresh = shouldRefreshArtifactForWorkflowEvents(
        events,
        selectedArtifactRef.current,
        activeWorkspaceSlugRef.current,
        selectedBranchNodeRef.current
      );
      if (needsRefresh) {
        setArtifactRefreshKey((current) => current + 1);
      }
    },
    []
  );

  const handleDescriptionSessionCreated = useCallback((sessionId: string) => {
    setPreferredSessionId(sessionId);
    setHasDescriptionSession(true);
    activateGuard(sessionId);
  }, [activateGuard]);

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
      getForegroundIntervalMs: () =>
        selectedArtifactRef.current || selectedBranchNodeRef.current
          ? 2_000
          : 10_000,
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
  ]);

  useMainAreaWorkflowState({
    activeWorkspace,
    activeTool,
    setActiveTool,
    setDescriptionDocument,
    setQuestionnaireDocument,
    setHasDescriptionSession,
    descriptionGuardRef,
  });

  useEffect(() => {
    const autoDocument = descriptionDocument ?? questionnaireDocument;
    if (!autoDocument || activeTool !== "Description") return;

    const shouldAutoReplace =
      selectedArtifact === null ||
      (selectedArtifact.workspaceSlug === autoDocument.workspaceSlug &&
        (selectedArtifact.label === "Final_Description.md" ||
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

  const { loaded: workflowStoreLoaded, snapshot: workflowSnapshot } = useWorkflowStateSnapshot();

  useEffect(() => {
    const snapshotUpdatedAt = workflowSnapshot?.updatedAt ?? null;
    if (!snapshotUpdatedAt) {
      return;
    }
    const shouldRefreshDevelopmentTreeArtifact =
      selectedBranchNode !== null ||
      isDevelopmentTreeArtifactPath(selectedArtifact?.path);
    if (!shouldRefreshDevelopmentTreeArtifact) {
      lastDevelopmentTreeRefreshRef.current = snapshotUpdatedAt;
      return;
    }
    if (lastDevelopmentTreeRefreshRef.current === snapshotUpdatedAt) {
      return;
    }
    lastDevelopmentTreeRefreshRef.current = snapshotUpdatedAt;
    setArtifactRefreshKey((current) => current + 1);
  }, [selectedArtifact?.path, selectedBranchNode, workflowSnapshot?.updatedAt]);

  const [stepStartedIntent, setStepStartedIntent] = useState<{
    readonly providerId: string;
    readonly providerSessionId: string | null;
    readonly workspacePath: string;
    readonly workspaceSlug: string;
    readonly initiativeSlug: string | null;
    readonly stage: string | null;
    readonly sessionKind: "collector" | null;
    readonly runSlug: string | null;
  } | null>(null);

  const handleStepStarted = useCallback(
    (sessionId: string, intent: NonNullable<typeof stepStartedIntent>) => {
      setPreferredSessionId(sessionId);
      setStepStartedIntent(intent);
    },
    []
  );

  // Reset started intent when stage changes
  useEffect(() => {
    setStepStartedIntent(null);
  }, [activeTool]);
  const isDescriptionActive = activeTool === "Description";
  const shouldShowQuestionnaireEditor = Boolean(
    isDescriptionActive &&
      selectedArtifact?.label === "questionnaire.md" &&
      selectedArtifact.workspaceSlug === activeWorkspaceSlug &&
      !hasDescriptionSession
  );
  const hasDescriptionSessionPending = pendingSessionCreate !== null;
  const showDescriptionHelpInSessionPanel =
    isDescriptionActive &&
    !hasDescriptionSession &&
    !hasDescriptionSessionPending &&
    workflowStoreLoaded;
  const artifactHeaderModes = resolveArtifactHeaderModes(activeTool);
  const artifactHeaderTitle = settingsOpen
    ? "Settings"
    : selectedBranchNode
      ? selectedBranchNode.label
      : resolveWorkflowToolHeaderTitle(activeTool);
  const detachButton = useDetachDiagramButton(activeTool, activeWorkspace?.path, activeWorkspaceSlug);
  const handleSelectedArtifactClear = useCallback(() => setSelectedArtifact(null), []);
  const handleSetActiveToolNull = useCallback(() => setActiveTool(null), []);
  const handleSettingsClose = useCallback(() => setSettingsOpen(false), []);
  const descriptionDocumentExists = descriptionDocument !== null;
  const questionnaireDocumentExists = questionnaireDocument !== null;

  const memoizedArtifactContent = useMemo(
    () => (
      <MainAreaArtifactContent
        activeTool={activeTool}
        activeWorkspaceName={activeWorkspace?.name}
        activeWorkspacePath={activeWorkspace?.path}
        activeWorkspaceSlug={activeWorkspaceSlug}
        artifactRefreshKey={artifactRefreshKey}
        descriptionDocumentExists={descriptionDocumentExists}
        headerMode={artifactHeaderMode}
        hasDescriptionSession={hasDescriptionSession}
        onDescriptionSessionCreated={handleDescriptionSessionCreated}
        onPendingSessionCreateChange={setPendingSessionCreate}
        onSettingsClose={handleSettingsClose}
        onSelectedArtifactClear={handleSelectedArtifactClear}
        onSetActiveToolNull={handleSetActiveToolNull}
        questionnaireDocumentExists={questionnaireDocumentExists}
        settingsOpen={settingsOpen}
        selectedArtifact={selectedArtifact}
        selectedBranchNode={selectedBranchNode}
        shouldShowQuestionnaireEditor={shouldShowQuestionnaireEditor}
        workflowStoreLoaded={workflowStoreLoaded}
      />
    ),
    [
      activeTool, activeWorkspace?.name, activeWorkspace?.path,
      activeWorkspaceSlug, artifactRefreshKey, descriptionDocumentExists,
      artifactHeaderMode, hasDescriptionSession, handleDescriptionSessionCreated,
      setPendingSessionCreate, handleSelectedArtifactClear, handleSetActiveToolNull,
      handleSettingsClose, questionnaireDocumentExists, selectedArtifact,
      selectedBranchNode, settingsOpen, shouldShowQuestionnaireEditor,
      workflowStoreLoaded,
    ]
  );

  return (
    <main className="pm-main-area">
      <PanelContainer
        artifactContent={memoizedArtifactContent}
        artifactHeaderContent={
          artifactHeaderTitle ? (
            settingsOpen ? (
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: 8,
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <span>{artifactHeaderTitle}</span>
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.3)",
                    fontSize: 11,
                  }}
                >
                  Project-wide configuration
                </span>
              </div>
            ) : (
              <StageArtifactHeaderToggle
                availableModes={artifactHeaderModes}
                extraActions={detachButton}
                hint={activeTool === "Diagram Modules" ? "Zoom: ⌘/Ctrl+scroll · Reset: ⌘/Ctrl+0" : undefined}
                mode={artifactHeaderMode}
                onModeChange={setArtifactHeaderMode}
                title={artifactHeaderTitle}
              />
            )
          ) : undefined
        }
        onSizeChange={onSizeChange}
        sessionContent={
          <MainAreaSessionContent
            activeTool={activeTool}
            onStepStarted={handleStepStarted}
            pendingSessionCreate={pendingSessionCreate}
            preferredSessionId={
              selectedBranchNode?.session?.sessionId ?? preferredSessionId
            }
            selectedBranchNode={selectedBranchNode}
            showDescriptionHelp={showDescriptionHelpInSessionPanel}
            stepStartedIntent={stepStartedIntent}
            workflowSnapshot={workflowSnapshot}
            workspacePath={activeWorkspace?.path}
            workspaceSlug={activeWorkspaceSlug}
          />
        }
        sizes={sizes}
      />
    </main>
  );
};
