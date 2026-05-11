import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { injectApplicationSkeletonTaskPair } from "../../managed-workspace/managed-application-skeleton-plan-mutator";
import type { Logger } from "../../telemetry/logger";
import type { ApplicationSkeletonGuardDecision } from "./application-skeleton-contract-guard";
import type { ApplicationSkeletonPhase } from "./application-skeleton-phase-state";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import { writeApplicationSkeletonRepairAttemptEvidence } from "./application-skeleton-repair-attempt-evidence";
import type { ManagedGitStatus } from "./managed-git-stage-gate";

const APPLICATION_SKELETON_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const REPAIR_TASK_ID_RE = /^application-skeleton\..*\.repair\d+\.task\d+$/u;
const STATE_BLOCK_RE =
  /<!-- codeai-plan-state:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- codeai-plan-state:end -->/u;

interface ActivePlanState {
  readonly currentTaskId: string;
}

interface RepairTarget {
  readonly diagnostics: readonly string[];
  readonly targetArtifactPath: string;
  readonly targetPhase: string;
  readonly targetSummary: string;
  readonly validator: string;
}

export interface ApplicationSkeletonRepairOrchestrationResult {
  readonly evidencePath?: string;
  readonly injectedRepairTaskId?: string;
  readonly status: "evidence_written" | "injected" | "noop";
}

const readActivePlanState = (planText: string): ActivePlanState | null => {
  const match = STATE_BLOCK_RE.exec(planText);
  if (!match) {
    return null;
  }
  try {
    const state = JSON.parse(match[1] ?? "{}") as Record<string, unknown>;
    return typeof state.currentTaskId === "string" && state.currentTaskId
      ? { currentTaskId: state.currentTaskId }
      : null;
  } catch {
    return null;
  }
};

const isRepairTask = (taskId: string): boolean =>
  REPAIR_TASK_ID_RE.test(taskId);

const phaseToRepairTarget = (phase: ApplicationSkeletonPhase): string => {
  if (phase === "phase_1_draft") {
    return "phase1.draft";
  }
  if (phase === "phase_2_review") {
    return "phase2.review";
  }
  if (phase === "phase_3_materialization") {
    return "phase3.materialize";
  }
  return "phase4.user-return";
};

const applicationSkeletonArtifactPath = (
  workspaceSlug: string,
  fileName: string
): string => `.codeai-hub/${workspaceSlug}/application_skeleton/${fileName}`;

const resolveRepairTarget = (params: {
  readonly decision: ApplicationSkeletonGuardDecision;
  readonly phase: ApplicationSkeletonPhase;
  readonly progress: ApplicationSkeletonProgressSnapshot | null;
  readonly workspaceSlug: string;
}): RepairTarget | null => {
  const targetPhase = phaseToRepairTarget(params.phase);
  if (params.decision.kind === "repair_no_progress") {
    return {
      diagnostics: ["turn ended without owned Application Skeleton diff"],
      targetArtifactPath: `.codeai-hub/${params.workspaceSlug}/application_skeleton`,
      targetPhase,
      targetSummary:
        "Core rejected the Application Skeleton turn because no owned draft diff was produced",
      validator: "application_skeleton.contract",
    };
  }
  if (params.decision.kind === "repair_invalid_draft") {
    return {
      diagnostics: params.decision.details,
      targetArtifactPath: applicationSkeletonArtifactPath(
        params.workspaceSlug,
        "application-skeleton-map.json"
      ),
      targetPhase,
      targetSummary:
        "Core rejected the Application Skeleton draft as structurally invalid",
      validator: "application_skeleton.contract",
    };
  }
  if (params.decision.kind === "repair_premature_materialization") {
    return {
      diagnostics: params.decision.blockedPaths,
      targetArtifactPath:
        params.decision.blockedPaths[0] ??
        applicationSkeletonArtifactPath(
          params.workspaceSlug,
          "application-skeleton-map.json"
        ),
      targetPhase,
      targetSummary:
        "Core rejected premature Application Skeleton materialization before acceptance",
      validator: "application_skeleton.premature_materialization",
    };
  }
  if (params.progress?.validationErrors.length) {
    return {
      diagnostics: params.progress.validationErrors,
      targetArtifactPath: applicationSkeletonArtifactPath(
        params.workspaceSlug,
        "application-skeleton-map.json"
      ),
      targetPhase,
      targetSummary:
        "Core rejected the Application Skeleton materialization as invalid",
      validator: "application_skeleton.materialization",
    };
  }
  return null;
};

