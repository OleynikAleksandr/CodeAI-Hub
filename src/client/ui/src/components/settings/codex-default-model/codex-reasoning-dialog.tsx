import type { FC } from "react";
import { useState } from "react";
import {
  CODEX_REASONING_LEVELS,
  type CodexReasoningLevel,
  type CodexRecommendedModelDescriptor,
} from "../../../../../../types/codex-model-registry";
import {
  ProviderOptionDialog,
  providerOptionDialogButtonStyles,
} from "../shared/provider-option-dialog";

type CodexReasoningDialogProps = {
  readonly model: CodexRecommendedModelDescriptor;
  readonly initialReasoning: CodexReasoningLevel;
  readonly onSave: (reasoning: CodexReasoningLevel) => void;
  readonly onCancel: () => void;
};

const CodexReasoningDialog: FC<CodexReasoningDialogProps> = ({
  model,
  initialReasoning,
  onSave,
  onCancel,
}) => {
  const [selectedReasoning, setSelectedReasoning] =
    useState<CodexReasoningLevel>(initialReasoning);
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
      subtitle="Choose how much reasoning effort Codex should apply for this model. Changes take effect when starting a new session."
      title={`${model.displayName} reasoning`}
    />
  );
};

const { cancelButtonStyles, saveButtonStyles } =
  providerOptionDialogButtonStyles;

export default CodexReasoningDialog;
