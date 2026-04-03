import type { CSSProperties } from "react";
import { useLocalization } from "../../app-host/use-localization";

export type Provider = "claude" | "codex" | "gemini";

const UI_HELPER_TEXT_CATEGORY = "user_guidance";
const USER_MESSAGES_CATEGORY = "system_feedback";

const warningStyles: CSSProperties = {
  background: "#3a2a1f",
  border: "1px solid #9b6b3d",
  color: "#ffd7a3",
  borderRadius: "4px",
  padding: "8px 10px",
  fontSize: "12px",
  lineHeight: 1.5,
};

const toggleContainerStyles: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #2f2f2f",
  background: "#252526",
};

const toggleCheckboxStyles: CSSProperties = {
  marginTop: "2px",
  width: "16px",
  height: "16px",
  cursor: "pointer",
};

const toggleTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  marginBottom: "4px",
};

const toggleDescriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#9f9f9f",
  lineHeight: 1.4,
  margin: 0,
};

const providerBannerStyles = (provider: Provider): CSSProperties => {
  if (provider === "claude") {
    return {
      background: "#312d2a",
      border: "1px solid #ff9105",
      color: "#ffb76f",
    };
  }
  if (provider === "codex") {
    return {
      background: "#293230",
      border: "1px solid #01f0d8",
      color: "#9cf8ef",
    };
  }
  return {
    background: "#2c2a2d",
    border: "1px solid #ab34cb",
    color: "#e7b3f5",
  };
};

const resolveProviderLabel = (provider: Provider): string => {
  if (provider === "claude") {
    return "Claude";
  }
  if (provider === "codex") {
    return "Codex";
  }
  return "Gemini";
};

export const resolveTargetLabel = (
  provider: Provider,
  target: "cli" | "sdk" | "core"
): string => {
  if (provider === "gemini" && target === "core") {
    return "CLI Core";
  }
  if (target === "cli") {
    return "CLI";
  }
  return "SDK";
};

export const formatCheckedAt = (value?: string): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export const WarningBanner = ({
  provider,
}: {
  readonly provider: Provider;
}) => {
  const { t } = useLocalization();
  const warningText = t(
    USER_MESSAGES_CATEGORY,
    "settings.provider_versions.update.warning",
    "Warning: Updating is at your own risk. New versions may be incompatible. Updating will close active sessions."
  );

  return (
    <div style={{ ...warningStyles, ...providerBannerStyles(provider) }}>
      {warningText}
    </div>
  );
};

export const AutoUpdateToggle = ({
  provider,
  enabled,
  disabled,
  onToggle,
}: {
  readonly provider: Provider;
  readonly enabled: boolean;
  readonly disabled: boolean;
  readonly onToggle: (enabled: boolean) => void;
}) => {
  const { t } = useLocalization();
  const providerLabel = resolveProviderLabel(provider);
  const packageLabel =
    provider === "gemini" ? "CLI and CLI Core" : "CLI and SDK";
  const description = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.provider_versions.auto_update.description",
    "Automatically check and update the {packageLabel} on core start. Manual updates remain available below.",
    { packageLabel }
  );
  return (
    <label
      style={{
        ...toggleContainerStyles,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <input
        checked={enabled}
        disabled={disabled}
        onChange={(event) => onToggle(event.target.checked)}
        style={toggleCheckboxStyles}
        type="checkbox"
      />
      <div style={{ flex: 1 }}>
        <div style={toggleTitleStyles}>Auto-update {providerLabel}</div>
        <p style={toggleDescriptionStyles}>{description}</p>
      </div>
    </label>
  );
};
