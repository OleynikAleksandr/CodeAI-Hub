import type { CSSProperties, FC } from "react";
import { useLocalization } from "../../app-host/use-localization";

interface SettingsHeaderProps {
  readonly onClose: () => void;
}

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

const SettingsHeader: FC<SettingsHeaderProps> = ({ onClose }) => {
  const { t } = useLocalization();
  const title = t("ui_interface", "settings.header.title", "Settings");
  const closeButtonLabel = t(
    "ui_interface",
    "settings.header.close_button_label",
    "Close settings"
  );

  return (
    <div style={headerStyles}>
      <div style={titleStyles}>{title}</div>
      <button
        aria-label={closeButtonLabel}
        onClick={onClose}
        style={closeButtonStyles}
        title={closeButtonLabel}
        type="button"
      >
        ×
      </button>
    </div>
  );
};

export default SettingsHeader;
