import type { CSSProperties } from "react";
import { memo, useMemo, useState } from "react";
import GeneralResponseModeFacade from "./general-response-mode/general-response-mode-facade";
import type { GeneralResponseMode } from "./general-response-mode/response-mode-copy";
import type { GeneralResponsePolicySettings } from "./general-response-mode/response-mode-state";
import SettingsCard from "./settings-card";
import {
  settingsColorTokens,
  settingsRadiusTokens,
  settingsTypographyTokens,
} from "./style-tokens";
import type { CoreControlState } from "./use-settings-state-support";

const wrapperStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const descriptionStyles: CSSProperties = {
  fontSize: "13px",
  color: "#bbbbbb",
  lineHeight: 1.4,
  margin: 0,
};

const coreControlHeight = "38px";

const buttonStyles: CSSProperties = {
  alignSelf: "flex-start",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  height: coreControlHeight,
  padding: "0 16px",
  borderRadius: settingsRadiusTokens.control,
  fontSize: settingsTypographyTokens.bodyFontSize,
  fontWeight: 600,
  lineHeight: 1,
  transition:
    "background-color 120ms ease, border-color 120ms ease, transform 120ms ease, opacity 120ms ease",
};

const controlsRowStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const statusStyles: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  boxSizing: "border-box",
  height: coreControlHeight,
  padding: "0 12px",
  borderRadius: settingsRadiusTokens.panel,
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  fontSize: settingsTypographyTokens.bodyFontSize,
  lineHeight: 1,
};

interface GeneralSettingsProps {
  readonly coreControl: CoreControlState;
  readonly onResponsePolicyModeChange: (mode: GeneralResponseMode) => void;
  readonly onRestartCore: () => void;
  readonly onStrictInstructionTextChange: (value: string) => void;
  readonly onStrictSchemaTextChange: (value: string) => void;
  readonly responsePolicy: GeneralResponsePolicySettings;
}

const GeneralSettings = (props: GeneralSettingsProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const resolvedButtonStyles = useMemo((): CSSProperties => {
    if (props.coreControl.busy) {
      return {
        ...buttonStyles,
        border: `1px solid ${settingsColorTokens.borderStrong}`,
        background: settingsColorTokens.borderStrong,
        color: settingsColorTokens.textMuted,
        cursor: "progress",
        opacity: 0.85,
      };
    }

    if (isPressed) {
      return {
        ...buttonStyles,
        border: "1px solid #0a4c78",
        background: "#0a4c78",
        color: settingsColorTokens.actionPrimaryText,
        cursor: "pointer",
        transform: "translateY(1px)",
      };
    }

    if (isHovered) {
      return {
        ...buttonStyles,
        border: "1px solid #1f7bb8",
        background: "#1177bb",
        color: settingsColorTokens.actionPrimaryText,
        cursor: "pointer",
      };
    }

    return {
      ...buttonStyles,
      border: `1px solid ${settingsColorTokens.actionPrimary}`,
      background: settingsColorTokens.actionPrimary,
      color: settingsColorTokens.actionPrimaryText,
      cursor: "pointer",
    };
  }, [isHovered, isPressed, props.coreControl.busy]);

  const resolvedStatusStyles = useMemo((): CSSProperties => {
    switch (props.coreControl.phase) {
      case "ready":
        return {
          ...statusStyles,
          border: "1px solid rgba(80, 160, 95, 0.55)",
          background: "rgba(80, 160, 95, 0.16)",
          color: "#a8ddb2",
        };
      case "error":
        return {
          ...statusStyles,
          border: "1px solid rgba(215, 101, 95, 0.55)",
          background: "rgba(215, 101, 95, 0.16)",
          color: "#f2b8b5",
        };
      case "stopping":
      case "waiting":
      case "starting":
        return {
          ...statusStyles,
          border: "1px solid rgba(190, 145, 75, 0.55)",
          background: "rgba(190, 145, 75, 0.16)",
          color: "#f1d39b",
        };
      default:
        return {
          ...statusStyles,
          color: settingsColorTokens.textMuted,
        };
    }
  }, [props.coreControl.phase]);

  return (
    <div style={wrapperStyles}>
      <GeneralResponseModeFacade
        onModeChange={props.onResponsePolicyModeChange}
        onStrictInstructionTextChange={props.onStrictInstructionTextChange}
        onStrictSchemaTextChange={props.onStrictSchemaTextChange}
        responsePolicy={props.responsePolicy}
      />
      <SettingsCard title="Core Controls">
        <p style={descriptionStyles}>
          Restart the CodeAI Hub core to trigger a fresh CLI detection cycle.
          Use this option after resolving CLI authentication or quota issues.
        </p>
        <div style={controlsRowStyles}>
          <button
            aria-busy={props.coreControl.busy}
            disabled={props.coreControl.busy}
            onBlur={() => setIsPressed(false)}
            onClick={props.onRestartCore}
            onMouseDown={() => setIsPressed(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false);
              setIsPressed(false);
            }}
            onMouseUp={() => setIsPressed(false)}
            style={resolvedButtonStyles}
            type="button"
          >
            {props.coreControl.busy ? "Restarting..." : "Restart Core"}
          </button>
          <div style={resolvedStatusStyles}>
            {props.coreControl.message ??
              "Core restart status will appear here."}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
};

export default memo(GeneralSettings);
