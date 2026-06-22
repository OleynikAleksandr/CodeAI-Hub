import type { CSSProperties, FC } from "react";
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
  readonly onThinkingDisplaySyncChange?: (enabled: boolean) => void;
  readonly onThinkingEnabledChange?: (enabled: boolean) => void;
  readonly thinkingDisplaySyncEnabled?: boolean;
  readonly thinkingEnabled?: boolean;
}

const displaySyncToggleStyles: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  margin: "12px 0 18px",
};

const displaySyncCheckboxStyles: CSSProperties = {
  marginTop: "2px",
  width: "16px",
  height: "16px",
  cursor: "pointer",
};

const displaySyncTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  marginBottom: "4px",
};

const displaySyncDescriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#999999",
  lineHeight: 1.4,
};

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
  onThinkingDisplaySyncChange,
  thinkingDisplaySyncEnabled = true,
}) => (
  <SettingsCard title="Kimi Default model">
    <p style={descriptionStyles}>
      Select the Kimi model used for new Kimi sessions.
    </p>
    <label style={displaySyncToggleStyles}>
      <input
        checked={thinkingDisplaySyncEnabled}
        onChange={(event) =>
          onThinkingDisplaySyncChange?.(event.target.checked)
        }
        style={displaySyncCheckboxStyles}
        type="checkbox"
      />
      <div>
        <div style={displaySyncTitleStyles}>Reasoning in dialog</div>
        <div style={displaySyncDescriptionStyles}>
          Show Kimi reasoning as a normal assistant bubble in the dialog.
        </div>
      </div>
    </label>
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
    <p style={noteStyles}>Uses the installed Kimi Code CLI through ACP.</p>
  </SettingsCard>
);

export default KimiDefaultModelCard;
