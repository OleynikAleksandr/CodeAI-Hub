import type { FC } from "react";
import {
  DEFAULT_KIMI_MODEL_ID,
  KIMI_RECOMMENDED_MODELS,
  type KimiModelId,
} from "../../../../../types/kimi-model-registry";
import SettingsCard from "./settings-card";
import {
  descriptionStyles,
  listStyles,
  modelDescriptionStyles,
  modelInfoStyles,
  modelTitleStyles,
  noteStyles,
  radioCircleInnerStyles,
  radioCircleSelectedStyles,
  radioCircleStyles,
  rowBaseStyles,
  rowSelectedStyles,
} from "./shared-model-card-styles";

interface KimiDefaultModelCardProps {
  readonly defaultModel?: KimiModelId;
  readonly onDefaultModelChange?: (modelId: KimiModelId) => void;
}

const RadioCircle: FC<{ readonly checked: boolean }> = ({ checked }) => (
  <div
    style={{
      ...radioCircleStyles,
      ...(checked ? radioCircleSelectedStyles : {}),
    }}
  >
    {checked ? <div style={radioCircleInnerStyles} /> : null}
  </div>
);

const KimiDefaultModelCard: FC<KimiDefaultModelCardProps> = ({
  defaultModel = DEFAULT_KIMI_MODEL_ID,
  onDefaultModelChange,
}) => (
  <SettingsCard title="Kimi Default model">
    <p style={descriptionStyles}>
      Select the Kimi model used for new Kimi sessions.
    </p>
    <div style={listStyles}>
      {KIMI_RECOMMENDED_MODELS.map((model) => {
        const selected = model.id === defaultModel;
        return (
          <button
            aria-pressed={selected}
            key={model.id}
            onClick={() => onDefaultModelChange?.(model.id)}
            style={{
              ...rowBaseStyles,
              border: "none",
              textAlign: "left",
              width: "100%",
              ...(selected ? rowSelectedStyles : {}),
            }}
            type="button"
          >
            <RadioCircle checked={selected} />
            <div style={modelInfoStyles}>
              <div style={modelTitleStyles}>{model.displayName}</div>
              <div style={modelDescriptionStyles}>{model.description}</div>
            </div>
          </button>
        );
      })}
    </div>
    <p style={noteStyles}>
      Uses KIMI_SHARE_DIR at ~/.codeai-hub/providers/kimi/home.
    </p>
  </SettingsCard>
);

export default KimiDefaultModelCard;
