import type { CSSProperties, FC } from "react";
import { useLocalization } from "../../../app-host/use-localization";

interface ThinkingToggleProps {
  readonly enabled: boolean;
  readonly onToggle: (enabled: boolean) => void;
}

const UI_HELPER_TEXT_CATEGORY = "user_guidance";

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

const ThinkingToggle: FC<ThinkingToggleProps> = ({ enabled, onToggle }) => {
  const { t } = useLocalization();
  const description = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.claude_thinking_settings.enable_thinking.description",
    "When enabled, Claude will use deeper reasoning to process complex queries. This provides more thoughtful and comprehensive responses."
  );
  const note = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.claude_thinking_settings.enable_thinking.note",
    "Changes take effect when creating a new session."
  );

  return (
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
          {description}
          <br />
          <strong style={noteStyles}>Note:</strong> {note}
        </div>
      </div>
    </label>
  );
};

export default ThinkingToggle;
