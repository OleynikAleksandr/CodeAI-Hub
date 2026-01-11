import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";
import { listRuns, type RunSummary } from "../api/orchestrator/runs-client";
import type { FlowStageId } from "../components/flow-wizard";
import { ProviderPicker, type ProviderPickerState } from "../provider-picker";
import { resolveCoreHttpUrl } from "../services/idea-collector-support";
import type { SessionSnapshots } from "../session/helpers";
import SessionView from "../session/session-view";
import { RunPickerView } from "./description-run-picker";
import { FlowWizardPicker } from "./flow-wizard-picker";
import { IdeaQuestionnairePanel } from "./idea-questionnaire-panel";
import type { ProviderLabels } from "./provider-picker-state";
import {
  inferProviderIdFromRunSlug,
  normalizeProviderId,
} from "./run-provider";
import {
  resolveSelectedInitiativeSlug,
  resolveWorkspacePath,
} from "./session-region-dom";

type SessionRegionProps = {
  readonly pickerState: ProviderPickerState;
  readonly selectedStage: FlowStageId | null;
  readonly stageSelectionLocked: boolean;
  readonly selectStage: (stage: FlowStageId) => void;
  readonly clearStageSelection: () => void;
  readonly confirmSelection: (providerIds: readonly ProviderStackId[]) => void;
  readonly cancelSelection: () => void;
  readonly sessionViewProps: {
    readonly activeSessionId: string | null;
    readonly coreConnectionDetail: string | undefined;
    readonly coreConnectionStatus: "connecting" | "ready" | "error";
    readonly onCloseSession: (sessionId: string) => void;
    readonly onSelectSession: (sessionId: string) => void;
    readonly onSendMessage: (sessionId: string, content: string) => void;
    readonly onToggleTodo: (sessionId: string, todoId: string) => void;
    readonly providerLabels: ProviderLabels;
    readonly sessions: readonly SessionRecord[];
    readonly snapshots: SessionSnapshots;
  };
};

type RunSelectionState =
  | { readonly status: "pending" }
  | { readonly status: "new" }
  | { readonly status: "existing"; readonly runSlug: string };

type PendingRunStart = {
  readonly runSlug: string;
  readonly providerId: ProviderStackId;
};

