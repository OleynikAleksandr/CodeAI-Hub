import type React from "react";
import { useCallback, useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import {
  StageArtifactPendingLayout,
  StageArtifactStateView,
} from "../shared/stage-artifact-stage-panel";

const FACADES_GRAPH_TITLE_RE = /^%%\s+Facades Graph/m;
const FACADES_GRAPH_NODE_RE = /\w+\s*-->?\s*\w+/g;

const validateFacadesGraphMermaid = (content: string): string | null => {
  if (content.trim().length === 0) {
    return "Файл пустой.";
  }
  if (!FACADES_GRAPH_TITLE_RE.test(content)) {
    return "Нет заголовка `%% Facades Graph`.";
  }
  const edgeMatches = content.match(FACADES_GRAPH_NODE_RE);
  const edgeCount = edgeMatches?.length ?? 0;
  if (edgeCount < 1) {
    return "Нужна минимум 1 связь между узлами.";
  }
  return null;
};

const startService = new WorkflowStepStartService();

export const DiagramFacadesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const artifactPath = useMemo(
    () => `.codeai-hub/${props.workspaceSlug}/diagram_facades/facades-graph.mmd`,
    [props.workspaceSlug]
  );
  const { status, content, error } = useStageArtifactLoader({
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
    artifactPath,
    stageLabel: "Diagram Facades",
  });

  const validationError = useMemo(
    () => (content ? validateFacadesGraphMermaid(content) : null),
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
      displayFileName="facades-graph.mmd"
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
          Здесь отображается Mermaid-граф фасадов: точки входа каждого модуля, их публичные интерфейсы и связи между фасадами.
        </div>
        <div>
          Вы можете править <code>facades-graph.mmd</code> вручную в редакторе или через агента (он проанализирует диаграмму модулей и построит граф фасадов).
        </div>
        <div>Любые изменения пометят следующие шаги как требующие синхронизации.</div>
      </div>
    </StageArtifactPendingLayout>
  );
};
