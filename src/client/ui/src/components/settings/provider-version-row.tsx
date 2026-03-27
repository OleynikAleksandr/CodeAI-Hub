import type { CSSProperties } from "react";
import { memo } from "react";

export interface VersionRow {
  readonly currentVersion?: string | null;
  readonly label: string;
  readonly latestVersion?: string | null;
  readonly packageName: string;
  readonly showUpdateButton?: boolean;
  readonly target?: "cli" | "sdk" | "core";
}

interface VersionRowItemProps {
  readonly disabled: boolean;
  readonly isUpdating: boolean;
  readonly onClick?: () => void;
  readonly pendingConfirmation: boolean;
  readonly row: VersionRow;
}

const rowStyles: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "10px",
  borderRadius: "4px",
  background: "#1f1f1f",
  border: "1px solid #2e2e2e",
};

const labelStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const nameStyles: CSSProperties = {
  fontSize: "13px",
  color: "#e0e0e0",
  margin: 0,
};

const versionTextStyles: CSSProperties = {
  fontSize: "12px",
  color: "#b7b7b7",
  margin: 0,
};

const chipStyles: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "#2a2a2a",
  color: "#d0d0d0",
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "11px",
  border: "1px solid #3c3c3c",
};

const buttonStyles: CSSProperties = {
  minWidth: "160px",
  border: "1px solid #3a3d41",
  background: "#0e639c",
  color: "#ffffff",
  padding: "8px 12px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "12px",
};

const buttonDisabledStyles: CSSProperties = {
  ...buttonStyles,
  background: "#2d2d30",
  color: "#9f9f9f",
  cursor: "not-allowed",
  borderColor: "#3c3c3c",
};

const pendingButtonStyles: CSSProperties = {
  ...buttonStyles,
  background: "#c18400",
  borderColor: "#f0c674",
  color: "#1b1b1b",
};

const VersionRowItemComponent = ({
  row,
  disabled,
  onClick,
  isUpdating,
  pendingConfirmation,
}: VersionRowItemProps) => {
  const hasUpdate =
    !disabled &&
    row.latestVersion !== null &&
    row.latestVersion !== undefined &&
    row.latestVersion !== row.currentVersion;
  const buttonLabel = (() => {
    if (isUpdating) {
      return `Updating to ${row.latestVersion ?? "latest"}…`;
    }
    if (!hasUpdate) {
      if (row.latestVersion) {
        return `Up to date (${row.latestVersion})`;
      }
      return "Up to date";
    }
    if (pendingConfirmation) {
      return "Click again to confirm";
    }
    return `Update to ${row.latestVersion ?? "latest"}`;
  })();

  const currentLabel = row.currentVersion ?? "Not detected";
  const latestLabel = row.latestVersion ?? "Latest: unknown";
  let resolvedButtonStyle = buttonDisabledStyles;
  if (pendingConfirmation) {
    resolvedButtonStyle = pendingButtonStyles;
  } else if (hasUpdate && !disabled) {
    resolvedButtonStyle = buttonStyles;
  }

  const shouldShowButton = row.showUpdateButton ?? true;

  return (
    <div style={rowStyles}>
      <div style={labelStyles}>
        <p style={nameStyles}>{row.label}</p>
        <p style={versionTextStyles}>
          Current: {currentLabel} <span style={chipStyles}>{latestLabel}</span>
        </p>
      </div>
      {row.target && shouldShowButton ? (
        <button
          disabled={disabled || !hasUpdate}
          onClick={onClick}
          style={resolvedButtonStyle}
          type="button"
        >
          {buttonLabel}
        </button>
      ) : (
        <span style={chipStyles}>{latestLabel}</span>
      )}
    </div>
  );
};

export const VersionRowItem = memo(VersionRowItemComponent);
