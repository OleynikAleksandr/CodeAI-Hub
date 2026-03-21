import type React from "react";
import { useCallback } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { DiagramStagePanelScaffold } from "../diagram-editor/diagram-stage-panel-scaffold";
import { useDiagramLoader } from "../diagram-editor/use-diagram-loader";
import { useDiagramPersistence } from "../diagram-editor/use-diagram-persistence";
import { DiagramFacadesHelp } from "./diagram-facades-help";

const startService = new WorkflowStepStartService();

export const DiagramFacadesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly refreshKey?: number;
}> = (props) => {
  const {
    status,
    content,
    error,
    projection,
    artifactPath,
    flowSidecarPath,
  } = useDiagramLoader({
    refreshKey: props.refreshKey,
    stage: "diagram_facades",
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
  });
  const { persistNodes } = useDiagramPersistence({
    artifactPath,
    flowSidecarPath,
    stage: "diagram_facades",
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
  });

  const handleFixStart = useCallback(
    async (p: {
      readonly workspacePath: string;
      readonly workspaceSlug: string;
      readonly providerId: string;
    }): Promise<void> => {
      await startService.startDiagramFacades({
        workspacePath: p.workspacePath,
        workspaceSlug: p.workspaceSlug,
        providerId: p.providerId as ProviderStackId,
      });
    },
    []
  );

  const visualProjection = status === "ready" ? projection : null;

  if (status === "missing") {
    return <DiagramFacadesHelp />;
  }

  return (
    <DiagramStagePanelScaffold
      artifactFileName="facade-map.md"
      artifactPath={artifactPath}
      children={null}
      conflicts={[]}
      content={content}
      error={error}
      initialNodes={projection?.nodes}
      introText="Artifacts shows the visual facade diagram. Use Source for the canonical Markdown artifact."
      onDismissConflicts={() => {}}
      onNodesChange={async (nodes) => {
        if (!visualProjection) {
          return;
        }
        await persistNodes({ nodes, revision: visualProjection.revision });
      }}
      onStartFix={handleFixStart}
      pendingContent={<DiagramFacadesHelp />}
      projection={visualProjection}
      status={status}
      title="Diagram Facades"
      workspacePath={props.workspacePath}
      workspaceSlug={props.workspaceSlug}
    />
  );
};
