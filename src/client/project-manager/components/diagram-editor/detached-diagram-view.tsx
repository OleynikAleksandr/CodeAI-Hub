import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useDiagramLoader } from "./use-diagram-loader";
import { useDiagramPersistence } from "./use-diagram-persistence";
import { DiagramEditorShell } from "./diagram-editor-shell";
import type { DiagramFlowNode } from "./adapters/domain-model-to-react-flow.types";

type DetachedDiagramViewProps = {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
};

export const DetachedDiagramView: React.FC<DetachedDiagramViewProps> = ({
  workspacePath,
  workspaceSlug,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("pm:diagram:refresh", handler);
    return () => window.removeEventListener("pm:diagram:refresh", handler);
  }, []);

  const {
    status,
    projection,
    artifactPath,
    flowSidecarPath,
  } = useDiagramLoader({
    refreshKey,
    stage: "diagram_modules",
    workspacePath,
    workspaceSlug,
  });

  const { persistNodes } = useDiagramPersistence({
    artifactPath,
    flowSidecarPath,
    stage: "diagram_modules",
    workspacePath,
    workspaceSlug,
  });

  const handleNodesChange = useCallback(
    async (nodes: readonly DiagramFlowNode[]) => {
      if (!projection) return;
      await persistNodes({ nodes, revision: projection.revision });
    },
    [persistNodes, projection]
  );

  useEffect(() => {
    document.title = `Diagram Modules — ${workspaceSlug}`;
  }, [workspaceSlug]);

  if (status === "loading") {
    return <div style={placeholderStyle}>Loading diagram…</div>;
  }

  if (status === "missing" || status === "error" || !projection) {
    return (
      <div style={placeholderStyle}>
        {status === "missing"
          ? "No Diagram Modules artifact found for this workspace."
          : "Failed to load diagram."}
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      <DiagramEditorShell
        initialNodes={projection.nodes}
        onNodesChange={handleNodesChange}
        projection={projection}
        title="Diagram Modules"
      />
    </div>
  );
};

const rootStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  background: "var(--pm-bg, #0b111b)",
};

const placeholderStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--pm-text-muted, #8899aa)",
  fontSize: 14,
  background: "var(--pm-bg, #0b111b)",
};
