import type React from "react";

interface DescriptionArtifactHeaderToggleProps {
  readonly mode: "artifacts" | "help";
  readonly onModeChange: (mode: "artifacts" | "help") => void;
}

export const DescriptionArtifactHeaderToggle: React.FC<
  DescriptionArtifactHeaderToggleProps
> = ({ mode, onModeChange }) => (
  <div
    style={{
      alignItems: "center",
      display: "flex",
      justifyContent: "space-between",
      width: "100%",
    }}
  >
    <span>Description</span>
    <div style={{ display: "inline-flex", gap: 6 }}>
      <button
        aria-pressed={mode === "artifacts"}
        onClick={() => onModeChange("artifacts")}
        style={{
          background: mode === "artifacts" ? "rgba(66, 201, 162, 0.16)" : "transparent",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 6,
          color: "inherit",
          cursor: "pointer",
          fontSize: 11,
          padding: "3px 8px",
        }}
        type="button"
      >
        Artifacts
      </button>
      <button
        aria-pressed={mode === "help"}
        onClick={() => onModeChange("help")}
        style={{
          background: mode === "help" ? "rgba(66, 201, 162, 0.16)" : "transparent",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 6,
          color: "inherit",
          cursor: "pointer",
          fontSize: 11,
          padding: "3px 8px",
        }}
        type="button"
      >
        Help
      </button>
    </div>
  </div>
);
