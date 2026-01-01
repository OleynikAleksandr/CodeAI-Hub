import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";
import { type FlowStageId, FlowWizard } from "../components/flow-wizard";
import { ProviderPicker, type ProviderPickerState } from "../provider-picker";
import type { SessionSnapshots } from "../session/helpers";
import SessionView from "../session/session-view";
import type { ProviderLabels } from "./provider-picker-state";

type SessionRegionProps = {
  readonly pickerState: ProviderPickerState;
  readonly flowWizardVisible: boolean;
  readonly flowWizardProviderId: ProviderStackId | null;
  readonly openFlowWizard: (providerId: ProviderStackId) => void;
  readonly closeFlowWizard: () => void;
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
  flowWizardVisible,
  flowWizardProviderId,
  openFlowWizard,
  closeFlowWizard,
  confirmSelection,
  cancelSelection,
  sessionViewProps,
}: SessionRegionProps) => {
  const handleProviderConfirm = (providerIds: readonly ProviderStackId[]) => {
    const selectedProvider = providerIds[0];
    if (
      selectedProvider === "codexCli" ||
      selectedProvider === "claudeCodeCli"
    ) {
      openFlowWizard(selectedProvider);
      return;
    }
    confirmSelection(providerIds);
  };

  const handleFlowStageClick = (stage: FlowStageId) => {
    if (stage !== "idea") {
      return;
    }
    if (!flowWizardProviderId) {
      return;
    }
    confirmSelection([flowWizardProviderId]);
  };

  const showSessionView = !(pickerState.visible || flowWizardVisible);

  return (
    <div className="app-shell__session-region">
      <ProviderPicker
        onCancel={cancelSelection}
        onConfirm={handleProviderConfirm}
        providers={pickerState.providers}
        visible={pickerState.visible}
      />
      {flowWizardVisible ? (
        <div className="provider-picker">
          <FlowWizard activeStage="idea" onStageClick={handleFlowStageClick} />
          <div className="provider-picker__actions">
            <output aria-live="polite" className="provider-picker__status">
              {flowWizardProviderId === "codexCli" ||
              flowWizardProviderId === "claudeCodeCli"
                ? "Click Idea to start."
                : "Select a stage to continue."}
            </output>
            <div className="provider-picker__action-buttons">
              <button
                className="provider-picker__secondary"
                onClick={closeFlowWizard}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
