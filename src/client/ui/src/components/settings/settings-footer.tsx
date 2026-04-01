import type {
  CSSProperties,
  FC,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { settingsSurfaceCopy } from "./settings-header";
import { settingsColorTokens, settingsTypographyTokens } from "./style-tokens";

interface SettingsFooterProps {
  readonly hasChanges: boolean;
  readonly onClose: () => void;
  readonly onReset: () => void;
  readonly onSave: () => void;
  readonly resetting: boolean;
  readonly saving: boolean;
}

const containerStyles: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 20px",
  borderTop: `1px solid ${settingsColorTokens.borderSubtle}`,
  flexShrink: 0,
};

const resetButtonStyles: CSSProperties = {
  padding: "6px 12px",
  background: "transparent",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  borderRadius: "4px",
  color: settingsColorTokens.textSecondary,
  cursor: "pointer",
  fontSize: settingsTypographyTokens.tabFontSize,
  transition: "all 0.2s ease",
};

const closeButtonStyles: CSSProperties = {
  padding: "6px 16px",
  background: "transparent",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  borderRadius: "4px",
  color: settingsColorTokens.textSecondary,
  cursor: "pointer",
  fontSize: settingsTypographyTokens.tabFontSize,
  transition: "all 0.2s ease",
};

const saveButtonStyles: CSSProperties = {
  padding: "6px 16px",
  background: settingsColorTokens.borderStrong,
  border: "none",
  borderRadius: "4px",
  color: "#808080",
  cursor: "default",
  fontSize: settingsTypographyTokens.tabFontSize,
  transition: "all 0.2s ease",
};

const buttonGroupStyles: CSSProperties = {
  display: "flex",
  gap: "8px",
};

const DISABLED_OPACITY = 0.6;
const HOVER_SURFACE_COLOR = settingsColorTokens.borderSubtle;
const HOVER_BORDER_COLOR = "#4c4c4c";
const SAVE_HOVER_COLOR = "#1177bb";

type ButtonMouseEvent = ReactMouseEvent<HTMLButtonElement, MouseEvent>;
type ButtonFocusEvent = ReactFocusEvent<HTMLButtonElement>;

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
      event.currentTarget.style.background = HOVER_SURFACE_COLOR;
      event.currentTarget.style.borderColor = HOVER_BORDER_COLOR;
    }
  };

  const handleResetMouseLeave = (event: ButtonMouseEvent) => {
    if (!resetting) {
      event.currentTarget.style.background = "transparent";
      event.currentTarget.style.borderColor = settingsColorTokens.borderStrong;
    }
  };

  const handleResetFocus = (event: ButtonFocusEvent) => {
    if (!resetting) {
      event.currentTarget.style.background = HOVER_SURFACE_COLOR;
      event.currentTarget.style.borderColor = HOVER_BORDER_COLOR;
    }
  };

  const handleResetBlur = (event: ButtonFocusEvent) => {
    if (!resetting) {
      event.currentTarget.style.background = "transparent";
      event.currentTarget.style.borderColor = settingsColorTokens.borderStrong;
    }
  };

  const handleCloseMouseEnter = (event: ButtonMouseEvent) => {
    event.currentTarget.style.background = HOVER_SURFACE_COLOR;
    event.currentTarget.style.borderColor = HOVER_BORDER_COLOR;
  };

  const handleCloseMouseLeave = (event: ButtonMouseEvent) => {
    event.currentTarget.style.background = "transparent";
    event.currentTarget.style.borderColor = settingsColorTokens.borderStrong;
  };

  const handleCloseFocus = (event: ButtonFocusEvent) => {
    event.currentTarget.style.background = HOVER_SURFACE_COLOR;
    event.currentTarget.style.borderColor = HOVER_BORDER_COLOR;
  };

  const handleCloseBlur = (event: ButtonFocusEvent) => {
    event.currentTarget.style.background = "transparent";
    event.currentTarget.style.borderColor = settingsColorTokens.borderStrong;
  };

  const handleSaveMouseEnter = (event: ButtonMouseEvent) => {
    if (hasChanges && !saving) {
      event.currentTarget.style.background = SAVE_HOVER_COLOR;
    }
  };

  const handleSaveMouseLeave = (event: ButtonMouseEvent) => {
    if (hasChanges && !saving) {
      event.currentTarget.style.background = settingsColorTokens.actionPrimary;
    }
  };

  const handleSaveFocus = (event: ButtonFocusEvent) => {
    if (hasChanges && !saving) {
      event.currentTarget.style.background = SAVE_HOVER_COLOR;
    }
  };

  const handleSaveBlur = (event: ButtonFocusEvent) => {
    if (hasChanges && !saving) {
      event.currentTarget.style.background = settingsColorTokens.actionPrimary;
    }
  };

  return (
    <div style={containerStyles}>
      <button
        disabled={resetting}
        onBlur={handleResetBlur}
        onClick={onReset}
        onFocus={handleResetFocus}
        onMouseEnter={handleResetMouseEnter}
        onMouseLeave={handleResetMouseLeave}
        style={{
          ...resetButtonStyles,
          background: resetting
            ? settingsColorTokens.borderStrong
            : "transparent",
          color: resetting ? "#808080" : settingsColorTokens.textSecondary,
          cursor: resetting ? "default" : "pointer",
          opacity: resetting ? DISABLED_OPACITY : 1,
        }}
        title={settingsSurfaceCopy.footer.resetButtonTitle}
        type="button"
      >
        {resetting
          ? settingsSurfaceCopy.footer.resetPendingLabel
          : settingsSurfaceCopy.footer.resetIdleLabel}
      </button>

      <div style={buttonGroupStyles}>
        <button
          onBlur={handleCloseBlur}
          onClick={onClose}
          onFocus={handleCloseFocus}
          onMouseEnter={handleCloseMouseEnter}
          onMouseLeave={handleCloseMouseLeave}
          style={closeButtonStyles}
          type="button"
        >
          {settingsSurfaceCopy.footer.closeButtonLabel}
        </button>
        <button
          disabled={!hasChanges || saving}
          onBlur={handleSaveBlur}
          onClick={onSave}
          onFocus={handleSaveFocus}
          onMouseEnter={handleSaveMouseEnter}
          onMouseLeave={handleSaveMouseLeave}
          style={{
            ...saveButtonStyles,
            background:
              hasChanges && !saving
                ? settingsColorTokens.actionPrimary
                : saveButtonStyles.background,
            color: hasChanges
              ? settingsColorTokens.actionPrimaryText
              : saveButtonStyles.color,
            cursor: hasChanges && !saving ? "pointer" : "default",
            opacity: saving ? DISABLED_OPACITY : 1,
          }}
          type="button"
        >
          {saving
            ? settingsSurfaceCopy.footer.savePendingLabel
            : settingsSurfaceCopy.footer.saveIdleLabel}
        </button>
      </div>
    </div>
  );
};

export default SettingsFooter;
