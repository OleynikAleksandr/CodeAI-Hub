import type React from "react";
import { useCallback, useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { StageArtifactContentView } from "../shared/stage-artifact-content-view";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import type { ArtifactHeaderMode } from "../layout/stage-artifact-mode";
import { QualityGatesHelp } from "./quality-gates-help";

const QUALITY_GATES_TITLE_RE = /^#\s+Quality Gates Baseline\b/m;
const QUALITY_GATES_RESEARCH_TITLE_RE = /^#\s+Quality Gates Research\b/m;
const startService = new WorkflowStepStartService();

const validateQualityGatesMarkdown = (
  content: string,
  headerMode: ArtifactHeaderMode
): string | null => {
  if (content.trim().length === 0) {
    return "Файл пустой.";
  }
  if (headerMode === "research") {
    return QUALITY_GATES_RESEARCH_TITLE_RE.test(content)
      ? null
      : "Нет заголовка `# Quality Gates Research`.";
  }
  if (!QUALITY_GATES_TITLE_RE.test(content)) {
    return "Нет заголовка `# Quality Gates Baseline`.";
  }
  return null;
};

const resolveQualityGatesArtifact = (
  workspaceSlug: string,
  headerMode: ArtifactHeaderMode
): { readonly displayFileName: string; readonly path: string } => {
  if (headerMode === "research") {
    return {
      displayFileName: "quality-gates-research.md",
      path: `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates-research.md`,
    };
  }
  return {
    displayFileName: "quality-gates.md",
    path: `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.md`,
  };
};

export const QualityGatesPanel: React.FC<{
  readonly headerMode?: ArtifactHeaderMode;
  readonly refreshKey?: number;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const headerMode = props.headerMode ?? "contract";
  const artifactPath = useMemo(
    () => resolveQualityGatesArtifact(props.workspaceSlug, headerMode),
    [headerMode, props.workspaceSlug]
  );
  const { status, content, error } = useStageArtifactLoader({
    artifactPath: artifactPath.path,
    stageLabel: "Quality Gates Baseline",
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
  });
  const validationError = useMemo(
    () => (content ? validateQualityGatesMarkdown(content, headerMode) : null),
    [content, headerMode]
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
        artifactPath={artifactPath.path}
        content={content}
        displayFileName={artifactPath.displayFileName}
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
