import type { FC } from "react";
import { useState } from "react";
import {
  DEFAULT_GEMINI_THINKING_LEVEL,
  GEMINI_THINKING_LEVELS,
  type GeminiModelDescriptor,
  type GeminiThinkingLevel,
} from "../../../../../../types/gemini-model-registry";
import { useLocalization } from "../../../app-host/use-localization";
import {
  ProviderOptionDialog,
  providerOptionDialogButtonStyles,
} from "../shared/provider-option-dialog";

interface GeminiThinkingDialogProps {
  readonly initialLevel: GeminiThinkingLevel;
  readonly model: GeminiModelDescriptor;
  readonly onCancel: () => void;
  readonly onSave: (level: GeminiThinkingLevel) => void;
}

const UI_HELPER_TEXT_CATEGORY = "user_guidance";

const GeminiThinkingDialog: FC<GeminiThinkingDialogProps> = ({
  model,
  initialLevel,
  onSave,
  onCancel,
}) => {
  const { t } = useLocalization();
  const [selectedLevel, setSelectedLevel] =
    useState<GeminiThinkingLevel>(initialLevel);
  const subtitle = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.gemini_thinking_dialog.subtitle",
    "Choose how much reasoning depth Gemini should apply for this model. Changes take effect when starting a new session."
  );
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
      subtitle={subtitle}
      title={`${model.displayName} thinking`}
    />
  );
};

const { cancelButtonStyles, saveButtonStyles } =
  providerOptionDialogButtonStyles;

export default GeminiThinkingDialog;
