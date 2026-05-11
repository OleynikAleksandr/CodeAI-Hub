import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ATTEMPT_DIR = "workflow/revisions/application-skeleton/attempts";
const REPAIR_NUMBER_RE = /repair(\d+)\.task\d+$/u;
const SAFE_SEGMENT_RE = /[^a-z0-9._-]+/gu;
const ATTEMPT_FILE_RE = /^attempt-(\d{4})-/u;

export type ApplicationSkeletonRepairAttemptOutcome =
  | "accepted_after_repair"
  | "no_accepted_diff"
  | "still_invalid";

export interface ApplicationSkeletonRepairAttemptEvidence {
  readonly attemptNumber: number;
  readonly checkedAt: string;
  readonly diagnostics: readonly string[];
  readonly outcome: ApplicationSkeletonRepairAttemptOutcome;
  readonly repairTaskId: string;
  readonly schema: "codeai-application-skeleton-repair-attempt-v1";
  readonly stage: "application_skeleton";
  readonly targetArtifactPath: string;
  readonly targetPhase: string;
  readonly validator: string;
}

export interface ApplicationSkeletonRepairAttemptEvidenceResult {
  readonly absolutePath: string;
  readonly evidence: ApplicationSkeletonRepairAttemptEvidence;
  readonly relativePath: string;
}

const sanitizePathPart = (value: string): string =>
  value
    .toLowerCase()
    .replace(SAFE_SEGMENT_RE, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 96) || "application-skeleton";

const padAttemptNumber = (value: number): string =>
  value.toString().padStart(4, "0");

const readRepairNumber = (taskId: string): number | null => {
  const parsed = Number.parseInt(REPAIR_NUMBER_RE.exec(taskId)?.[1] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const readExistingAttemptNumbers = async (
  attemptsDir: string
): Promise<readonly number[]> => {
  const entries = await readdir(attemptsDir).catch(() => []);
  return entries
    .map((entry) => Number.parseInt(ATTEMPT_FILE_RE.exec(entry)?.[1] ?? "", 10))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
};

const resolveAttemptNumber = async (params: {
  readonly attemptNumber?: number | null;
  readonly attemptsDir: string;
  readonly repairTaskId: string;
}): Promise<number> => {
  if (params.attemptNumber && params.attemptNumber > 0) {
    return params.attemptNumber;
  }
  const fromTaskId = readRepairNumber(params.repairTaskId);
  if (fromTaskId) {
    return fromTaskId;
  }
  const existing = await readExistingAttemptNumbers(params.attemptsDir);
  return Math.max(0, ...existing) + 1;
};

export const writeApplicationSkeletonRepairAttemptEvidence = async (params: {
  readonly attemptNumber?: number | null;
  readonly diagnostics: readonly string[];
  readonly now?: Date;
  readonly outcome: ApplicationSkeletonRepairAttemptOutcome;
  readonly repairTaskId: string;
  readonly targetArtifactPath: string;
  readonly targetPhase: string;
  readonly validator: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ApplicationSkeletonRepairAttemptEvidenceResult> => {
  const attemptsRelativeDir = `.codeai-hub/${params.workspaceSlug}/${ATTEMPT_DIR}`;
  const attemptsDir = path.join(params.workspaceRoot, attemptsRelativeDir);
  const attemptNumber = await resolveAttemptNumber({
    attemptNumber: params.attemptNumber,
    attemptsDir,
    repairTaskId: params.repairTaskId,
  });
  const targetSlug = sanitizePathPart(params.targetArtifactPath);
  const fileName = `attempt-${padAttemptNumber(attemptNumber)}-${targetSlug}.json`;
  const relativePath = `${attemptsRelativeDir}/${fileName}`;
  const absolutePath = path.join(params.workspaceRoot, relativePath);
  const evidence: ApplicationSkeletonRepairAttemptEvidence = {
    schema: "codeai-application-skeleton-repair-attempt-v1",
    stage: "application_skeleton",
    attemptNumber,
    checkedAt: (params.now ?? new Date()).toISOString(),
    diagnostics: [...params.diagnostics],
    outcome: params.outcome,
    repairTaskId: params.repairTaskId,
    targetArtifactPath: params.targetArtifactPath,
    targetPhase: params.targetPhase,
    validator: params.validator,
  };

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(
    absolutePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8"
  );

  return { absolutePath, evidence, relativePath };
};
