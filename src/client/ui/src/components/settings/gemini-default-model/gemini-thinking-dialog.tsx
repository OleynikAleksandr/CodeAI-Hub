import type { FC } from "react";
import { useState } from "react";
import {
  DEFAULT_GEMINI_THINKING_LEVEL,
  GEMINI_THINKING_LEVELS,
  type GeminiModelDescriptor,
  type GeminiThinkingLevel,
} from "../../../../../../types/gemini-model-registry";
import {
  ProviderOptionDialog,
  providerOptionDialogButtonStyles,
} from "../shared/provider-option-dialog";

type GeminiThinkingDialogProps = {
  readonly model: GeminiModelDescriptor;
  readonly initialLevel: GeminiThinkingLevel;
  readonly onSave: (level: GeminiThinkingLevel) => void;
  readonly onCancel: () => void;
};

const GeminiThinkingDialog: FC<GeminiThinkingDialogProps> = ({
  model,
  initialLevel,
  onSave,
  onCancel,
}) => {
  const [selectedLevel, setSelectedLevel] =
    useState<GeminiThinkingLevel>(initialLevel);
  const options = GEMINI_THINKING_LEVELS.filter((level) =>
    model.supportedThinkingLevels.includes(level.name)
  ).map((level) => ({
    value: level.name,
    label: level.name,
    description: level.description,
    useCase: level.useCase,
    isDefault: level.name === DEFAULT_GEMINI_THINKING_LEVEL,
  }));

  return (
    <ProviderOptionDialog
      ariaLabel={`Thinking level for ${model.displayName}`}
      footer={
        <>
          <button onClick={onCancel} style={cancelButtonStyles} type="button">
            Cancel
          </button>
          <button
            onClick={() => onSave(selectedLevel)}
            style={saveButtonStyles}
            type="button"
          >
            Save
          </button>
        </>
      }
      name="gemini-thinking"
      onCancel={onCancel}
      onChange={setSelectedLevel}
      options={options}
      selectedValue={selectedLevel}
      subtitle="Choose how much reasoning depth Gemini should apply for this model. Changes take effect when starting a new session."
      title={`${model.displayName} thinking`}
    />
  );
};

const { cancelButtonStyles, saveButtonStyles } =
  providerOptionDialogButtonStyles;

export default GeminiThinkingDialog;
