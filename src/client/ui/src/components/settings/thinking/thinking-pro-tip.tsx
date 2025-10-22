import type { CSSProperties, FC } from "react";

const containerStyles: CSSProperties = {
  marginTop: "20px",
  padding: "12px",
  background: "#1a1a1a",
  borderRadius: "4px",
  border: "1px solid #2d2d30",
};

const titleStyles: CSSProperties = {
  fontSize: "12px",
  color: "#7ca9d3",
  fontWeight: 500,
  marginBottom: "4px",
};

const descriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#999999",
  lineHeight: "1.4",
};

const ThinkingProTip: FC = () => (
  <div style={containerStyles}>
    <div style={titleStyles}>💡 Pro Tip</div>
    <div style={descriptionStyles}>
      Use "Ultrathink" anywhere in your message to enable maximum thinking
      (32000 tokens) for that specific query, regardless of your current
      settings.
    </div>
  </div>
);

export default ThinkingProTip;
