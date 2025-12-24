import type { CSSProperties, FC } from "react";
import { useState } from "react";
import {
  DEFAULT_GEMINI_THINKING_LEVEL,
  GEMINI_THINKING_LEVELS,
  type GeminiModelDescriptor,
  type GeminiThinkingLevel,
} from "../../../../../../types/gemini-model-registry";

type GeminiThinkingDialogProps = {
  readonly model: GeminiModelDescriptor;
  readonly initialLevel: GeminiThinkingLevel;
  readonly onSave: (level: GeminiThinkingLevel) => void;
  readonly onCancel: () => void;
};

const overlayStyles: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyles: CSSProperties = {
  width: "560px",
  maxWidth: "90vw",
  maxHeight: "85vh",
  overflowY: "auto",
  background: "#1e1e1e",
  borderRadius: "8px",
  border: "1px solid #3c3c3c",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const headerStyles: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const titleStyles: CSSProperties = {
  fontSize: "16px",
  margin: 0,
  color: "#ffffff",
};

const subtitleStyles: CSSProperties = {
  fontSize: "12px",
  color: "#a0a0a0",
  margin: 0,
};

const closeButtonStyles: CSSProperties = {
  border: "1px solid #3a3d41",
  background: "transparent",
  color: "#d7d7d7",
  borderRadius: "4px",
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: "12px",
};

const optionListStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const optionRowStyles: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  border: "1px solid #2f2f2f",
  borderRadius: "6px",
  padding: "12px",
  background: "#252526",
  cursor: "pointer",
};

const optionSelectedStyles: CSSProperties = {
  borderColor: "#0e639c",
  background: "#1f2a33",
};

const radioStyles: CSSProperties = {
  marginTop: "2px",
  width: "16px",
  height: "16px",
  cursor: "pointer",
};

const optionTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#e5e5e5",
  marginBottom: "4px",
  textTransform: "uppercase",
};

const defaultBadgeStyles: CSSProperties = {
  fontSize: "10px",
  color: "#0e639c",
  background: "rgba(14, 99, 156, 0.2)",
  borderRadius: "4px",
  padding: "2px 6px",
  marginLeft: "8px",
  textTransform: "none",
};

const optionDescriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#b6b6b6",
  margin: 0,
  lineHeight: 1.4,
};

const optionUseCaseStyles: CSSProperties = {
  fontSize: "12px",
  color: "#8f8f8f",
  margin: "6px 0 0",
};

const footerStyles: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
};

const cancelButtonStyles: CSSProperties = {
  border: "1px solid #3a3d41",
  background: "transparent",
  color: "#d7d7d7",
  padding: "8px 14px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "12px",
};

const saveButtonStyles: CSSProperties = {
  border: "1px solid #0e639c",
  background: "#0e639c",
  color: "#ffffff",
  padding: "8px 14px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "12px",
};

const GeminiThinkingDialog: FC<GeminiThinkingDialogProps> = ({
  model,
  initialLevel,
  onSave,
  onCancel,
}) => {
  const [selectedLevel, setSelectedLevel] =
    useState<GeminiThinkingLevel>(initialLevel);

  return (
    <div style={overlayStyles}>
      <div
        aria-label={`Thinking level for ${model.displayName}`}
        aria-modal="true"
        role="dialog"
        style={dialogStyles}
      >
        <div style={headerStyles}>
          <div>
            <h3 style={titleStyles}>{model.displayName} thinking</h3>
            <p style={subtitleStyles}>
              Choose how much reasoning depth Gemini should apply for this
              model. Changes take effect when starting a new session.
            </p>
          </div>
          <button onClick={onCancel} style={closeButtonStyles} type="button">
            Close
          </button>
        </div>
        <div style={optionListStyles}>
          {GEMINI_THINKING_LEVELS.filter((level) =>
            model.supportedThinkingLevels.includes(level.name)
          ).map((level) => {
            const isSelected = level.name === selectedLevel;
            return (
              <label
                key={level.name}
                style={{
                  ...optionRowStyles,
                  ...(isSelected ? optionSelectedStyles : null),
                }}
              >
                <input
                  checked={isSelected}
                  name="gemini-thinking"
                  onChange={() => setSelectedLevel(level.name)}
                  style={radioStyles}
                  type="radio"
                />
                <div>
                  <div style={optionTitleStyles}>
                    {level.name}
                    {level.name === DEFAULT_GEMINI_THINKING_LEVEL ? (
                      <span style={defaultBadgeStyles}>Default</span>
                    ) : null}
                  </div>
                  <p style={optionDescriptionStyles}>{level.description}</p>
                  <p style={optionUseCaseStyles}>Use case: {level.useCase}</p>
                </div>
              </label>
            );
          })}
        </div>
        <div style={footerStyles}>
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
        </div>
      </div>
    </div>
  );
};

export default GeminiThinkingDialog;
