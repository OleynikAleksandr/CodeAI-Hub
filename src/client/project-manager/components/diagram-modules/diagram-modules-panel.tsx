import type React from "react";
import { useCallback } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { DiagramStagePanelScaffold } from "../diagram-editor/diagram-stage-panel-scaffold";
import { useDiagramLoader } from "../diagram-editor/use-diagram-loader";
import { useDiagramPersistence } from "../diagram-editor/use-diagram-persistence";

const startService = new WorkflowStepStartService();

export const DiagramModulesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly refreshKey?: number;
}> = (props) => {
  const inventoryArtifactPath = `.codeai-hub/${props.workspaceSlug}/diagram_modules/module-inventory.md`;
  const {
    status,
    content,
    error,
    projection,
    artifactPath,
    flowSidecarPath,
  } =
    useDiagramLoader({
      refreshKey: props.refreshKey,
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

  return (
    <DiagramStagePanelScaffold
      artifactFileName="module-inventory.md"
      artifactPath={inventoryArtifactPath}
      children={null}
      conflicts={[]}
      content={content}
      error={error}
      initialNodes={projection?.nodes}
      introText="Artifacts shows the derived visual module map. Use Source to review module-inventory.md before the diagram is rendered."
      onDismissConflicts={() => {}}
      onNodesChange={async (nodes) => {
        if (!visualProjection) {
          return;
        }
        await persistNodes({ nodes, revision: visualProjection.revision });
      }}
      onStartFix={handleFixStart}
      pendingContent={
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            Здесь отображается visual module diagram, собранная из
            <code>module-inventory.md</code>.
          </div>
          <div>
            Сначала согласуйте самостоятельные части продукта, кластеры,
            состав модулей и простые связи в <code>Source</code>, затем
            диаграмма станет доступна в <code>Artifacts</code>.
          </div>
          <div>
            Visual surface строится runtime напрямую из согласованного
            <code>module-inventory.md</code> и показывает ownership hierarchy
            <code>Product Part -&gt; Cluster -&gt; Module</code> без отдельного
            raw map файла в workspace.
          </div>
        </div>
      }
      projection={visualProjection}
      status={status}
      title="Diagram Modules"
      workspacePath={props.workspacePath}
      workspaceSlug={props.workspaceSlug}
    />
  );
};
