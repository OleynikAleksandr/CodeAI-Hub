import type { ChangeEvent, CSSProperties, FC } from "react";
import {
  MAX_THINKING_TOKENS,
  MIN_THINKING_TOKENS,
  THINKING_TOKEN_STEP,
} from "./constants";

type ThinkingTokenInputProps = {
  readonly value: number;
  readonly onChange: (nextValue: number) => void;
};

const containerStyles: CSSProperties = {
  paddingLeft: "28px",
  borderTop: "1px solid #3c3c3c",
  paddingTop: "15px",
};

const titleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  marginBottom: "8px",
};

const controlsStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const buttonStyles: CSSProperties = {
  width: "28px",
  height: "28px",
  background: "#2d2d30",
  border: "1px solid #3c3c3c",
  borderRadius: "4px",
  color: "#cccccc",
  cursor: "pointer",
  fontSize: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const inputStyles: CSSProperties = {
  width: "100px",
  padding: "6px 8px",
  background: "#1e1e1e",
  border: "1px solid #3c3c3c",
  borderRadius: "4px",
  color: "#cccccc",
  fontSize: "13px",
  textAlign: "center",
  MozAppearance: "textfield",
  appearance: "textfield",
};

const helperStyles: CSSProperties = {
  fontSize: "12px",
  color: "#999999",
  marginTop: "8px",
  lineHeight: "1.4",
};

const ThinkingTokenInput: FC<ThinkingTokenInputProps> = ({
  value,
  onChange,
}) => {
  const updateValue = (next: number) => {
    const constrained = Math.min(
      MAX_THINKING_TOKENS,
      Math.max(MIN_THINKING_TOKENS, next)
    );
    onChange(constrained);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(event.target.value, 10);
    updateValue(Number.isNaN(parsed) ? MIN_THINKING_TOKENS : parsed);
  };

  return (
    <div style={containerStyles}>
      <label style={{ display: "block" }}>
        <div style={titleStyles}>Maximum thinking tokens</div>
        <div style={controlsStyles}>
          <button
            onClick={() => updateValue(value - THINKING_TOKEN_STEP)}
            style={buttonStyles}
            title="Decrease by 1000"
            type="button"
          >
            −
          </button>
          <input
            max={MAX_THINKING_TOKENS}
            min={MIN_THINKING_TOKENS}
            onChange={handleInputChange}
            step={THINKING_TOKEN_STEP}
            style={inputStyles}
            type="number"
            value={value}
          />
          <button
            onClick={() => updateValue(value + THINKING_TOKEN_STEP)}
            style={buttonStyles}
            title="Increase by 1000"
            type="button"
          >
            +
          </button>
        </div>
        <div style={helperStyles}>
          • Normal (4000): Standard reasoning depth
          <br />• Hard (10000): Extended analysis for complex tasks
          <br />• Ultra (32000): Maximum reasoning capacity
        </div>
      </label>
    </div>
  );
};

export default ThinkingTokenInput;
