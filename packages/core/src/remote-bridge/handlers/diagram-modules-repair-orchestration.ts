import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { injectDiagramModulesRepairTaskPair } from "../../managed-workspace/managed-diagram-modules-plan-mutator";
import type { Logger } from "../../telemetry/logger";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import { writeDiagramModulesRepairAttemptEvidence } from "./diagram-modules-repair-attempt-evidence";
import type { ManagedGitStatus } from "./managed-git-stage-gate";

const DIAGRAM_MODULES_PLAN_PATH =
  "doc/TODO/stages/diagram-modules/todo-plan.md";
const REPAIR_TASK_ID_RE = /^diagram-modules\..*\.repair\d+\.task\d+$/u;
const STATE_BLOCK_RE =
  /<!-- codeai-plan-state:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- codeai-plan-state:end -->/u;

interface ActivePlanState {
  readonly currentTaskId: string;
}

export interface DiagramModulesRepairOrchestrationResult {
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

const isRepairPending = (
  progress: DiagramModulesProgressSnapshot | null
): progress is DiagramModulesProgressSnapshot =>
  progress?.activeSubturn?.status === "repair_pending";

const readTargetArtifactPath = (
  progress: DiagramModulesProgressSnapshot
): string =>
  progress.lastValidation?.expectedArtifactPath ??
  progress.expectedArtifactPath ??
  "";

const readTargetPartId = (
  progress: DiagramModulesProgressSnapshot
): string | null =>
  progress.activeSubturn?.kind === "product_part"
    ? progress.activeSubturn.partId
    : null;

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

export const runDiagramModulesRepairOrchestration = async (params: {
  readonly logger: Logger;
  readonly managedGitStatus: ManagedGitStatus;
  readonly progress: DiagramModulesProgressSnapshot | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DiagramModulesRepairOrchestrationResult> => {
  if (!isRepairPending(params.progress)) {
    return { status: "noop" };
  }
  const planPath = path.join(params.workspaceRoot, DIAGRAM_MODULES_PLAN_PATH);
  const planText = await readFile(planPath, "utf8").catch(() => null);
  if (!planText) {
    return { status: "noop" };
  }
  const activePlan = readActivePlanState(planText);
  if (!activePlan) {
    return { status: "noop" };
  }
  const targetArtifactPath = readTargetArtifactPath(params.progress);
  const validator = params.progress.lastValidation?.validator ?? "unknown";
  const diagnostics = params.progress.lastValidation?.diagnostics ?? [];
  const activeSubturn = params.progress.activeSubturn;
  if (!activeSubturn) {
    return { status: "noop" };
  }

  if (!isRepairTask(activePlan.currentTaskId)) {
    const injection = injectDiagramModulesRepairTaskPair({
      diagnostics,
      partId: readTargetPartId(params.progress),
      planText,
      targetArtifactPath,
      targetKind: activeSubturn.kind === "index" ? "index" : "product_part",
      validator,
    });
    if (!injection) {
      return { status: "noop" };
    }
    await writeFile(planPath, injection.nextPlanText, "utf8");
    params.logger.info("Diagram Modules repair task injected", {
      repairTaskId: injection.nextCurrentTaskId,
      targetArtifactPath,
      workspaceSlug: params.workspaceSlug,
    });
    return {
      injectedRepairTaskId: injection.nextCurrentTaskId,
      status: "injected",
    };
  }

  const evidence = await writeDiagramModulesRepairAttemptEvidence({
    diagnostics,
    outcome: resolveEvidenceOutcome({
      dirtyFiles: params.managedGitStatus.dirtyByStage.diagram_modules,
      targetArtifactPath,
    }),
    repairTaskId: activePlan.currentTaskId,
    targetArtifactPath,
    validator,
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  params.logger.info("Diagram Modules repair attempt evidence written", {
    evidencePath: evidence.relativePath,
    repairTaskId: activePlan.currentTaskId,
    workspaceSlug: params.workspaceSlug,
  });
  return { evidencePath: evidence.relativePath, status: "evidence_written" };
};
