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
      artifactFileName="module-map.md"
      artifactPath={artifactPath}
      children={null}
      conflicts={[]}
      content={content}
      error={error}
      initialNodes={projection?.nodes}
      introText="Artifacts shows the visual module map. Use Source for the canonical Markdown artifact."
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
            Здесь отображается visual module diagram. Canonical Markdown source
            доступен через вкладку <code>Source</code>.
          </div>
          <div>
            После появления <code>module-map.md</code> панель автоматически
            откроет diagram-first surface.
          </div>
          <div>
            Любые изменения пометят следующие шаги как требующие синхронизации.
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
