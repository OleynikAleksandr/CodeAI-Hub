import { useRef, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";
import type { FlowStageId } from "../components/flow-wizard";
import { ProviderPicker, type ProviderPickerState } from "../provider-picker";
import type { SessionSnapshots } from "../session/helpers";
import SessionView from "../session/session-view";
import { FlowWizardPicker } from "./flow-wizard-picker";
import { IdeaQuestionnairePanel } from "./idea-questionnaire-panel";
import type { ProviderLabels } from "./provider-picker-state";

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
  const [questionnaireActive, setQuestionnaireActive] = useState(false);
  const activeSessionId = sessionViewProps.activeSessionId;
  const handleProviderConfirm = (providerIds: readonly ProviderStackId[]) => {
    if (selectedStage === "idea") {
      pendingQuestionnaireRef.current = true;
    }
    confirmSelection(providerIds);
  };
  const handleStageClick = (stage: FlowStageId) => selectStage(stage);
  const showSessionView = !(pickerState.visible || questionnaireActive);
  const filteredProviders =
    selectedStage && selectedStage !== "chat"
      ? pickerState.providers.filter(
          (provider) =>
            provider.id === "codexCli" || provider.id === "claudeCodeCli"
        )
      : pickerState.providers;
  const showStagePicker = pickerState.visible && selectedStage === null;
  const showProviderPicker = pickerState.visible && selectedStage !== null;
  const providerPickerSecondaryLabel = stageSelectionLocked ? "Cancel" : "Back";
  const handleProviderPickerSecondary = stageSelectionLocked
    ? cancelSelection
    : clearStageSelection;
  return (
    <div className="app-shell__session-region">
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
