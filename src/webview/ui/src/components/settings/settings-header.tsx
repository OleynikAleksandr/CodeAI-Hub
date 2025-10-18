import type { CSSProperties, FC } from "react";

type SettingsHeaderProps = {
  readonly onClose: () => void;
};

const headerStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: "1px solid #2d2d30",
  flexShrink: 0,
};

const titleStyles: CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
};

const closeButtonStyles: CSSProperties = {
  background: "transparent",
  border: "1px solid #3c3c3c",
  borderRadius: "4px",
  color: "#cccccc",
  cursor: "pointer",
  padding: "4px 8px",
  fontSize: "18px",
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const SettingsHeader: FC<SettingsHeaderProps> = ({ onClose }) => (
  <div style={headerStyles}>
    <div style={titleStyles}>Settings</div>
    <button
      aria-label="Close settings"
      onClick={onClose}
      style={closeButtonStyles}
      title="Close settings"
      type="button"
    >
      ×
    </button>
  </div>
);

export default SettingsHeader;
