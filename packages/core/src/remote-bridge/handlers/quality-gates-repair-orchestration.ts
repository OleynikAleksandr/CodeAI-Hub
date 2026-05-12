import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { injectQualityGatesTaskPair } from "../../managed-workspace/managed-quality-gates-plan-mutator";
import type { Logger } from "../../telemetry/logger";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import type {
  QualityGatesGuardDecision,
  QualityGatesPhase,
} from "./quality-gates-contract-guard";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

const QUALITY_GATES_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";
const REPAIR_TASK_ID_RE = /^quality-gates\..*\.repair\d+\.task\d+$/u;
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

export interface QualityGatesRepairOrchestrationResult {
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

const phaseToRepairTarget = (phase: QualityGatesPhase): string => {
  if (phase === "phase_1_draft") {
    return "phase1.draft";
  }
  if (phase === "phase_2_review") {
    return "phase2.review";
  }
  if (phase === "phase_2_accepted") {
    return "phase2.acceptance";
  }
  if (phase === "phase_3_integration") {
    return "phase3.integration";
  }
  return "phase4.user-return";
};

const qualityGatesArtifactPath = (
  workspaceSlug: string,
  fileName: string
): string => `.codeai-hub/${workspaceSlug}/quality_gates/${fileName}`;

const resolveRepairTarget = (params: {
  readonly decision: QualityGatesGuardDecision;
  readonly phase: QualityGatesPhase;
  readonly progress: QualityGatesProgressSnapshot | null;
  readonly workspaceSlug: string;
}): RepairTarget | null => {
  const targetPhase = phaseToRepairTarget(params.phase);
  if (params.decision.kind === "repair_no_progress") {
    return {
      diagnostics: ["turn ended without owned Quality Gates diff"],
      targetArtifactPath: `.codeai-hub/${params.workspaceSlug}/quality_gates`,
      targetPhase,
      targetSummary:
        "Core rejected the Quality Gates turn because no owned draft diff was produced",
      validator: "quality_gates.contract",
    };
  }
  if (params.decision.kind === "repair_invalid_draft") {
    return {
      diagnostics: params.decision.details,
      targetArtifactPath: qualityGatesArtifactPath(
        params.workspaceSlug,
        "quality-gates.json"
      ),
      targetPhase,
      targetSummary:
        "Core rejected the Quality Gates draft as structurally invalid",
      validator: "quality_gates.contract",
    };
  }
  if (params.decision.kind === "repair_premature_integration") {
    return {
      diagnostics: params.decision.blockedPaths,
      targetArtifactPath:
        params.decision.blockedPaths[0] ??
        qualityGatesArtifactPath(params.workspaceSlug, "quality-gates.json"),
      targetPhase,
      targetSummary:
        "Core rejected premature Quality Gates integration before acceptance",
      validator: "quality_gates.premature_integration",
    };
  }
  if (params.progress?.validationErrors.length) {
    return {
      diagnostics: params.progress.validationErrors,
      targetArtifactPath: qualityGatesArtifactPath(
        params.workspaceSlug,
        "quality-gates.json"
      ),
      targetPhase,
      targetSummary: "Core rejected the Quality Gates integration as invalid",
      validator: "quality_gates.integration",
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

const buildEvidenceFileName = (repairTaskId: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const taskSlug = repairTaskId.replace(/[^a-z0-9]+/giu, "-");
  return `attempt-${timestamp}-${taskSlug}.json`;
};

interface EvidenceWriteResult {
  readonly absolutePath: string;
  readonly relativePath: string;
}

const writeRepairAttemptEvidence = async (params: {
  readonly diagnostics: readonly string[];
  readonly outcome: "no_accepted_diff" | "still_invalid";
  readonly repairTaskId: string;
  readonly targetArtifactPath: string;
  readonly targetPhase: string;
  readonly validator: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<EvidenceWriteResult> => {
  const relativeDir = `.codeai-hub/${params.workspaceSlug}/quality_gates/attempts`;
  const fileName = buildEvidenceFileName(params.repairTaskId);
  const relativePath = `${relativeDir}/${fileName}`;
  const absoluteDir = path.join(params.workspaceRoot, relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, fileName);
  const payload = {
    schema: "codeai-quality-gates-repair-attempt-v1",
    diagnostics: params.diagnostics,
    outcome: params.outcome,
    recordedAt: new Date().toISOString(),
    repairTaskId: params.repairTaskId,
    targetArtifactPath: params.targetArtifactPath,
    targetPhase: params.targetPhase,
    validator: params.validator,
    workspaceSlug: params.workspaceSlug,
  };
  await writeFile(
    absolutePath,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );
  return { absolutePath, relativePath };
};

export const runQualityGatesRepairOrchestration = async (params: {
  readonly decision: QualityGatesGuardDecision;
  readonly logger: Logger;
  readonly managedGitStatus: ManagedGitStatus;
  readonly phase: QualityGatesPhase;
  readonly progress: QualityGatesProgressSnapshot | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<QualityGatesRepairOrchestrationResult> => {
  const repairTarget = resolveRepairTarget({
    decision: params.decision,
    phase: params.phase,
    progress: params.progress,
    workspaceSlug: params.workspaceSlug,
  });
  if (!repairTarget) {
    return { status: "noop" };
  }
  const planPath = path.join(params.workspaceRoot, QUALITY_GATES_PLAN_PATH);
  const planText = await readFile(planPath, "utf8").catch(() => null);
  if (!planText) {
    return { status: "noop" };
  }
  const activePlan = readActivePlanState(planText);
  if (!activePlan) {
    return { status: "noop" };
  }

  if (!isRepairTask(activePlan.currentTaskId)) {
    const injection = injectQualityGatesTaskPair({
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
    params.logger.info("Quality Gates repair task injected", {
      repairTaskId: injection.nextCurrentTaskId,
      targetArtifactPath: repairTarget.targetArtifactPath,
      workspaceSlug: params.workspaceSlug,
    });
    return {
      injectedRepairTaskId: injection.nextCurrentTaskId,
      status: "injected",
    };
  }

  const evidence = await writeRepairAttemptEvidence({
    diagnostics: repairTarget.diagnostics,
    outcome: resolveEvidenceOutcome({
      dirtyFiles: params.managedGitStatus.dirtyByStage.quality_gates,
      targetArtifactPath: repairTarget.targetArtifactPath,
    }),
    repairTaskId: activePlan.currentTaskId,
    targetArtifactPath: repairTarget.targetArtifactPath,
    targetPhase: repairTarget.targetPhase,
    validator: repairTarget.validator,
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  params.logger.info("Quality Gates repair attempt evidence written", {
    evidencePath: evidence.relativePath,
    repairTaskId: activePlan.currentTaskId,
    workspaceSlug: params.workspaceSlug,
  });
  return { evidencePath: evidence.relativePath, status: "evidence_written" };
};
