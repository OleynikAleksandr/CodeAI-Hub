import type { CSSProperties, FC } from "react";
import { useLocalization } from "../../../app-host/use-localization";

const UI_HELPER_TEXT_CATEGORY = "user_guidance";

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

const ThinkingProTip: FC = () => {
  const { t } = useLocalization();
  const description = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.claude_thinking_settings.pro_tip.description",
    'Use "Ultrathink" anywhere in your message to ask Claude for maximum reasoning effort on that specific query, regardless of your current saved setting.'
  );

  return (
    <div style={containerStyles}>
      <div style={titleStyles}>💡 Pro Tip</div>
      <div style={descriptionStyles}>{description}</div>
    </div>
  );
};

export default ThinkingProTip;
