import type { NextPlanStep } from "./diagram-modules-stage-plan-controller";

const REPAIR_TASK_PREFIX = "diagram-modules.phase1.repair.task";
const REPAIR_COMMIT_PREFIX = "docs: repair diagram modules artifact attempt";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const maxListNumber = (content: string): number => {
  let max = 0;
  for (const match of content.matchAll(/^(\d+)\.\s+\[/gmu)) {
    max = Math.max(max, Number(match[1]));
  }
  return max;
};

const buildRepairCommitMessage = (attemptNumber: number): string =>
  `${REPAIR_COMMIT_PREFIX} ${attemptNumber}`;

const buildRepairTaskId = (attemptNumber: number): string =>
  `${REPAIR_TASK_PREFIX}${attemptNumber}`;

export const parseDiagramModulesRepairTaskNumber = (
  taskId: string
): number | null => {
  if (!taskId.startsWith(REPAIR_TASK_PREFIX)) {
    return null;
  }
  const value = Number(taskId.slice(REPAIR_TASK_PREFIX.length));
  return Number.isInteger(value) && value > 0 ? value : null;
};

const nextRepairAttemptNumber = (content: string): number => {
  let max = 0;
  for (const match of content.matchAll(
    new RegExp(`\`${escapeRegExp(REPAIR_TASK_PREFIX)}(\\d+)\``, "gu")
  )) {
    max = Math.max(max, Number(match[1]));
  }
  return max + 1;
};

export const resolveNextAfterRejectedCommit = (
  content: string
): NextPlanStep => {
  const attemptNumber = nextRepairAttemptNumber(content);
  return {
    expectedCommitMessage: buildRepairCommitMessage(attemptNumber),
    taskId: buildRepairTaskId(attemptNumber),
  };
};

export const appendDiagramModulesRepairStep = (params: {
  readonly attemptNumber: number;
  readonly content: string;
  readonly workspaceSlug: string;
}): string => {
  const taskId = buildRepairTaskId(params.attemptNumber);
  if (params.content.includes(`\`${taskId}\``)) {
    return params.content;
  }
  const commitMessage = buildRepairCommitMessage(params.attemptNumber);
  const nextNumber = maxListNumber(params.content) + 1;
  const phaseHeader =
    params.attemptNumber === 1
      ? [
          "",
          "## Phase 1 — Diagram Modules Artifact Repairs",
          "",
          "### Stream: Core-Gated Repair Attempts",
          "",
        ]
      : [""];
  return [
    params.content.trimEnd(),
    ...phaseHeader,
    `${nextNumber}. [IN_PROGRESS] \`${taskId}\` Repair the Core-rejected Diagram Modules artifact selected by validation and stop for Core validation (scope: \`.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md, .codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/*.md\`; expected commit: \`${commitMessage}\`).`,
    `${nextNumber + 1}. [TODO] Git Commit: \`${commitMessage}\` (hash: TBD)`,
    "",
  ].join("\n");
};
