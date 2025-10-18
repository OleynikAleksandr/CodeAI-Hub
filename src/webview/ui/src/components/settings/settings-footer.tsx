import type { CSSProperties, FC, MouseEvent as ReactMouseEvent } from "react";

type SettingsFooterProps = {
  readonly hasChanges: boolean;
  readonly saving: boolean;
  readonly resetting: boolean;
  readonly onClose: () => void;
  readonly onSave: () => void;
  readonly onReset: () => void;
};

const containerStyles: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 20px",
  borderTop: "1px solid #2d2d30",
  flexShrink: 0,
};

const resetButtonStyles: CSSProperties = {
  padding: "6px 12px",
  background: "transparent",
  border: "1px solid #3c3c3c",
  borderRadius: "4px",
  color: "#cccccc",
  cursor: "pointer",
  fontSize: "12px",
  transition: "all 0.2s ease",
};

const closeButtonStyles: CSSProperties = {
  padding: "6px 16px",
  background: "transparent",
  border: "1px solid #3c3c3c",
  borderRadius: "4px",
  color: "#cccccc",
  cursor: "pointer",
  fontSize: "12px",
  transition: "all 0.2s ease",
};

const saveButtonStyles: CSSProperties = {
  padding: "6px 16px",
  background: "#3c3c3c",
  border: "none",
  borderRadius: "4px",
  color: "#808080",
  cursor: "default",
  fontSize: "12px",
  transition: "all 0.2s ease",
};

const buttonGroupStyles: CSSProperties = {
  display: "flex",
  gap: "8px",
};

const DISABLED_OPACITY = 0.6;

type ButtonMouseEvent = ReactMouseEvent<HTMLButtonElement, MouseEvent>;

const SettingsFooter: FC<SettingsFooterProps> = ({
  hasChanges,
  saving,
  resetting,
  onClose,
  onSave,
  onReset,
}) => {
  const handleResetMouseEnter = (event: ButtonMouseEvent) => {
    if (!resetting) {
      event.currentTarget.style.background = "#2d2d30";
      event.currentTarget.style.borderColor = "#4c4c4c";
    }
  };

  const handleResetMouseLeave = (event: ButtonMouseEvent) => {
    if (!resetting) {
      event.currentTarget.style.background = "transparent";
      event.currentTarget.style.borderColor = "#3c3c3c";
    }
  };

  const handleCloseMouseEnter = (event: ButtonMouseEvent) => {
    event.currentTarget.style.background = "#2d2d30";
    event.currentTarget.style.borderColor = "#4c4c4c";
  };

  const handleCloseMouseLeave = (event: ButtonMouseEvent) => {
    event.currentTarget.style.background = "transparent";
    event.currentTarget.style.borderColor = "#3c3c3c";
  };

  const handleSaveMouseEnter = (event: ButtonMouseEvent) => {
    if (hasChanges && !saving) {
      event.currentTarget.style.background = "#1177bb";
    }
  };

  const handleSaveMouseLeave = (event: ButtonMouseEvent) => {
    if (hasChanges && !saving) {
      event.currentTarget.style.background = "#0e639c";
    }
  };

  return (
    <div style={containerStyles}>
      <button
        disabled={resetting}
        onClick={onReset}
        onMouseEnter={handleResetMouseEnter}
        onMouseLeave={handleResetMouseLeave}
        style={{
          ...resetButtonStyles,
          background: resetting ? "#3c3c3c" : "transparent",
          color: resetting ? "#808080" : "#cccccc",
          cursor: resetting ? "default" : "pointer",
          opacity: resetting ? DISABLED_OPACITY : 1,
        }}
        title="Reset all settings to defaults"
        type="button"
      >
        {resetting ? "Resetting..." : "Reset to Defaults"}
      </button>

      <div style={buttonGroupStyles}>
        <button
          onClick={onClose}
          onMouseEnter={handleCloseMouseEnter}
          onMouseLeave={handleCloseMouseLeave}
          style={closeButtonStyles}
          type="button"
        >
          Close
        </button>
        <button
          disabled={!hasChanges || saving}
          onClick={onSave}
          onMouseEnter={handleSaveMouseEnter}
          onMouseLeave={handleSaveMouseLeave}
          style={{
            ...saveButtonStyles,
            background:
              hasChanges && !saving ? "#0e639c" : saveButtonStyles.background,
            color: hasChanges ? "#ffffff" : saveButtonStyles.color,
            cursor: hasChanges && !saving ? "pointer" : "default",
            opacity: saving ? DISABLED_OPACITY : 1,
          }}
          type="button"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default SettingsFooter;
