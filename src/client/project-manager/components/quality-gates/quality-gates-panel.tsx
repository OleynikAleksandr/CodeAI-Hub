// Quality Gates panel surfaces the canonical Quality Gates Baseline artifact
// as read from the workspace; acceptance/integration state is owned by Core
// and surfaces only through the workflow-state snapshot (qualityGatesProgress).
// PM does not flip `accepted` or `integrated` locally. Accept-contract requests
// from PM go through `acceptQualityGatesContract` in `managed-stage-accept-
// contract-client.ts`, which posts to the Core HTTP endpoint.

import type React from "react";
import { useCallback, useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import { useWorkflowStateSnapshot } from "../../services/workflow-state-store";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { StageArtifactContentView } from "../shared/stage-artifact-content-view";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import { QualityGatesAcceptContractButton } from "./quality-gates-accept-contract-button";
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

const resolveLatestQualityGatesSessionId = (
  snapshot: WorkflowStateSnapshot | null
): string | null => {
  let best:
    | {
        readonly sessionId: string;
        readonly updatedAt: string;
      }
    | null = null;
  for (const chain of snapshot?.continuity.chains ?? []) {
    if (chain.stage !== "quality_gates") {
      continue;
    }
    const lastSegment = chain.segments.at(-1);
    if (!lastSegment) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = {
        sessionId: lastSegment.sessionId,
        updatedAt: chain.updatedAt,
      };
    }
  }
  return best?.sessionId ?? null;
};

const resolveQualityGatesDisabledReason = (params: {
  readonly progress: Record<string, unknown> | null | undefined;
  readonly sessionId: string | null;
  readonly validationError: string | null;
}): string | null => {
  if (params.validationError) {
    return `Quality Gates draft is not Core-clean: ${params.validationError}`;
  }
  if (params.progress?.integrated === true) {
    return "Quality Gates already advanced past contract review.";
  }
  if (params.progress?.accepted === true) {
    return "Quality Gates contract is already accepted. Waiting for Core continuation.";
  }
  const substep =
    typeof params.progress?.substep === "string" ? params.progress.substep : null;
  if (substep === "artifact") {
    return "Quality Gates draft contract is incomplete.";
  }
  if (
    substep !== null &&
    substep !== "awaiting_acceptance" &&
    substep !== "artifact"
  ) {
    return `Quality Gates is not waiting for contract acceptance yet (${substep}).`;
  }
  if (params.sessionId === null) {
    return "Resume the Quality Gates session before accepting the contract.";
  }
  return null;
};

export const QualityGatesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const { snapshot } = useWorkflowStateSnapshot();
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
  const sessionId = useMemo(
    () => resolveLatestQualityGatesSessionId(snapshot),
    [snapshot]
  );
  const qualityGatesProgress = snapshot?.qualityGatesProgress;
  const accepted = qualityGatesProgress?.accepted === true;
  const integrated = qualityGatesProgress?.integrated === true;
  const shouldRenderAcceptButton = !accepted && !integrated;
  const disabledReason = useMemo(
    () =>
      resolveQualityGatesDisabledReason({
        progress: qualityGatesProgress,
        sessionId,
        validationError,
      }),
    [qualityGatesProgress, sessionId, validationError]
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
      <>
        <StageArtifactContentView
          artifactPath={artifactPath}
          content={content}
          displayFileName="quality-gates.md"
          onFixStart={handleFixStart}
          validationError={validationError}
          workspacePath={props.workspacePath}
          workspaceSlug={props.workspaceSlug}
        />
        {shouldRenderAcceptButton ? (
          <QualityGatesAcceptContractButton
            disabledReason={disabledReason}
            sessionId={sessionId}
          />
        ) : null}
      </>
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
