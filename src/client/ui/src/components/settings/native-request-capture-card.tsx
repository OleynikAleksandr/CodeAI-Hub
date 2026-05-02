import type { CSSProperties } from "react";
import { memo } from "react";
import { useLocalization } from "../../app-host/use-localization";
import SettingsCard from "./settings-card";
import {
  settingsColorTokens,
  settingsRadiusTokens,
  settingsTypographyTokens,
} from "./style-tokens";
import type { NativeRequestCaptureScenarioId } from "./use-settings-state-support";

const UI_LABELS_CATEGORY = "ui_interface";
const UI_HELPER_TEXT_CATEGORY = "user_guidance";

const wrapperStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const descriptionStyles: CSSProperties = {
  color: settingsColorTokens.textSecondary,
  fontSize: settingsTypographyTokens.bodyFontSize,
  lineHeight: 1.45,
  margin: 0,
};

const buttonStyles: CSSProperties = {
  alignItems: "center",
  alignSelf: "flex-start",
  background: settingsColorTokens.actionPrimary,
  border: `1px solid ${settingsColorTokens.actionPrimary}`,
  borderRadius: settingsRadiusTokens.control,
  color: settingsColorTokens.actionPrimaryText,
  cursor: "pointer",
  display: "inline-flex",
  fontSize: settingsTypographyTokens.bodyFontSize,
  fontWeight: 600,
  justifyContent: "center",
  minHeight: "34px",
  minWidth: "190px",
  padding: "0 14px",
};

const disabledButtonStyles: CSSProperties = {
  ...buttonStyles,
  background: settingsColorTokens.borderStrong,
  borderColor: settingsColorTokens.borderStrong,
  color: settingsColorTokens.textMuted,
  cursor: "not-allowed",
  opacity: 0.85,
};

export const NATIVE_REQUEST_CAPTURE_SCENARIO_OPTIONS: readonly {
  readonly id: NativeRequestCaptureScenarioId;
  readonly label: string;
}[] = [
  { id: "description", label: "Description" },
  { id: "virtual_simulation", label: "Virtual Simulation" },
  { id: "diagram_modules", label: "Diagram Modules" },
  { id: "translation", label: "Translation" },
];

interface NativeRequestCaptureCardProps {
  readonly onOpenWorkbench?: () => void;
}

const NativeRequestCaptureCard = ({
  onOpenWorkbench,
}: NativeRequestCaptureCardProps) => {
  const { t } = useLocalization();
  const title = t(
    UI_LABELS_CATEGORY,
    "settings.native_capture.title",
    "Provider Native Request Capture"
  );
  const description = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.native_capture.launcher_description",
    "Open the detached Capture Workbench to run managed snapshots and compare captured native requests."
  );
  const buttonLabel = t(
    UI_LABELS_CATEGORY,
    "settings.native_capture.open_workbench",
    "Open Capture Workbench"
  );
  const disabledTitle = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.native_capture.launcher_unavailable",
    "Capture Workbench is available from Project Manager workspaces."
  );
  const disabled = typeof onOpenWorkbench !== "function";

  return (
    <SettingsCard title={title}>
      <div style={wrapperStyles}>
        <p style={descriptionStyles}>{description}</p>
        <button
          disabled={disabled}
          onClick={onOpenWorkbench}
          style={disabled ? disabledButtonStyles : buttonStyles}
          title={disabled ? disabledTitle : undefined}
          type="button"
        >
          {buttonLabel}
        </button>
      </div>
    </SettingsCard>
  );
};

export default memo(NativeRequestCaptureCard);
