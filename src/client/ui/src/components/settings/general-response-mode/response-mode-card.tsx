import type { CSSProperties } from "react";
import { memo } from "react";
import SettingsCard from "../settings-card";
import {
  type GeneralResponseMode,
  RESPONSE_MODE_OPTIONS,
} from "./response-mode-copy";
import type { GeneralResponsePolicySettings } from "./response-mode-state";

interface ResponseModeCardProps {
  readonly onModeChange: (mode: GeneralResponseMode) => void;
  readonly onStrictInstructionTextChange: (value: string) => void;
  readonly onStrictSchemaTextChange: (value: string) => void;
  readonly responsePolicy: GeneralResponsePolicySettings;
}

const copyStyles: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "#bbbbbb",
  lineHeight: 1.45,
};

const optionListStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const optionButtonStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "4px",
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #3a3d41",
  background: "#1e1e1e",
  color: "#f5f5f5",
  cursor: "pointer",
  textAlign: "left",
};

const activeOptionStyles: CSSProperties = {
  borderColor: "#0e639c",
  background: "#132938",
};

const optionTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
};

const optionDescriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#bbbbbb",
  lineHeight: 1.4,
};

const labelStyles: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#f5f5f5",
};

const inputStyles: CSSProperties = {
  width: "100%",
  minHeight: "132px",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #3a3d41",
  background: "#111111",
  color: "#f5f5f5",
  fontSize: "12px",
  fontFamily: "Menlo, Monaco, Consolas, monospace",
  lineHeight: 1.45,
  resize: "vertical",
  boxSizing: "border-box",
};

const inputGroupStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const strictBlockStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  marginTop: "16px",
};

const ResponseModeCard = ({
  responsePolicy,
  onModeChange,
  onStrictInstructionTextChange,
  onStrictSchemaTextChange,
}: ResponseModeCardProps) => (
  <SettingsCard title="Response Mode">
    <p style={copyStyles}>
      Control how Codex turns are shaped before they reach the provider. Use
      `Hybrid` as the safe default for workflow sessions and switch to
      `Debug/Raw` when investigating new model behavior.
    </p>
    <div style={optionListStyles}>
      {RESPONSE_MODE_OPTIONS.map((option) => (
        <button
          key={option.id}
          onClick={() => onModeChange(option.id)}
          style={{
            ...optionButtonStyles,
            ...(responsePolicy.mode === option.id ? activeOptionStyles : null),
          }}
          type="button"
        >
          <span style={optionTitleStyles}>{option.label}</span>
          <span style={optionDescriptionStyles}>{option.description}</span>
        </button>
      ))}
    </div>
    {responsePolicy.mode === "strict" ? (
      <div style={strictBlockStyles}>
        <div style={inputGroupStyles}>
          <span style={labelStyles}>Strict Schema JSON</span>
          <textarea
            onChange={(event) => onStrictSchemaTextChange(event.target.value)}
            style={inputStyles}
            value={responsePolicy.strictOutput.schemaText}
          />
        </div>
        <div style={inputGroupStyles}>
          <span style={labelStyles}>Strict Instruction Text</span>
          <textarea
            onChange={(event) =>
              onStrictInstructionTextChange(event.target.value)
            }
            style={{ ...inputStyles, minHeight: "108px" }}
            value={responsePolicy.strictOutput.instructionText}
          />
        </div>
      </div>
    ) : null}
  </SettingsCard>
);

export default memo(ResponseModeCard);
