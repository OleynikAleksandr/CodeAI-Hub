import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { injectQualityGatesTaskPair } from "../../managed-workspace/managed-quality-gates-plan-mutator";
import type { ManagedAuditRecord } from "../../unified-session/storage";
import {
  type ManagedGitStatus,
  readManagedGitStatus,
} from "./managed-git-stage-gate";
import {
  type QualityGatesAcceptanceWriteResult,
  writeQualityGatesAcceptance,
} from "./quality-gates-acceptance-writer";
import {
  type QualityGatesProgressSnapshot,
  readQualityGatesProgressSnapshot,
} from "./quality-gates-progress";

const QUALITY_GATES_PLAN_PATH = "doc/TODO/stages/quality-gates/todo-plan.md";

export type QualityGatesAcceptContractDecision =
  | { readonly kind: "accepted"; readonly stage: "quality_gates" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly string[];
      readonly stage: "quality_gates";
    };

export interface QualityGatesAcceptContractSession {
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
  readonly workspacePath?: string | null;
}

export interface QualityGatesAcceptContractRunnerLogger {
  readonly info: (message: string, payload?: Record<string, unknown>) => void;
}

export interface QualityGatesAcceptContractRunnerDeps {
  readonly appendAudit: (
    sessionId: string,
    record: ManagedAuditRecord
  ) => Promise<void>;
  readonly handle: (sessionId: string) => void;
  readonly injectAcceptanceTaskPair?: (params: {
    readonly workspaceRoot: string;
  }) => Promise<boolean>;
  readonly logger: QualityGatesAcceptContractRunnerLogger;
  readonly markAccepted: (sessionId: string) => void;
  readonly readManagedGit?: (
    workspaceRoot: string,
    workspaceSlug: string
  ) => Promise<ManagedGitStatus>;
  readonly readQualityGatesProgress?: (params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }) => Promise<QualityGatesProgressSnapshot | null>;
  readonly resetRetryCounter: (sessionId: string) => void;
  readonly resolveSession: (
    sessionId: string
  ) => QualityGatesAcceptContractSession | null | undefined;
  readonly writeAcceptanceFlag?: (params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }) => Promise<QualityGatesAcceptanceWriteResult>;
}

export interface QualityGatesAcceptContractRunnerInput {
  readonly sessionId: string;
  readonly source: "ui-button" | "typed-fallback";
}

const evaluateAcceptDecision = (params: {
  readonly managedGitStatus: ManagedGitStatus;
  readonly progress: QualityGatesProgressSnapshot | null;
}): QualityGatesAcceptContractDecision => {
  const reasons: string[] = [];
  const { progress } = params;
  if (progress) {
    if (!(progress.markdownExists && progress.jsonExists)) {
      reasons.push(
        "Quality Gates draft artifacts are missing (markdown or json)."
      );
    }
    if (!progress.commandContractReady) {
      reasons.push(
        "Quality Gates contract has no parseable commands object keyed by gate id."
      );
    }
    if (progress.integrated) {
      reasons.push("Quality Gates is already integrated; acceptance is no-op.");
    }
    if (progress.acceptanceCommitted === true) {
      reasons.push(
        "Quality Gates acceptance is already committed; the contract is past the review phase."
      );
    }
    if (progress.validationErrors.length > 0) {
      reasons.push(
        `Quality Gates validator has ${progress.validationErrors.length} unresolved error(s).`
      );
    }
  } else {
    reasons.push("Quality Gates progress snapshot is unavailable.");
  }
  if (params.managedGitStatus.dirtyByStage.quality_gates.length > 0) {
    reasons.push(
      "Quality Gates has an uncommitted owned diff; the latest revision must be committed first."
    );
  }
  const outOfOwnerDirty =
    params.managedGitStatus.dirtyByStage.application_skeleton.length +
    params.managedGitStatus.dirtyByStage.diagram_modules.length;
  if (outOfOwnerDirty > 0) {
    reasons.push(
      "Other managed stages have unresolved dirty paths blocking the workspace."
    );
  }
  if (reasons.length > 0) {
    return { kind: "rejected", reasons, stage: "quality_gates" };
  }
  return { kind: "accepted", stage: "quality_gates" };
};

const injectAcceptanceTaskPair = async (params: {
  readonly workspaceRoot: string;
}): Promise<boolean> => {
  const planPath = path.join(params.workspaceRoot, QUALITY_GATES_PLAN_PATH);
  const planText = await readFile(planPath, "utf8").catch(() => null);
  if (!planText) {
    return false;
  }
  if (planText.includes('"quality-gates.phase2.acceptance.task1"')) {
    return true;
  }
  const injection = injectQualityGatesTaskPair({
    kind: "acceptance",
    planText,
  });
  if (!injection) {
    return false;
  }
  await writeFile(planPath, injection.nextPlanText, "utf8");
  return true;
};

export const runQualityGatesAcceptContractCommand = async (
  params: QualityGatesAcceptContractRunnerInput &
    QualityGatesAcceptContractRunnerDeps
): Promise<QualityGatesAcceptContractDecision> => {
  const session = params.resolveSession(params.sessionId);
  const workspaceRoot = session?.workspacePath ?? null;
  const workspaceSlug = session?.initiativeSlug ?? null;
  if (
    !(session && workspaceRoot && workspaceSlug) ||
    session.stage !== "quality_gates"
  ) {
    return {
      kind: "rejected",
      reasons: ["Acceptance command requires a Quality Gates session."],
      stage: "quality_gates",
    };
  }
  const readProgress =
    params.readQualityGatesProgress ?? readQualityGatesProgressSnapshot;
  const readGit = params.readManagedGit ?? readManagedGitStatus;
  const [progress, managedGitStatus] = await Promise.all([
    readProgress({ workspaceRoot, workspaceSlug }),
    readGit(workspaceRoot, workspaceSlug),
  ]);
  const decision = evaluateAcceptDecision({ managedGitStatus, progress });
  params.logger.info("Quality Gates accept-contract command", {
    decision: decision.kind,
    sessionId: params.sessionId,
    source: params.source,
    workspaceSlug,
  });
  if (decision.kind !== "accepted") {
    return decision;
  }
  const injectTaskPair =
    params.injectAcceptanceTaskPair ?? injectAcceptanceTaskPair;
  const acceptanceTaskInjected = await injectTaskPair({
    workspaceRoot,
  });
  if (!acceptanceTaskInjected) {
    return {
      kind: "rejected",
      reasons: [
        "Core could not inject the Quality Gates acceptance microtask.",
      ],
      stage: "quality_gates",
    };
  }
  const writeAcceptance =
    params.writeAcceptanceFlag ?? writeQualityGatesAcceptance;
  const writeResult = await writeAcceptance({
    workspaceRoot,
    workspaceSlug,
  });
  params.logger.info("Quality Gates acceptance contract write", {
    sessionId: params.sessionId,
    source: params.source,
    status: writeResult.status,
    workspaceSlug,
  });
  params.resetRetryCounter(params.sessionId);
  params.markAccepted(params.sessionId);
  params
    .appendAudit(params.sessionId, {
      kind: "managed_post_turn_decision",
      source: "core",
      text: `Quality Gates acceptance via ${params.source}`,
      timestamp: new Date().toISOString(),
    })
    .catch(() => undefined);
  params.handle(params.sessionId);
  return decision;
};
