import type React from "react";
import { useCallback, useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import { StageArtifactContentView } from "../shared/stage-artifact-content-view";

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

  if (status === "ready" && content !== null) {
    return (
      <StageArtifactContentView
        artifactPath={artifactPath}
        content={content}
        displayFileName="facades-graph.mmd"
        onFixStart={handleFixStart}
        validationError={validationError}
        workspacePath={props.workspacePath}
        workspaceSlug={props.workspaceSlug}
      />
    );
  }

  if (status === "error") {
    return <div className="pm-placeholder">{error ?? "Не удалось загрузить Diagram Facades."}</div>;
  }

  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>Diagram Facades</strong>
      </div>
      <div className="pm-placeholder" style={{ marginBottom: 12 }}>
        Ожидаем артефакт: <code>{artifactPath}</code>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          Здесь отображается Mermaid-граф фасадов: точки входа каждого модуля, их публичные интерфейсы и связи между фасадами.
        </div>
        <div>
          Вы можете править <code>facades-graph.mmd</code> вручную в редакторе или через агента (он проанализирует диаграмму модулей и построит граф фасадов).
        </div>
        <div>Любые изменения пометят следующие шаги как требующие синхронизации.</div>
      </div>
    </div>
  );
};
