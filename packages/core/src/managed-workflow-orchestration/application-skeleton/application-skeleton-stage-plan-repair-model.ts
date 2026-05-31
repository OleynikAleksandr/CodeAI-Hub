import type { NextPlanStep } from "./application-skeleton-stage-plan-model";
import type { ApplicationSkeletonManagedValidationResult } from "./application-skeleton-validator";

export const DRAFT_TASK_ID = "application-skeleton.phase1.draft.task1";
export const DRAFT_COMMIT_MESSAGE = "docs: draft application skeleton contract";

const BOOTSTRAP_TASK_ID = "application-skeleton.phase1.bootstrap.task1";
const BOOTSTRAP_COMMIT_MESSAGE =
  "docs: bootstrap application skeleton managed stage";
const DRAFT_REPAIR_TASK_PREFIX = "application-skeleton.phase1.repair.task";
const DRAFT_REPAIR_COMMIT_PREFIX =
  "docs: repair application skeleton draft attempt";
const MATERIALIZATION_REPAIR_TASK_PREFIX =
  "application-skeleton.phase3.repair.task";
const MATERIALIZATION_REPAIR_COMMIT_PREFIX =
  "feat: repair application skeleton materialization attempt";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const maxListNumber = (content: string): number => {
  let max = 0;
  for (const match of content.matchAll(/^(\d+)\.\s+\[/gmu)) {
    max = Math.max(max, Number(match[1]));
  }
  return max;
};

const buildDraftRepairCommitMessage = (attemptNumber: number): string =>
  `${DRAFT_REPAIR_COMMIT_PREFIX} ${attemptNumber}`;

const buildDraftRepairTaskId = (attemptNumber: number): string =>
  `${DRAFT_REPAIR_TASK_PREFIX}${attemptNumber}`;

const buildMaterializationRepairCommitMessage = (
  attemptNumber: number
): string => `${MATERIALIZATION_REPAIR_COMMIT_PREFIX} ${attemptNumber}`;

const buildMaterializationRepairTaskId = (attemptNumber: number): string =>
  `${MATERIALIZATION_REPAIR_TASK_PREFIX}${attemptNumber}`;

const parsePrefixedTaskNumber = (
  taskId: string,
  prefix: string
): number | null => {
  if (!taskId.startsWith(prefix)) {
    return null;
  }
  const value = Number(taskId.slice(prefix.length));
  return Number.isInteger(value) && value > 0 ? value : null;
};

export const parseDraftRepairTaskNumber = (taskId: string): number | null =>
  parsePrefixedTaskNumber(taskId, DRAFT_REPAIR_TASK_PREFIX);

export const parseMaterializationRepairTaskNumber = (
  taskId: string
): number | null =>
  parsePrefixedTaskNumber(taskId, MATERIALIZATION_REPAIR_TASK_PREFIX);

const nextRepairAttemptNumber = (content: string, prefix: string): number => {
  let max = 0;
  for (const match of content.matchAll(
    new RegExp(`\`${escapeRegExp(prefix)}(\\d+)\``, "gu")
  )) {
    max = Math.max(max, Number(match[1]));
  }
  return max + 1;
};

export const resolveNextAfterRejectedCommit = (params: {
  readonly content: string;
  readonly decision: ApplicationSkeletonManagedValidationResult;
}): NextPlanStep => {
  if (params.decision.phase === "materialization") {
    const attemptNumber = nextRepairAttemptNumber(
      params.content,
      MATERIALIZATION_REPAIR_TASK_PREFIX
    );
    return {
      expectedCommitMessage:
        buildMaterializationRepairCommitMessage(attemptNumber),
      taskId: buildMaterializationRepairTaskId(attemptNumber),
    };
  }
  const attemptNumber = nextRepairAttemptNumber(
    params.content,
    DRAFT_REPAIR_TASK_PREFIX
  );
  return {
    expectedCommitMessage: buildDraftRepairCommitMessage(attemptNumber),
    taskId: buildDraftRepairTaskId(attemptNumber),
  };
};

const buildDraftTaskLine = (lineNumber: number): string =>
  `${lineNumber}. [IN_PROGRESS] \`${DRAFT_TASK_ID}\` Draft the Application Skeleton contract artifacts and stop for Core validation (scope: \`.codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json\`; expected commit: \`${DRAFT_COMMIT_MESSAGE}\`).`;

const buildDraftCommitLine = (lineNumber: number): string =>
  `${lineNumber}. [TODO] Git Commit: \`${DRAFT_COMMIT_MESSAGE}\` (hash: TBD)`;

export const openDraftStagePlan = (content: string): string => {
  if (content.includes(`\`${DRAFT_TASK_ID}\``)) {
    return content;
  }
  const taskPattern = new RegExp(
    `^(\\d+)\\. \\[(?:TODO|IN_PROGRESS|BLOCKED)\\] \`${escapeRegExp(
      BOOTSTRAP_TASK_ID
    )}\` .*$`,
    "mu"
  );
  const commitPattern = new RegExp(
    `^(\\d+)\\. \\[(?:TODO|PENDING|IN_PROGRESS|BLOCKED)\\] Git Commit: \`${escapeRegExp(
      BOOTSTRAP_COMMIT_MESSAGE
    )}\` \\(hash: (?:TBD|[^)]+)\\)$`,
    "mu"
  );
  const withDraftTask = content.replace(taskPattern, (_line, number) =>
    buildDraftTaskLine(Number(number))
  );
  const withDraftCommit = withDraftTask.replace(
    commitPattern,
    (_line, number) => buildDraftCommitLine(Number(number))
  );
  if (withDraftCommit !== content) {
    return withDraftCommit;
  }
  const nextNumber = maxListNumber(content) + 1;
  return [
    content.trimEnd(),
    buildDraftTaskLine(nextNumber),
    buildDraftCommitLine(nextNumber + 1),
    "",
  ].join("\n");
};

export const appendDraftRepairStep = (
  content: string,
  attemptNumber: number
): string => {
  const taskId = buildDraftRepairTaskId(attemptNumber);
  if (content.includes(`\`${taskId}\``)) {
    return content;
  }
  const commitMessage = buildDraftRepairCommitMessage(attemptNumber);
  const nextNumber = maxListNumber(content) + 1;
  const phaseHeader =
    attemptNumber === 1
      ? [
          "",
          "## Application Skeleton Draft Repair Cycle",
          "",
          "### Stream: Core-Gated Repair Attempts",
          "",
        ]
      : [""];
  return [
    content.trimEnd(),
    ...phaseHeader,
    `${nextNumber}. [IN_PROGRESS] \`${taskId}\` Repair the rejected Application Skeleton draft artifacts and stop for Core validation (scope: \`.codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json\`; expected commit: \`${commitMessage}\`).`,
    `${nextNumber + 1}. [TODO] Git Commit: \`${commitMessage}\` (hash: TBD)`,
    "",
  ].join("\n");
};

export const appendMaterializationRepairStep = (
  content: string,
  attemptNumber: number
): string => {
  const taskId = buildMaterializationRepairTaskId(attemptNumber);
  if (content.includes(`\`${taskId}\``)) {
    return content;
  }
  const commitMessage = buildMaterializationRepairCommitMessage(attemptNumber);
  const nextNumber = maxListNumber(content) + 1;
  const phaseHeader =
    attemptNumber === 1
      ? [
          "",
          "## Application Skeleton Materialization Repair Cycle",
          "",
          "### Stream: Core-Gated Repair Attempts",
          "",
        ]
      : [""];
  return [
    content.trimEnd(),
    ...phaseHeader,
    `${nextNumber}. [IN_PROGRESS] \`${taskId}\` Repair the rejected Application Skeleton materialization and stop for Core validation (scope: \`product-parts/**, package.json, package-lock.json, tsconfig*.json, .codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json\`; expected commit: \`${commitMessage}\`).`,
    `${nextNumber + 1}. [TODO] Git Commit: \`${commitMessage}\` (hash: TBD)`,
    "",
  ].join("\n");
};
