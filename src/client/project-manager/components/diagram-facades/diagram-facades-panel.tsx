import type React from "react";
import { useCallback, useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import {
  StageArtifactPendingLayout,
  StageArtifactStateView,
} from "../shared/stage-artifact-stage-panel";

const validateFacadeMapContent = (content: string): string | null => {
  if (content.trim().length === 0) {
    return "Файл пустой.";
  }
  return null;
};

const startService = new WorkflowStepStartService();

export const DiagramFacadesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const artifactPath = useMemo(
    () => `.codeai-hub/${props.workspaceSlug}/diagram_facades/facade-map.md`,
    [props.workspaceSlug]
  );
  const { status, content, error } = useStageArtifactLoader({
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
    artifactPath,
    stageLabel: "Diagram Facades",
  });

  const validationError = useMemo(
    () => (content ? validateFacadeMapContent(content) : null),
    [content]
  );

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

  const stateView = (
    <StageArtifactStateView
      artifactPath={artifactPath}
      content={content}
      displayFileName="facade-map.md"
      error={error}
      errorFallback="Не удалось загрузить Diagram Facades."
      onFixStart={handleFixStart}
      status={status}
      validationError={validationError}
      workspacePath={props.workspacePath}
      workspaceSlug={props.workspaceSlug}
    />
  );
  if (stateView !== null) {
    return stateView;
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
          Вы можете править <code>facade-map.md</code> вручную в редакторе или через агента. Visual shell и layout sidecar будут добавлены следующим stream.
        </div>
        <div>Любые изменения пометят следующие шаги как требующие синхронизации.</div>
      </div>
    </StageArtifactPendingLayout>
  );
};