export const SessionRegion = ({
  pickerState,
  selectedStage,
  stageSelectionLocked,
  selectStage,
  clearStageSelection,
  confirmSelection,
  cancelSelection,
  sessionViewProps,
}: SessionRegionProps) => {
  const pendingQuestionnaireRef = useRef(false);
  const [pendingRunStart, setPendingRunStart] =
    useState<PendingRunStart | null>(null);
  const [selectedProviderSessionId, setSelectedProviderSessionId] = useState<
    string | null
  >(null);
  const [runSelection, setRunSelection] = useState<RunSelectionState>({
    status: "pending",
  });
  const [runPickerMode, setRunPickerMode] = useState<"choice" | "list">(
    "choice"
  );
  const [runPickerRuns, setRunPickerRuns] = useState<RunSummary[]>([]);
  const [runPickerStatus, setRunPickerStatus] = useState<string | null>(null);
  const [runPickerLoading, setRunPickerLoading] = useState(false);
  const [questionnaireActive, setQuestionnaireActive] = useState(false);
  const activeSessionId = sessionViewProps.activeSessionId;
  const handleProviderConfirm = (providerIds: readonly ProviderStackId[]) => {
    if (selectedStage === "idea") {
      pendingQuestionnaireRef.current = true;
    }
    confirmSelection(providerIds);
  };
  useEffect(() => {
    if (!pickerState.visible || selectedStage !== "idea") {
      setRunSelection({ status: "pending" });
      setPendingRunStart(null);
      setSelectedProviderSessionId(null);
      setRunPickerMode("choice");
      setRunPickerRuns([]);
      setRunPickerStatus(null);
      setRunPickerLoading(false);
    }
  }, [pickerState.visible, selectedStage]);
  const handleCreateNewDescription = useCallback(() => {
    setRunSelection({ status: "new" });
    setSelectedProviderSessionId(null);
  }, []);
  const handleSelectExistingRun = useCallback(
    (runSlug: string) => {
      const initiativeSlug = resolveSelectedInitiativeSlug();
      const existingSession = sessionViewProps.sessions.find(
        (session) =>
          session.runSlug === runSlug &&
          session.stage === "idea" &&
          session.initiativeSlug === initiativeSlug
      );
      if (existingSession) {
        sessionViewProps.onSelectSession(existingSession.id);
        cancelSelection();
        return;
      }

      const run = runPickerRuns.find((entry) => entry.runSlug === runSlug);
      const providerId =
        normalizeProviderId(run?.providerId) ??
        inferProviderIdFromRunSlug(runSlug) ??
        "codexCli";

      pendingQuestionnaireRef.current = true;
      setRunSelection({ status: "existing", runSlug });
      setSelectedProviderSessionId(run?.providerSessionId ?? null);
      setPendingRunStart({ runSlug, providerId });
    },
    [
      cancelSelection,
      runPickerRuns,
      sessionViewProps.onSelectSession,
      sessionViewProps.sessions,
    ]
  );

  useEffect(() => {
    if (!pendingRunStart) {
      return;
    }
    if (
      !pickerState.visible ||
      selectedStage !== "idea" ||
      runSelection.status !== "existing" ||
      runSelection.runSlug !== pendingRunStart.runSlug
    ) {
      return;
    }

    confirmSelection([pendingRunStart.providerId]);
    setPendingRunStart(null);
  }, [
    confirmSelection,
    pendingRunStart,
    pickerState.visible,
    runSelection,
    selectedStage,
  ]);
  useEffect(() => {
    if (
      !pickerState.visible ||
      selectedStage !== "idea" ||
      runSelection.status !== "pending" ||
      runPickerMode !== "list"
    ) {
      return;
    }
    const httpUrl = resolveCoreHttpUrl();
    const workspacePath = resolveWorkspacePath();
    const initiativeSlug = resolveSelectedInitiativeSlug();
    if (!(httpUrl && workspacePath && initiativeSlug)) {
      setRunPickerRuns([]);
      setRunPickerStatus("Select an initiative to continue.");
      setRunPickerLoading(false);
      return;
    }
    setRunPickerLoading(true);
    setRunPickerStatus("Loading description runs...");
    listRuns(httpUrl, workspacePath, initiativeSlug)
      .then((result) => {
        if (!result.ok) {
          setRunPickerRuns([]);
          setRunPickerStatus(result.error);
          setRunPickerLoading(false);
          return;
        }
        setRunPickerRuns([...result.data.runs]);
        setRunPickerStatus(
          result.data.runs.length === 0 ? "No description runs yet." : null
        );
        setRunPickerLoading(false);
      })
      .catch(() => {
        setRunPickerRuns([]);
        setRunPickerStatus("Failed to load description runs.");
        setRunPickerLoading(false);
      });
  }, [pickerState.visible, runPickerMode, runSelection.status, selectedStage]);
  const handleStageClick = (stage: FlowStageId) => selectStage(stage);
  const selectedRunSlug =
    runSelection.status === "existing" ? runSelection.runSlug : null;
  const showSessionView = !(pickerState.visible || questionnaireActive);
  const filteredProviders =
    selectedStage && selectedStage !== "chat"
      ? pickerState.providers.filter(
          (provider) =>
            provider.id === "codexCli" || provider.id === "claudeCodeCli"
        )
      : pickerState.providers;
  const showRunPicker =
    pickerState.visible &&
    selectedStage === "idea" &&
    runSelection.status === "pending";
  const showStagePicker = pickerState.visible && selectedStage === null;
  const showProviderPicker =
    pickerState.visible &&
    selectedStage !== null &&
    !showRunPicker &&
    runSelection.status !== "existing";
  const isRunPickerEmpty = !runPickerLoading && runPickerRuns.length === 0;
  const providerPickerSecondaryLabel = stageSelectionLocked ? "Cancel" : "Back";
  const handleProviderPickerSecondary = stageSelectionLocked
    ? cancelSelection
    : clearStageSelection;
  return (
    <div className="app-shell__session-region">
      <input
        id="runSlug"
        readOnly
        type="hidden"
        value={selectedRunSlug ?? ""}
      />
      <input
        id="providerSessionId"
        readOnly
        type="hidden"
        value={selectedProviderSessionId ?? ""}
      />
      <ProviderPicker
        onConfirm={handleProviderConfirm}
        onSecondary={handleProviderPickerSecondary}
        providers={filteredProviders}
        secondaryLabel={providerPickerSecondaryLabel}
        visible={showProviderPicker}
      />
      <FlowWizardPicker
        onCancel={cancelSelection}
        onStageClick={handleStageClick}
        providers={pickerState.providers}
        selectedStage={selectedStage}
        visible={showStagePicker}
      />
      <RunPickerView
        isEmpty={isRunPickerEmpty}
        mode={runPickerMode}
        onBack={() => setRunPickerMode("choice")}
        onCancel={cancelSelection}
        onCreateNew={handleCreateNewDescription}
        onSelectRun={handleSelectExistingRun}
        onShowList={() => setRunPickerMode("list")}
        runs={runPickerRuns}
        status={runPickerStatus}
        visible={showRunPicker}
      />
      <IdeaQuestionnairePanel
        activeSessionId={activeSessionId}
        onQuestionnaireVisibleChange={setQuestionnaireActive}
        pendingQuestionnaireRef={pendingQuestionnaireRef}
        pickerVisible={pickerState.visible}
        sessions={sessionViewProps.sessions}
      />
      {showSessionView ? (
        <SessionView
          activeSessionId={sessionViewProps.activeSessionId}
          coreConnectionDetail={sessionViewProps.coreConnectionDetail}
          coreConnectionStatus={sessionViewProps.coreConnectionStatus}
          onCloseSession={sessionViewProps.onCloseSession}
          onSelectSession={sessionViewProps.onSelectSession}
          onSendMessage={sessionViewProps.onSendMessage}
          onToggleTodo={sessionViewProps.onToggleTodo}
          providerLabels={sessionViewProps.providerLabels}
          sessions={sessionViewProps.sessions}
          showEmptyState
          snapshots={sessionViewProps.snapshots}
        />
      ) : null}
    </div>
  );
};
