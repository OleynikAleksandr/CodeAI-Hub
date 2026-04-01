import type { CSSProperties, FC } from "react";

interface SettingsHeaderProps {
  readonly onClose: () => void;
}

export const settingsSurfaceCopy = {
  header: {
    title: "Settings",
    closeButtonLabel: "Close settings",
  },
  footer: {
    resetButtonTitle: "Reset all settings to defaults",
    resetIdleLabel: "Reset to Defaults",
    resetPendingLabel: "Resetting...",
    closeButtonLabel: "Close",
    saveIdleLabel: "Save Changes",
    savePendingLabel: "Saving...",
  },
  coreControls: {
    title: "Core Controls",
    description:
      "Restart the CodeAI Hub core to trigger a fresh CLI detection cycle. Use this option after resolving CLI authentication or quota issues.",
    restartIdleLabel: "Restart Core",
    restartPendingLabel: "Restarting...",
    idleStatusLabel: "Core restart status will appear here.",
  },
} as const;

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
    <div style={titleStyles}>{settingsSurfaceCopy.header.title}</div>
    <button
      aria-label={settingsSurfaceCopy.header.closeButtonLabel}
      onClick={onClose}
      style={closeButtonStyles}
      title={settingsSurfaceCopy.header.closeButtonLabel}
      type="button"
    >
      ×
    </button>
  </div>
);

export default SettingsHeader;
