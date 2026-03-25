import type React from "react";
import type { ArtifactHeaderMode } from "./stage-artifact-mode";

interface StageArtifactHeaderToggleProps {
  readonly availableModes: readonly ArtifactHeaderMode[];
  readonly extraActions?: React.ReactNode;
  readonly mode: ArtifactHeaderMode;
  readonly onModeChange: (mode: ArtifactHeaderMode) => void;
  readonly title: string;
}

const MODE_LABELS: Readonly<Record<ArtifactHeaderMode, string>> = {
  artifacts: "Artifacts",
  help: "Help",
  source: "Source",
};

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

export const StageArtifactHeaderToggle: React.FC<
  StageArtifactHeaderToggleProps
> = ({ availableModes, extraActions, mode, onModeChange, title }) => (
  <div
    style={{
      alignItems: "center",
      display: "flex",
      justifyContent: "space-between",
      width: "100%",
    }}
  >
    <span>{title}</span>
    <div style={{ display: "inline-flex", gap: 6 }}>
      {extraActions}
      {availableModes.map((nextMode) => (
        <button
          key={nextMode}
          aria-pressed={mode === nextMode}
          onClick={() => onModeChange(nextMode)}
          style={resolveToggleButtonStyle(mode === nextMode)}
          type="button"
        >
          {MODE_LABELS[nextMode]}
        </button>
      ))}
    </div>
  </div>
);
