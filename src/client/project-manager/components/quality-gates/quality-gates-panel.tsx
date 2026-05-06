import type React from "react";
import { useCallback, useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { StageArtifactContentView } from "../shared/stage-artifact-content-view";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import { QualityGatesHelp } from "./quality-gates-help";

const QUALITY_GATES_TITLE_RE = /^#\s+Quality Gates Baseline\b/m;
const startService = new WorkflowStepStartService();

const validateQualityGatesMarkdown = (content: string): string | null => {
  if (content.trim().length === 0) {
    return "Файл пустой.";
  }
  if (!QUALITY_GATES_TITLE_RE.test(content)) {
    return "Нет заголовка `# Quality Gates Baseline`.";
  }
  return null;
};

export const QualityGatesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const artifactPath = useMemo(
    () => `.codeai-hub/${props.workspaceSlug}/quality_gates/quality-gates.md`,
    [props.workspaceSlug]
  );
  const { status, content, error } = useStageArtifactLoader({
    artifactPath,
    stageLabel: "Quality Gates Baseline",
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
  });
  const validationError = useMemo(
    () => (content ? validateQualityGatesMarkdown(content) : null),
    [content]
  );
  const handleFixStart = useCallback(
    async (p: {
      readonly workspacePath: string;
      readonly workspaceSlug: string;
      readonly providerId: string;
    }): Promise<void> => {
      await startService.startQualityGates({
        providerId: p.providerId as ProviderStackId,
        workspacePath: p.workspacePath,
        workspaceSlug: p.workspaceSlug,
      });
    },
    []
  );

  if (status === "ready" && content !== null) {
    return (
      <StageArtifactContentView
        artifactPath={artifactPath}
        content={content}
        displayFileName="quality-gates.md"
        onFixStart={handleFixStart}
        validationError={validationError}
        workspacePath={props.workspacePath}
        workspaceSlug={props.workspaceSlug}
      />
    );
  }
  if (status === "error") {
    return (
      <div className="pm-placeholder">
        {error ?? "Не удалось загрузить Quality Gates Baseline."}
      </div>
    );
  }
  return <QualityGatesHelp />;
};
