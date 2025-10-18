import type { CSSProperties, FC } from "react";

type ThinkingToggleProps = {
  readonly enabled: boolean;
  readonly onToggle: (enabled: boolean) => void;
};

const toggleContainerStyles: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  cursor: "pointer",
  gap: "12px",
  marginBottom: "20px",
};

const checkboxStyles: CSSProperties = {
  marginTop: "2px",
  width: "16px",
  height: "16px",
  cursor: "pointer",
};

const titleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  marginBottom: "4px",
};

const descriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#999999",
  lineHeight: "1.4",
};

const noteStyles: CSSProperties = {
  color: "#d4a36a",
};

const ThinkingToggle: FC<ThinkingToggleProps> = ({ enabled, onToggle }) => (
  <label style={toggleContainerStyles}>
    <input
      checked={enabled}
      onChange={(event) => onToggle(event.target.checked)}
      style={checkboxStyles}
      type="checkbox"
    />
    <div style={{ flex: 1 }}>
      <div style={titleStyles}>Enable thinking mode</div>
      <div style={descriptionStyles}>
        When enabled, Claude will use deeper reasoning to process complex
        queries. This provides more thoughtful and comprehensive responses.
        <br />
        <strong style={noteStyles}>Note:</strong> Changes take effect when
        creating a new session.
      </div>
    </div>
  </label>
);

export default ThinkingToggle;
