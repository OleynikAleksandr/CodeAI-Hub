import type React from "react";
import { useCallback } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { DiagramEditorShell } from "../diagram-editor/diagram-editor-shell";
import { useDiagramLoader } from "../diagram-editor/use-diagram-loader";
import { useDiagramPersistence } from "../diagram-editor/use-diagram-persistence";
import { StageArtifactFixButton } from "../shared/stage-artifact-fix-button";
import {
  StageArtifactPendingLayout,
} from "../shared/stage-artifact-stage-panel";

const startService = new WorkflowStepStartService();

export const DiagramFacadesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly refreshKey?: number;
}> = (props) => {
  const { status, content, error, projection, artifactPath, flowSidecarPath } =
    useDiagramLoader({
      refreshKey: props.refreshKey,
      stage: "diagram_facades",
      workspacePath: props.workspacePath,
      workspaceSlug: props.workspaceSlug,
    });
  const { saveState, persistNodes } = useDiagramPersistence({
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

  if (status === "loading") {
    return <div className="pm-placeholder">Загружаем Diagram Facades…</div>;
  }

  if (status === "error") {
    return (
      <div className="pm-details">
        <div style={{ display: "grid", gap: 12 }}>
          <div className="pm-placeholder">
            {error ?? "Не удалось загрузить Diagram Facades."}
          </div>
          <StageArtifactFixButton
            onStart={handleFixStart}
            workspacePath={props.workspacePath}
            workspaceSlug={props.workspaceSlug}
          />
          {content ? (
            <div style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
              Артефакт загружен, но не прошёл parse/validation check:
              <code style={{ marginLeft: 6 }}>facade-map.md</code>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (status === "ready" && projection) {
    return (
      <div className="pm-details" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <strong>Diagram Facades</strong>
          <span style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
            <code>facade-map.md</code> рендерится в read-only visual shell;
            layout сохраняется в <code>facade-map.flow.json</code>.
          </span>
        </div>
        <DiagramEditorShell
          initialNodes={projection.nodes}
          onNodesChange={async (nodes) => {
            await persistNodes({ nodes, revision: projection.revision });
          }}
          projection={projection}
          saveState={saveState}
          subtitle={`${artifactPath} -> ${flowSidecarPath}`}
          title="Diagram Facades"
        />
      </div>
    );
  }

  return (
    <StageArtifactPendingLayout
      artifactPath={artifactPath}
      title="Diagram Facades"
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          Здесь отображается canonical facade map: фасады модулей, типы взаимодействий и зависимости между ними в Markdown DSL.
        </div>
        <div>
          После появления <code>facade-map.md</code> панель автоматически переключится на visual shell и создаст sidecar <code>facade-map.flow.json</code> для layout.
        </div>
        <div>Любые изменения пометят следующие шаги как требующие синхронизации.</div>
        <StageArtifactFixButton
          onStart={handleFixStart}
          workspacePath={props.workspacePath}
          workspaceSlug={props.workspaceSlug}
        />
      </div>
    </StageArtifactPendingLayout>
  );
};
