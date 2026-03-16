import type React from "react";
import { useCallback, useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import {
  StageArtifactPendingLayout,
  StageArtifactStateView,
} from "../shared/stage-artifact-stage-panel";

const validateModuleMapContent = (content: string): string | null => {
  if (content.trim().length === 0) {
    return "Файл пустой.";
  }
  return null;
};

const startService = new WorkflowStepStartService();

export const DiagramModulesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const artifactPath = useMemo(
    () => `.codeai-hub/${props.workspaceSlug}/diagram_modules/module-map.md`,
    [props.workspaceSlug]
  );
  const { status, content, error } = useStageArtifactLoader({
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
    artifactPath,
    stageLabel: "Diagram Modules",
  });

  const validationError = useMemo(
    () => (content ? validateModuleMapContent(content) : null),
    [content]
  );

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

  const stateView = (
    <StageArtifactStateView
      artifactPath={artifactPath}
      content={content}
      displayFileName="module-map.md"
      error={error}
      errorFallback="Не удалось загрузить Diagram Modules."
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
      title="Diagram Modules"
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          Здесь отображается canonical module map: какие модули существуют, как они сгруппированы и какие связи между ними зафиксированы в Markdown DSL.
        </div>
        <div>
          Вы можете править <code>module-map.md</code> вручную в редакторе или через агента. Visual shell появится в следующем этапе, но canonical artifact уже здесь.
        </div>
        <div>Любые изменения пометят следующие шаги как требующие синхронизации.</div>
      </div>
    </StageArtifactPendingLayout>
  );
};
