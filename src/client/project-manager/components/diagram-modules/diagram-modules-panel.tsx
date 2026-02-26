import type React from "react";
import { useCallback, useMemo } from "react";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import { StageArtifactContentView } from "../shared/stage-artifact-content-view";

const MODULES_DIAGRAM_TITLE_RE = /^%%\s+Modules Diagram/m;
const MODULES_DIAGRAM_SUBGRAPH_RE = /subgraph\s+/g;

const validateModulesDiagramMermaid = (content: string): string | null => {
  if (content.trim().length === 0) {
    return "Файл пустой.";
  }
  if (!MODULES_DIAGRAM_TITLE_RE.test(content)) {
    return "Нет заголовка `%% Modules Diagram`.";
  }
  const subgraphMatches = content.match(MODULES_DIAGRAM_SUBGRAPH_RE);
  const subgraphCount = subgraphMatches?.length ?? 0;
  if (subgraphCount < 1) {
    return "Нужен минимум 1 subgraph.";
  }
  return null;
};

const startService = new WorkflowStepStartService();

export const DiagramModulesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const artifactPath = useMemo(
    () => `.codeai-hub/${props.workspaceSlug}/diagram_modules/modules-diagram.mmd`,
    [props.workspaceSlug]
  );
  const { status, content, error } = useStageArtifactLoader({
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
    artifactPath,
    stageLabel: "Diagram Modules",
  });

  const validationError = useMemo(
    () => (content ? validateModulesDiagramMermaid(content) : null),
    [content]
  );

  const handleFixStart = useCallback(
    (p: { readonly workspacePath: string; readonly workspaceSlug: string; readonly providerId: string }) =>
      startService.startDiagramModules(p),
    []
  );

  if (status === "ready" && content !== null) {
    return (
      <StageArtifactContentView
        artifactPath={artifactPath}
        content={content}
        displayFileName="modules-diagram.mmd"
        onFixStart={handleFixStart}
        validationError={validationError}
        workspacePath={props.workspacePath}
        workspaceSlug={props.workspaceSlug}
      />
    );
  }

  if (status === "error") {
    return <div className="pm-placeholder">{error ?? "Не удалось загрузить Diagram Modules."}</div>;
  }

  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>Diagram Modules</strong>
      </div>
      <div className="pm-placeholder" style={{ marginBottom: 12 }}>
        Ожидаем артефакт: <code>{artifactPath}</code>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          Здесь отображается Mermaid-диаграмма модулей: какие модули существуют, их зависимости и интерфейсы.
        </div>
        <div>
          Вы можете править <code>modules-diagram.mmd</code> вручную в редакторе или через агента (он проанализирует виртуальную симуляцию и построит граф модулей).
        </div>
        <div>Любые изменения пометят следующие шаги как требующие синхронизации.</div>
      </div>
    </div>
  );
};
