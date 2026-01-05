import type { ProviderStackId } from "../../../../types/provider";
import { type FlowStageId, FlowWizard } from "../components/flow-wizard";

type FlowWizardPickerProps = {
  readonly providerId: ProviderStackId | null;
  readonly onCancel: () => void;
  readonly onStageClick: (stage: FlowStageId) => void;
  readonly visible: boolean;
};

export const FlowWizardPicker = ({
  providerId,
  onCancel,
  onStageClick,
  visible,
}: FlowWizardPickerProps) => {
  if (!visible) {
    return null;
  }

  const statusMessage =
    providerId === "codexCli" || providerId === "claudeCodeCli"
      ? "Click Idea to start."
      : "Select a stage to continue.";

  return (
    <div className="provider-picker">
      <FlowWizard activeStage="idea" onStageClick={onStageClick} />
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
