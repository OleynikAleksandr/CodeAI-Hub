import type { CSSProperties } from "react";
import { memo, useEffect, useMemo } from "react";
import SettingsCard from "./settings-card";
import {
  settingsColorTokens,
  settingsRadiusTokens,
  settingsTypographyTokens,
} from "./style-tokens";
import type {
  PendingTemplateUpdateView,
  TemplateUpdateResolutionAction,
  TemplateUpdatesViewState,
} from "./template-update-settings-model";

const buttonBaseStyles: CSSProperties = {
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  borderRadius: settingsRadiusTokens.control,
  boxSizing: "border-box",
  color: settingsColorTokens.textSecondary,
  cursor: "pointer",
  fontSize: settingsTypographyTokens.bodyFontSize,
  fontWeight: 600,
  minHeight: "32px",
  padding: "0 10px",
};

const primaryButtonStyles: CSSProperties = {
  ...buttonBaseStyles,
  background: settingsColorTokens.actionPrimary,
  borderColor: settingsColorTokens.actionPrimary,
  color: settingsColorTokens.actionPrimaryText,
};

const secondaryButtonStyles: CSSProperties = {
  ...buttonBaseStyles,
  background: "rgba(255, 255, 255, 0.04)",
};

const disabledButtonStyles: CSSProperties = {
  ...secondaryButtonStyles,
  color: settingsColorTokens.textMuted,
  cursor: "progress",
  opacity: 0.68,
};

const stackStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const actionRowStyles: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
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

const errorStatusStyles: CSSProperties = {
  ...statusStyles,
  background: "rgba(215, 101, 95, 0.16)",
  borderColor: "rgba(215, 101, 95, 0.55)",
  color: "#f2b8b5",
};

const successStatusStyles: CSSProperties = {
  ...statusStyles,
  background: "rgba(80, 160, 95, 0.16)",
  borderColor: "rgba(80, 160, 95, 0.55)",
  color: "#a8ddb2",
};

const listStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const updateRowStyles: CSSProperties = {
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  borderRadius: settingsRadiusTokens.control,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "10px",
};

const pathStackStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: 0,
};

const pathStyles: CSSProperties = {
  color: settingsColorTokens.textSecondary,
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "11px",
  margin: 0,
  overflowWrap: "anywhere",
};

const mutedPathStyles: CSSProperties = {
  ...pathStyles,
  color: settingsColorTokens.textMuted,
};

const hashStyles: CSSProperties = {
  ...mutedPathStyles,
  fontSize: "10px",
};

const actionLabels: Record<TemplateUpdateResolutionAction, string> = {
  "backup-and-replace": "Backup + replace",
  "preserve-current": "Preserve",
  "replace-with-incoming": "Replace",
};

const resolveStatusText = (state: TemplateUpdatesViewState): string => {
  if (state.loading) {
    return "Checking template updates...";
  }
  if (state.resolving) {
    return "Applying template decision...";
  }
  if (state.error) {
    return state.error;
  }
  if (state.lastResolution?.status === "error") {
    return state.lastResolution.error ?? "Template update decision failed.";
  }
  if (state.lastResolution?.status === "not_found") {
    return "Template update is no longer pending.";
  }
  if (state.lastResolution?.status === "resolved") {
    return `${actionLabels[state.lastResolution.action]} applied.`;
  }
  if (state.updates.length === 0) {
    return "No pending template updates.";
  }
  return `Pending template updates: ${state.updates.length}.`;
};

const getStatusStyles = (state: TemplateUpdatesViewState): CSSProperties => {
  if (state.error || state.lastResolution?.status === "error") {
    return errorStatusStyles;
  }
  if (state.lastResolution?.status === "resolved") {
    return successStatusStyles;
  }
  return statusStyles;
};

const TemplateUpdateRow = (props: {
  readonly disabled: boolean;
  readonly onResolve: (
    id: string,
    action: TemplateUpdateResolutionAction
  ) => void;
  readonly update: PendingTemplateUpdateView;
}) => (
  <div style={updateRowStyles}>
    <div style={pathStackStyles}>
      <p style={pathStyles} title={props.update.destinationPath}>
        {props.update.destinationRelativePath}
      </p>
      <p style={mutedPathStyles} title={props.update.incomingPath}>
        incoming: {props.update.incomingRelativePath}
      </p>
      <p style={hashStyles}>hash: {props.update.pendingBundledHash}</p>
    </div>
    <div style={actionRowStyles}>
      {(
        [
          "preserve-current",
          "replace-with-incoming",
          "backup-and-replace",
        ] as const
      ).map((action) => (
        <button
          disabled={props.disabled}
          key={action}
          onClick={() => props.onResolve(props.update.id, action)}
          style={props.disabled ? disabledButtonStyles : secondaryButtonStyles}
          type="button"
        >
          {actionLabels[action]}
        </button>
      ))}
    </div>
  </div>
);

interface TemplateUpdatesCardProps {
  readonly onLoad: () => void;
  readonly onResolve: (
    id: string,
    action: TemplateUpdateResolutionAction
  ) => void;
  readonly state: TemplateUpdatesViewState;
}

const TemplateUpdatesCard = ({
  onLoad,
  onResolve,
  state,
}: TemplateUpdatesCardProps) => {
  useEffect(() => {
    onLoad();
  }, [onLoad]);

  const disabled = state.loading || state.resolving;
  const hasUpdates = state.updates.length > 0;
  const statusText = resolveStatusText(state);
  const resolvedStatusStyles = getStatusStyles(state);
  const refreshStyles = disabled ? disabledButtonStyles : secondaryButtonStyles;
  const groupedActions = useMemo(
    () =>
      (
        [
          "preserve-current",
          "replace-with-incoming",
          "backup-and-replace",
        ] as const
      ).map((action) => (
        <button
          disabled={disabled || !hasUpdates}
          key={action}
          onClick={() => {
            for (const update of state.updates) {
              onResolve(update.id, action);
            }
          }}
          style={
            disabled || !hasUpdates ? disabledButtonStyles : primaryButtonStyles
          }
          type="button"
        >
          {`${actionLabels[action]} all`}
        </button>
      )),
    [disabled, hasUpdates, onResolve, state.updates]
  );

  return (
    <SettingsCard
      action={
        <button
          disabled={disabled}
          onClick={onLoad}
          style={refreshStyles}
          type="button"
        >
          Refresh
        </button>
      }
      title="Template Updates"
    >
      <div style={stackStyles}>
        <p aria-live="polite" style={resolvedStatusStyles}>
          {statusText}
        </p>
        <div style={actionRowStyles}>{groupedActions}</div>
        {hasUpdates ? (
          <div style={listStyles}>
            {state.updates.map((update) => (
              <TemplateUpdateRow
                disabled={disabled}
                key={update.id}
                onResolve={onResolve}
                update={update}
              />
            ))}
          </div>
        ) : null}
      </div>
    </SettingsCard>
  );
};

export default memo(TemplateUpdatesCard);
