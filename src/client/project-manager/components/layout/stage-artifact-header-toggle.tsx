import type React from "react";
import type { ArtifactHeaderMode } from "./stage-artifact-mode";

interface StageArtifactHeaderToggleProps {
  readonly availableModes: readonly ArtifactHeaderMode[];
  readonly extraActions?: React.ReactNode;
  readonly hint?: string;
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

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255, 255, 255, 0.3)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const StageArtifactHeaderToggle: React.FC<
  StageArtifactHeaderToggleProps
> = ({ availableModes, extraActions, hint, mode, onModeChange, title }) => (
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
          {MODE_LABELS[nextMode]}
        </button>
      ))}
    </div>
  </div>
);
