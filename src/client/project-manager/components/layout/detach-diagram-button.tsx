import type React from "react";
import { useMemo } from "react";

const buttonStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 10px",
  borderRadius: 6,
  border: "1px solid var(--pm-border)",
  background: "transparent",
  color: "var(--pm-text-muted)",
  cursor: "pointer",
};

/**
 * Produces a Detach button element when activeTool is "Diagram Modules",
 * or undefined otherwise. Designed to slot into StageArtifactHeaderToggle.extraActions.
 */
export const useDetachDiagramButton = (
  activeTool: string | null,
  workspacePath: string | undefined,
  workspaceSlug: string | null
): React.ReactElement | undefined =>
  useMemo(() => {
    if (activeTool !== "Diagram Modules" || !workspacePath || !workspaceSlug) {
      return undefined;
    }
    const handleDetach = () => {
      const base = window.location.href.split("?")[0];
      const params = new URLSearchParams({
        mode: "detached-diagram",
        workspaceSlug,
        workspacePath,
      });
      window.open(`${base}?${params.toString()}`, "_blank", "popup");
    };
    return (
      <button type="button" onClick={handleDetach} style={buttonStyle}>
        Detach
      </button>
    );
  }, [activeTool, workspacePath, workspaceSlug]);
