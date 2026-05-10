import type React from "react";
import { useCallback, useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { StageArtifactContentView } from "../shared/stage-artifact-content-view";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import { ApplicationSkeletonAcceptContractButton } from "./application-skeleton-accept-contract-button";
import { ApplicationSkeletonHelp } from "./application-skeleton-help";

const APPLICATION_SKELETON_TITLE_RE = /^#\s+Application Skeleton\b/m;
const startService = new WorkflowStepStartService();

const validateApplicationSkeletonMarkdown = (content: string): string | null => {
  if (content.trim().length === 0) {
    return "Файл пустой.";
  }
  if (!APPLICATION_SKELETON_TITLE_RE.test(content)) {
    return "Нет заголовка `# Application Skeleton`.";
  }
  return null;
};

export const ApplicationSkeletonPanel: React.FC<{
  readonly applicationSkeletonSessionId?: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const artifactPath = useMemo(
    () =>
      `.codeai-hub/${props.workspaceSlug}/application_skeleton/application-skeleton.md`,
    [props.workspaceSlug]
  );
  const { status, content, error } = useStageArtifactLoader({
    artifactPath,
    stageLabel: "Application Skeleton",
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
  });
  const validationError = useMemo(
    () => (content ? validateApplicationSkeletonMarkdown(content) : null),
    [content]
  );
  const handleFixStart = useCallback(
    async (p: {
      readonly workspacePath: string;
      readonly workspaceSlug: string;
      readonly providerId: string;
    }): Promise<void> => {
      await startService.startApplicationSkeleton({
        providerId: p.providerId as ProviderStackId,
        workspacePath: p.workspacePath,
        workspaceSlug: p.workspaceSlug,
      });
    },
    []
  );

  if (status === "ready" && content !== null) {
    const disabledReason = validationError
      ? `Application Skeleton draft is not Core-clean: ${validationError}`
      : null;
    return (
      <>
        <StageArtifactContentView
          artifactPath={artifactPath}
          content={content}
          displayFileName="application-skeleton.md"
          onFixStart={handleFixStart}
          validationError={validationError}
          workspacePath={props.workspacePath}
          workspaceSlug={props.workspaceSlug}
        />
        <ApplicationSkeletonAcceptContractButton
          disabledReason={disabledReason}
          sessionId={props.applicationSkeletonSessionId ?? null}
        />
      </>
    );
  }
  if (status === "error") {
    return (
      <div className="pm-placeholder">
        {error ?? "Не удалось загрузить Application Skeleton."}
      </div>
    );
  }
  return <ApplicationSkeletonHelp />;
};
