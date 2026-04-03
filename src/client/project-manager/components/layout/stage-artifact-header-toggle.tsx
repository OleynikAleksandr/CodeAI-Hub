import type React from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import type { ArtifactHeaderMode } from "./stage-artifact-mode";

interface StageArtifactHeaderToggleProps {
  readonly availableModes: readonly ArtifactHeaderMode[];
  readonly extraActions?: React.ReactNode;
  readonly hint?: string;
  readonly mode: ArtifactHeaderMode;
  readonly onModeChange: (mode: ArtifactHeaderMode) => void;
  readonly title: string;
}

const UI_LABELS_CATEGORY = "ui_interface";

const resolveToggleButtonStyle = (
  isActive: boolean
): React.CSSProperties => ({
  background: isActive ? "rgba(66, 201, 162, 0.16)" : "transparent",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 6,
  color: "inherit",
  cursor: "pointer",
  fontSize: 11,
  padding: "3px 8px",
});

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255, 255, 255, 0.3)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const StageArtifactHeaderToggle: React.FC<
  StageArtifactHeaderToggleProps
> = ({ availableModes, extraActions, hint, mode, onModeChange, title }) => {
  const { t } = useLocalization();

  const resolveModeLabel = (nextMode: ArtifactHeaderMode): string => {
    switch (nextMode) {
      case "artifacts":
        return t(
          UI_LABELS_CATEGORY,
          "pm.stage_artifact_header.mode.artifacts",
          "Artifacts"
        );
      case "help":
        return t(UI_LABELS_CATEGORY, "pm.stage_artifact_header.mode.help", "Help");
      case "source":
        return t(
          UI_LABELS_CATEGORY,
          "pm.stage_artifact_header.mode.source",
          "Source"
        );
    }
  };

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
        gap: 8,
      }}
    >
      <span style={{ flexShrink: 0 }}>{title}</span>
      {hint ? <span style={hintStyle}>{hint}</span> : null}
      <div style={{ display: "inline-flex", gap: 6, flexShrink: 0 }}>
        {extraActions}
        {availableModes.map((nextMode) => (
          <button
            key={nextMode}
            aria-pressed={mode === nextMode}
            onClick={() => onModeChange(nextMode)}
            style={resolveToggleButtonStyle(mode === nextMode)}
            type="button"
          >
            {resolveModeLabel(nextMode)}
          </button>
        ))}
      </div>
    </div>
  );
};
