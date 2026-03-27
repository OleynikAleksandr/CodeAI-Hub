import type { ProviderStackDescriptor } from "../../../../types/provider";
import { type FlowStageId, FlowWizard } from "../components/flow-wizard";

interface FlowWizardPickerProps {
  readonly onCancel: () => void;
  readonly onStageClick: (stage: FlowStageId) => void;
  readonly providers: readonly ProviderStackDescriptor[];
  readonly selectedStage: FlowStageId | null;
  readonly visible: boolean;
}

export const FlowWizardPicker = ({
  providers,
  selectedStage,
  onCancel,
  onStageClick,
  visible,
}: FlowWizardPickerProps) => {
  if (!visible) {
    return null;
  }

  const flowProviderAvailable = providers.some(
    (provider) => provider.id === "codexCli" || provider.id === "claudeCodeCli"
  );
  const disabledStages = flowProviderAvailable
    ? undefined
    : new Set<FlowStageId>(["idea", "spec", "plan", "execute"]);
  const statusMessage = flowProviderAvailable
    ? "Select a start mode to continue."
    : "Only Simple Chat is available (connect Codex or Claude for Flow steps).";

  return (
    <div className="provider-picker">
      <FlowWizard
        activeStage={selectedStage}
        disabledStages={disabledStages}
        onStageClick={onStageClick}
      />
      <div className="provider-picker__actions">
        <output aria-live="polite" className="provider-picker__status">
          {statusMessage}
        </output>
        <div className="provider-picker__action-buttons">
          <button
            className="provider-picker__secondary"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