const hasDirtyTargetArtifact = (params: {
  readonly dirtyFiles: readonly string[];
  readonly targetArtifactPath: string;
}): boolean =>
  Boolean(
    params.targetArtifactPath &&
      params.dirtyFiles.some(
        (file) =>
          file === params.targetArtifactPath ||
          params.targetArtifactPath.endsWith(file) ||
          file.endsWith(params.targetArtifactPath)
      )
  );

const resolveEvidenceOutcome = (params: {
  readonly dirtyFiles: readonly string[];
  readonly targetArtifactPath: string;
}): "no_accepted_diff" | "still_invalid" =>
  hasDirtyTargetArtifact(params) ? "still_invalid" : "no_accepted_diff";

export const runApplicationSkeletonRepairOrchestration = async (params: {
  readonly decision: ApplicationSkeletonGuardDecision;
  readonly logger: Logger;
  readonly managedGitStatus: ManagedGitStatus;
  readonly phase: ApplicationSkeletonPhase;
  readonly progress: ApplicationSkeletonProgressSnapshot | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ApplicationSkeletonRepairOrchestrationResult> => {
  const repairTarget = resolveRepairTarget({
    decision: params.decision,
    phase: params.phase,
    progress: params.progress,
    workspaceSlug: params.workspaceSlug,
  });
  if (!repairTarget) {
    return { status: "noop" };
  }
  const planPath = path.join(
    params.workspaceRoot,
    APPLICATION_SKELETON_PLAN_PATH
  );
  const planText = await readFile(planPath, "utf8").catch(() => null);
  if (!planText) {
    return { status: "noop" };
  }
  const activePlan = readActivePlanState(planText);
  if (!activePlan) {
    return { status: "noop" };
  }

  if (!isRepairTask(activePlan.currentTaskId)) {
    const injection = injectApplicationSkeletonTaskPair({
      diagnostics: repairTarget.diagnostics,
      kind: "repair",
      planText,
      targetPhase: repairTarget.targetPhase,
      targetSummary: repairTarget.targetSummary,
    });
    if (!injection) {
      return { status: "noop" };
    }
    await writeFile(planPath, injection.nextPlanText, "utf8");
    params.logger.info("Application Skeleton repair task injected", {
      repairTaskId: injection.nextCurrentTaskId,
      targetArtifactPath: repairTarget.targetArtifactPath,
      workspaceSlug: params.workspaceSlug,
    });
    return {
      injectedRepairTaskId: injection.nextCurrentTaskId,
      status: "injected",
    };
  }

  const evidence = await writeApplicationSkeletonRepairAttemptEvidence({
    diagnostics: repairTarget.diagnostics,
    outcome: resolveEvidenceOutcome({
      dirtyFiles: params.managedGitStatus.dirtyByStage.application_skeleton,
      targetArtifactPath: repairTarget.targetArtifactPath,
    }),
    repairTaskId: activePlan.currentTaskId,
    targetArtifactPath: repairTarget.targetArtifactPath,
    targetPhase: repairTarget.targetPhase,
    validator: repairTarget.validator,
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  params.logger.info("Application Skeleton repair attempt evidence written", {
    evidencePath: evidence.relativePath,
    repairTaskId: activePlan.currentTaskId,
    workspaceSlug: params.workspaceSlug,
  });
  return { evidencePath: evidence.relativePath, status: "evidence_written" };
};
