import type React from "react";

interface StageArtifactHeaderToggleProps {
  readonly mode: "artifacts" | "help";
  readonly onModeChange: (mode: "artifacts" | "help") => void;
  readonly title: string;
}

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
> = ({ mode, onModeChange, title }) => (
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
      <button
        aria-pressed={mode === "artifacts"}
        onClick={() => onModeChange("artifacts")}
        style={resolveToggleButtonStyle(mode === "artifacts")}
        type="button"
      >
        Artifacts
      </button>
      <button
        aria-pressed={mode === "help"}
        onClick={() => onModeChange("help")}
        style={resolveToggleButtonStyle(mode === "help")}
        type="button"
      >
        Help
      </button>
    </div>
  </div>
);
