import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { DiagramStagePanelScaffold } from "../diagram-editor/diagram-stage-panel-scaffold";
import { useDiagramLoader } from "../diagram-editor/use-diagram-loader";
import { useDiagramPersistence } from "../diagram-editor/use-diagram-persistence";
import { DiagramModulesHelp } from "./diagram-modules-help";

const startService = new WorkflowStepStartService();

export const DiagramModulesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly refreshKey?: number;
}> = (props) => {
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  useEffect(() => {
    const handler = () => setLocalRefreshKey((k) => k + 1);
    window.addEventListener("pm:diagram:refresh", handler);
    return () => window.removeEventListener("pm:diagram:refresh", handler);
  }, []);

  const combinedRefreshKey = (props.refreshKey ?? 0) + localRefreshKey;
  const indexArtifactPath = `.codeai-hub/${props.workspaceSlug}/diagram_modules/product-parts.index.md`;
  const {
    status,
    content,
    error,
    projection,
    artifactPath,
    flowSidecarPath,
  } =
    useDiagramLoader({
      refreshKey: combinedRefreshKey,
      stage: "diagram_modules",
      workspacePath: props.workspacePath,
      workspaceSlug: props.workspaceSlug,
    });
  const { persistNodes } = useDiagramPersistence({
    artifactPath,
    flowSidecarPath,
    stage: "diagram_modules",
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
  });

  const handleFixStart = useCallback(
    async (p: {
      readonly workspacePath: string;
      readonly workspaceSlug: string;
      readonly providerId: string;
    }): Promise<void> => {
      await startService.startDiagramModules({
        workspacePath: p.workspacePath,
        workspaceSlug: p.workspaceSlug,
        providerId: p.providerId as ProviderStackId,
      });
    },
    []
  );

  const visualProjection = status === "ready" ? projection : null;

  if (status === "missing") {
    return <DiagramModulesHelp />;
  }

  return (
    <DiagramStagePanelScaffold
      artifactFileName="product-parts.index.md"
      artifactPath={indexArtifactPath}
      children={null}
      conflicts={[]}
      content={content}
      error={error}
      initialNodes={projection?.nodes}
      introText="Artifacts show the staged Diagram Modules structure starting from `product-parts.index.md`. Use Source to inspect the index while runtime materializes `product-parts/<part-id>.md`."
      onDismissConflicts={() => {}}
      onNodesChange={async (nodes) => {
        if (!visualProjection) {
          return;
        }
        await persistNodes({ nodes, revision: visualProjection.revision });
      }}
      onStartFix={handleFixStart}
      pendingContent={<DiagramModulesHelp />}
      projection={visualProjection}
      status={status}
      title="Diagram Modules"
      workspacePath={props.workspacePath}
      workspaceSlug={props.workspaceSlug}
    />
  );
};
