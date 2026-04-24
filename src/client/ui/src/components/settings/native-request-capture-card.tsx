import type { CSSProperties } from "react";
import { memo } from "react";
import { useLocalization } from "../../app-host/use-localization";
import SettingsCard from "./settings-card";
import {
  settingsColorTokens,
  settingsRadiusTokens,
  settingsTypographyTokens,
} from "./style-tokens";
import type {
  NativeRequestCaptureProviderId,
  NativeRequestCaptureState,
} from "./use-settings-state-support";

const UI_LABELS_CATEGORY = "ui_interface";
const USER_MESSAGES_CATEGORY = "system_feedback";

const buttonRowStyles: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const buttonStyles: CSSProperties = {
  border: `1px solid ${settingsColorTokens.actionPrimary}`,
  background: settingsColorTokens.actionPrimary,
  color: settingsColorTokens.actionPrimaryText,
  borderRadius: settingsRadiusTokens.control,
  cursor: "pointer",
  fontSize: settingsTypographyTokens.bodyFontSize,
  fontWeight: 600,
  minHeight: "34px",
  minWidth: "190px",
  padding: "0 12px",
};

const disabledButtonStyles: CSSProperties = {
  ...buttonStyles,
  background: settingsColorTokens.borderStrong,
  borderColor: settingsColorTokens.borderStrong,
  color: settingsColorTokens.textMuted,
  cursor: "progress",
  opacity: 0.85,
};

const statusStyles: CSSProperties = {
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  borderRadius: settingsRadiusTokens.control,
  color: settingsColorTokens.textMuted,
  fontSize: settingsTypographyTokens.bodyFontSize,
  lineHeight: 1.45,
  margin: 0,
  padding: "10px 12px",
};

const artifactListStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  margin: 0,
};

const artifactItemStyles: CSSProperties = {
  color: settingsColorTokens.textSecondary,
  display: "grid",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "11px",
  gap: "2px",
  overflowWrap: "anywhere",
};

const artifactLabelStyles: CSSProperties = {
  color: settingsColorTokens.textMuted,
  margin: 0,
};

const artifactPathStyles: CSSProperties = {
  margin: 0,
};

const getProviderLabel = (
  providerId: NativeRequestCaptureProviderId
): string => (providerId === "claude" ? "Claude" : "Codex");

const resolveStatusStyles = (
  state: NativeRequestCaptureState
): CSSProperties => {
  if (state.status === "success") {
    return {
      ...statusStyles,
      borderColor: "rgba(80, 160, 95, 0.55)",
      background: "rgba(80, 160, 95, 0.16)",
      color: "#a8ddb2",
    };
  }
  if (state.status === "error") {
    return {
      ...statusStyles,
      borderColor: "rgba(215, 101, 95, 0.55)",
      background: "rgba(215, 101, 95, 0.16)",
      color: "#f2b8b5",
    };
  }
  if (state.status === "running") {
    return {
      ...statusStyles,
      borderColor: "rgba(190, 145, 75, 0.55)",
      background: "rgba(190, 145, 75, 0.16)",
      color: "#f1d39b",
    };
  }
  return statusStyles;
};

const resolveStatusText = (options: {
  readonly errorLabel: string;
  readonly idleLabel: string;
  readonly runningLabel: string;
  readonly state: NativeRequestCaptureState;
  readonly successLabel: string;
}): string => {
  const { errorLabel, idleLabel, runningLabel, state, successLabel } = options;
  if (state.status === "running" && state.activeProvider) {
    return `${runningLabel}: ${getProviderLabel(state.activeProvider)}`;
  }
  if (state.status === "success") {
    return successLabel;
  }
  if (state.status === "error") {
    return `${errorLabel}${state.error ? ` ${state.error}` : ""}`;
  }
  return idleLabel;
};

interface NativeRequestCaptureCardProps {
  readonly onCapture: (providerId: NativeRequestCaptureProviderId) => void;
  readonly state: NativeRequestCaptureState;
}

const NativeRequestCaptureCard = ({
  state,
  onCapture,
}: NativeRequestCaptureCardProps) => {
  const { t } = useLocalization();
  const isRunning = state.status === "running";
  const title = t(
    UI_LABELS_CATEGORY,
    "settings.native_capture.title",
    "Provider Native Request Capture"
  );
  const idleLabel = t(
    USER_MESSAGES_CATEGORY,
    "settings.native_capture.idle",
    "No capture has been run in this window."
  );
  const runningLabel = t(
    USER_MESSAGES_CATEGORY,
    "settings.native_capture.running",
    "Capturing native request"
  );
  const successLabel = t(
    USER_MESSAGES_CATEGORY,
    "settings.native_capture.success",
    "Native request captured."
  );
  const errorLabel = t(
    USER_MESSAGES_CATEGORY,
    "settings.native_capture.error",
    "Native request capture failed."
  );
  const markdownLabel = t(
    UI_LABELS_CATEGORY,
    "settings.native_capture.markdown_path",
    "Markdown"
  );
  const jsonlLabel = t(
    UI_LABELS_CATEGORY,
    "settings.native_capture.jsonl_path",
    "JSONL"
  );
  const statusText = resolveStatusText({
    errorLabel,
    idleLabel,
    runningLabel,
    state,
    successLabel,
  });

  return (
    <SettingsCard title={title}>
      <div style={buttonRowStyles}>
        <button
          aria-busy={isRunning}
          disabled={isRunning}
          onClick={() => onCapture("claude")}
          style={isRunning ? disabledButtonStyles : buttonStyles}
          type="button"
        >
          {t(
            UI_LABELS_CATEGORY,
            "settings.native_capture.capture_claude",
            "Capture Claude Native Request"
          )}
        </button>
        <button
          aria-busy={isRunning}
          disabled={isRunning}
          onClick={() => onCapture("codex")}
          style={isRunning ? disabledButtonStyles : buttonStyles}
          type="button"
        >
          {t(
            UI_LABELS_CATEGORY,
            "settings.native_capture.capture_codex",
            "Capture Codex Native Request"
          )}
        </button>
      </div>
      <p aria-live="polite" style={resolveStatusStyles(state)}>
        {statusText}
      </p>
      {state.markdownPath || state.jsonlPath ? (
        <dl style={artifactListStyles}>
          {state.markdownPath ? (
            <div style={artifactItemStyles}>
              <dt style={artifactLabelStyles}>{markdownLabel}</dt>
              <dd style={artifactPathStyles}>{state.markdownPath}</dd>
            </div>
          ) : null}
          {state.jsonlPath ? (
            <div style={artifactItemStyles}>
              <dt style={artifactLabelStyles}>{jsonlLabel}</dt>
              <dd style={artifactPathStyles}>{state.jsonlPath}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </SettingsCard>
  );
};

export default memo(NativeRequestCaptureCard);
