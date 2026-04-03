import type { FC } from "react";
import { useState } from "react";
import {
  CODEX_REASONING_LEVELS,
  type CodexReasoningLevel,
  type CodexRecommendedModelDescriptor,
} from "../../../../../../types/codex-model-registry";
import { useLocalization } from "../../../app-host/use-localization";
import {
  ProviderOptionDialog,
  providerOptionDialogButtonStyles,
} from "../shared/provider-option-dialog";

interface CodexReasoningDialogProps {
  readonly initialReasoning: CodexReasoningLevel;
  readonly model: CodexRecommendedModelDescriptor;
  readonly onCancel: () => void;
  readonly onSave: (reasoning: CodexReasoningLevel) => void;
}

const UI_HELPER_TEXT_CATEGORY = "user_guidance";

const CodexReasoningDialog: FC<CodexReasoningDialogProps> = ({
  model,
  initialReasoning,
  onSave,
  onCancel,
}) => {
  const { t } = useLocalization();
  const [selectedReasoning, setSelectedReasoning] =
    useState<CodexReasoningLevel>(initialReasoning);
  const subtitle = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.codex_reasoning_dialog.subtitle",
    "Choose how much reasoning effort Codex should apply for this model. Changes take effect when starting a new session."
  );
  const options = CODEX_REASONING_LEVELS.map((level) => ({
    value: level.name,
    label: level.name,
    description: level.description,
    useCase: level.useCase,
    isDefault: level.default,
  }));

  return (
    <ProviderOptionDialog
      ariaLabel={`Reasoning effort for ${model.displayName}`}
      footer={
        <>
          <button onClick={onCancel} style={cancelButtonStyles} type="button">
            Cancel
          </button>
          <button
            onClick={() => onSave(selectedReasoning)}
            style={saveButtonStyles}
            type="button"
          >
            Save
          </button>
        </>
      }
      name="codex-reasoning"
      onCancel={onCancel}
      onChange={setSelectedReasoning}
      options={options}
      selectedValue={selectedReasoning}
      subtitle={subtitle}
      title={`${model.displayName} reasoning`}
    />
  );
};

const { cancelButtonStyles, saveButtonStyles } =
  providerOptionDialogButtonStyles;

export default CodexReasoningDialog;
