import type { CSSProperties } from "react";
import { memo, useEffect, useState } from "react";
import {
  CLAUDE_MODEL_ALIASES,
  type ClaudeModelAliasId,
} from "../../../../../types/claude-model-registry";
import {
  CODEX_SETTINGS_MODELS,
  type CodexModelId,
} from "../../../../../types/codex-model-registry";
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
  flexDirection: "column",
  gap: "12px",
};

const providerRowStyles: CSSProperties = {
  alignItems: "center",
  display: "grid",
  gap: "10px",
  gridTemplateColumns: "76px minmax(0, 1fr) auto",
};

const providerLabelStyles: CSSProperties = {
  color: settingsColorTokens.textSecondary,
  fontSize: settingsTypographyTokens.bodyFontSize,
  fontWeight: 700,
};

const modelRowStyles: CSSProperties = {
  border: "none",
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  margin: 0,
  minWidth: 0,
  padding: 0,
};

const visuallyHiddenStyles: CSSProperties = {
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: "1px",
  overflow: "hidden",
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
};

const modelButtonStyles: CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  borderRadius: settingsRadiusTokens.control,
  color: settingsColorTokens.textSecondary,
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600,
  minHeight: "30px",
  padding: "0 10px",
};

const activeModelButtonStyles: CSSProperties = {
  ...modelButtonStyles,
  background: "rgba(31, 123, 184, 0.24)",
  borderColor: "rgba(31, 123, 184, 0.72)",
  color: settingsColorTokens.textPrimary,
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
  minWidth: "168px",
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

type NativeRequestCaptureModelId = ClaudeModelAliasId | CodexModelId;

interface NativeRequestCaptureModels {
  readonly claude: ClaudeModelAliasId;
  readonly codex: CodexModelId;
}

const getModelDisplayName = (
  providerId: NativeRequestCaptureProviderId,
  modelId: NativeRequestCaptureModelId
): string => {
  if (providerId === "claude") {
    return (
      CLAUDE_MODEL_ALIASES.find((model) => model.alias === modelId)
        ?.displayName ?? modelId
    );
  }
  return (
    CODEX_SETTINGS_MODELS.find((model) => model.id === modelId)?.displayName ??
    modelId
  );
};

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
  readonly defaultModels: NativeRequestCaptureModels;
  readonly onCapture: (
    providerId: NativeRequestCaptureProviderId,
    modelId: NativeRequestCaptureModelId
  ) => void;
  readonly state: NativeRequestCaptureState;
}

const NativeRequestCaptureCard = ({
  defaultModels,
  state,
  onCapture,
}: NativeRequestCaptureCardProps) => {
  const { t } = useLocalization();
  const isRunning = state.status === "running";
  const [selectedModels, setSelectedModels] =
    useState<NativeRequestCaptureModels>(defaultModels);

  useEffect(() => {
    setSelectedModels({
      claude: defaultModels.claude,
      codex: defaultModels.codex,
    });
  }, [defaultModels.claude, defaultModels.codex]);
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
  const captureRows = [
    {
      providerId: "claude" as const,
      models: CLAUDE_MODEL_ALIASES.map((model) => ({
        id: model.alias,
        label: model.displayName,
      })),
      selectedModelId: selectedModels.claude,
      buttonLabel: t(
        UI_LABELS_CATEGORY,
        "settings.native_capture.capture_claude",
        "Capture Claude Native Request"
      ),
    },
    {
      providerId: "codex" as const,
      models: CODEX_SETTINGS_MODELS.map((model) => ({
        id: model.id,
        label: model.displayName,
      })),
      selectedModelId: selectedModels.codex,
      buttonLabel: t(
        UI_LABELS_CATEGORY,
        "settings.native_capture.capture_codex",
        "Capture Codex Native Request"
      ),
    },
  ] satisfies readonly {
    readonly buttonLabel: string;
    readonly models: readonly {
      readonly id: NativeRequestCaptureModelId;
      readonly label: string;
    }[];
    readonly providerId: NativeRequestCaptureProviderId;
    readonly selectedModelId: NativeRequestCaptureModelId;
  }[];

  return (
    <SettingsCard title={title}>
      <div style={buttonRowStyles}>
        {captureRows.map((row) => (
          <div key={row.providerId} style={providerRowStyles}>
            <div style={providerLabelStyles}>
              {getProviderLabel(row.providerId)}
            </div>
            <fieldset style={modelRowStyles}>
              <legend style={visuallyHiddenStyles}>
                {getProviderLabel(row.providerId)} model
              </legend>
              {row.models.map((model) => {
                const isSelected = model.id === row.selectedModelId;
                return (
                  <button
                    aria-pressed={isSelected}
                    disabled={isRunning}
                    key={model.id}
                    onClick={() => {
                      setSelectedModels((current) =>
                        row.providerId === "claude"
                          ? {
                              ...current,
                              claude: model.id as ClaudeModelAliasId,
                            }
                          : { ...current, codex: model.id as CodexModelId }
                      );
                    }}
                    style={
                      isSelected ? activeModelButtonStyles : modelButtonStyles
                    }
                    type="button"
                  >
                    {model.label}
                  </button>
                );
              })}
            </fieldset>
            <button
              aria-busy={isRunning}
              aria-label={`${row.buttonLabel}: ${getModelDisplayName(
                row.providerId,
                row.selectedModelId
              )}`}
              disabled={isRunning}
              onClick={() => onCapture(row.providerId, row.selectedModelId)}
              style={isRunning ? disabledButtonStyles : buttonStyles}
              type="button"
            >
              {row.buttonLabel}
            </button>
          </div>
        ))}
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
