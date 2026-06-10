import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { QualityGatesManagedValidationResult } from "./quality-gates-validator";

export {
  collectQualityGatePaths,
  collectRootQualityGatePaths,
  uniqueExistingPaths,
} from "./quality-gates-stage-plan-paths";

export const PLAN_START = "<!-- codeai-plan-state:start -->";
export const PLAN_END = "<!-- codeai-plan-state:end -->";
export const WORKSPACE_START = "<!-- codeai-workspace-plan-state:start -->";
export const WORKSPACE_END = "<!-- codeai-workspace-plan-state:end -->";

export const QUALITY_GATES_STAGE_PLAN_PATH =
  "doc/TODO/stages/quality-gates/todo-plan.md";
export const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
export const DRAFT_TASK_ID = "quality-gates.phase1.draft.task1";
export const DRAFT_COMMIT_MESSAGE = "docs: draft quality gates contract";
export const REVIEW_TASK_PREFIX = "quality-gates.phase2.review.task";
const INTEGRATE_TASK_PREFIX = "quality-gates.phase3.integrate.task";
export const INTEGRATE_COMMIT_MESSAGE =
  "feat: integrate quality gates baseline attempt 1";
export const FORMAL_VERIFY_TASK_ID = "quality-gates.phase4.verify.task1";
export const FORMAL_VERIFY_COMMIT_MESSAGE =
  "chore: verify quality gates enforcement";
export const PHASE5_TASK_ID = "quality-gates.phase5.user-return.task1";

const BOOTSTRAP_TASK_ID = "quality-gates.phase1.bootstrap.task1";
const BOOTSTRAP_COMMIT_MESSAGE = "docs: bootstrap quality gates managed stage";
export const DRAFT_REPAIR_TASK_PREFIX = "quality-gates.phase1.repair.task";
const DRAFT_REPAIR_COMMIT_PREFIX = "docs: repair quality gates draft attempt";
export const INTEGRATION_REPAIR_TASK_PREFIX =
  "quality-gates.phase3.repair.task";
const INTEGRATION_REPAIR_COMMIT_PREFIX =
  "feat: repair quality gates integration attempt";
export const VERIFICATION_REPAIR_TASK_PREFIX =
  "quality-gates.phase4.repair.task";
const VERIFICATION_REPAIR_COMMIT_PREFIX =
  "chore: repair quality gates verification attempt";
const NO_REVISION_DISPOSITION =
  "not-created-user-accepted-without-review-revision";
const FENCED_JSON_START_RE = /^```json\s*/u;
const FENCED_JSON_END_RE = /\s*```$/u;
export interface ManagedPlanState {
  currentTaskId: string | null;
  expectedCommitMessage: string | null;
  lastRecordedCommit: string | null;
  [key: string]: unknown;
}
export interface ManagedWorkspaceState {
  acceptedCommits?: unknown[];
  activePlanPath?: string | null;
  activeStage?: string | null;
  completedStages?: unknown[];
  lastAcceptedCommitHash?: string | null;
  lastAcceptedCommitMessage?: string | null;
  unlockedStages?: unknown[];
  [key: string]: unknown;
}
export interface NextPlanStep {
  readonly expectedCommitMessage: string | null;
  readonly taskId: string | null;
}
const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const maxListNumber = (content: string): number => {
  let max = 0;
  for (const match of content.matchAll(/^(\d+)\.\s+\[/gmu)) {
    max = Math.max(max, Number(match[1]));
  }
  return max;
};
export const readText = async (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");
export const writeText = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};
export const parseStateBlock = <TState>(
  content: string,
  startMarker: string,
  endMarker: string
): TState => {
  const rawBlock = content.split(startMarker)[1]?.split(endMarker)[0];
  const json = rawBlock
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    throw new Error(`Missing managed state block: ${startMarker}`);
  }
  return JSON.parse(json) as TState;
};
export const replaceStateBlock = (
  content: string,
  startMarker: string,
  endMarker: string,
  state: unknown
): string => {
  const blockPattern = new RegExp(
    `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`,
    "u"
  );
  return content.replace(
    blockPattern,
    `${startMarker}\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n${endMarker}`
  );
};
export const addUnique = <TValue>(
  values: readonly unknown[] | undefined,
  value: TValue
): unknown[] => {
  const existing = Array.isArray(values) ? values : [];
  return existing.includes(value) ? [...existing] : [...existing, value];
};
export const buildContractArtifactPaths = (
  workspaceSlug: string
): readonly string[] => [
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates-research.md`,
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates-research.json`,
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.md`,
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json`,
];
export const buildReviewCommitMessage = (reviewNumber: number): string =>
  `docs: revise quality gates contract revision ${reviewNumber}`;
export const buildReviewTaskId = (reviewNumber: number): string =>
  `${REVIEW_TASK_PREFIX}${reviewNumber}`;
const buildDraftRepairTaskId = (attemptNumber: number): string =>
  `${DRAFT_REPAIR_TASK_PREFIX}${attemptNumber}`;
const buildDraftRepairCommitMessage = (attemptNumber: number): string =>
  `${DRAFT_REPAIR_COMMIT_PREFIX} ${attemptNumber}`;
export const buildIntegrateTaskId = (attemptNumber: number): string =>
  `${INTEGRATE_TASK_PREFIX}${attemptNumber}`;
const buildIntegrationRepairTaskId = (attemptNumber: number): string =>
  `${INTEGRATION_REPAIR_TASK_PREFIX}${attemptNumber}`;
const buildIntegrationRepairCommitMessage = (attemptNumber: number): string =>
  `${INTEGRATION_REPAIR_COMMIT_PREFIX} ${attemptNumber}`;
const buildVerificationRepairTaskId = (attemptNumber: number): string =>
  `${VERIFICATION_REPAIR_TASK_PREFIX}${attemptNumber}`;
const buildVerificationRepairCommitMessage = (attemptNumber: number): string =>
  `${VERIFICATION_REPAIR_COMMIT_PREFIX} ${attemptNumber}`;
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
const parseReviewTaskNumber = (taskId: string): number | null =>
  parsePrefixedTaskNumber(taskId, REVIEW_TASK_PREFIX);
const parseDraftRepairTaskNumber = (taskId: string): number | null =>
  parsePrefixedTaskNumber(taskId, DRAFT_REPAIR_TASK_PREFIX);
const nextRepairAttemptNumber = (content: string, prefix: string): number => {
  let max = 0;
  for (const match of content.matchAll(
    new RegExp(`\`${escapeRegExp(prefix)}(\\d+)\``, "gu")
  )) {
    max = Math.max(max, Number(match[1]));
  }
  return max + 1;
};
const resolveRepairTaskPrefix = (
  phase: QualityGatesManagedValidationResult["phase"]
): string => {
  if (phase === "verification") {
    return VERIFICATION_REPAIR_TASK_PREFIX;
  }
  return phase === "integration"
    ? INTEGRATION_REPAIR_TASK_PREFIX
    : DRAFT_REPAIR_TASK_PREFIX;
};
const appendTaskPair = (params: {
  readonly commitMessage: string;
  readonly content: string;
  readonly phaseHeader?: readonly string[];
  readonly taskId: string;
  readonly taskLine: string;
}): string => {
  if (params.content.includes(`\`${params.taskId}\``)) {
    return params.content;
  }
  const nextNumber = maxListNumber(params.content) + 1;
  return [
    params.content.trimEnd(),
    ...(params.phaseHeader ?? [""]),
    `${nextNumber}. [IN_PROGRESS] \`${params.taskId}\` ${params.taskLine} (expected commit: \`${params.commitMessage}\`).`,
    `${nextNumber + 1}. [TODO] Git Commit: \`${params.commitMessage}\` (hash: TBD)`,
    "",
  ].join("\n");
};

const buildPhaseHeader = (title: string, stream: string): readonly string[] => [
  "",
  `## ${title}`,
  "",
  `### Stream: ${stream}`,
  "",
];

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
  const withDraftTask = content.replace(
    taskPattern,
    (_line, number) =>
      `${number}. [IN_PROGRESS] \`${DRAFT_TASK_ID}\` Draft only the Quality Gates research artifacts, then stop for Core validation and user review (scope: \`.codeai-hub/**/quality_gates/quality-gates-research.md, .codeai-hub/**/quality_gates/quality-gates-research.json\`; expected commit: \`${DRAFT_COMMIT_MESSAGE}\`).`
  );
  return withDraftTask.replace(
    commitPattern,
    (_line, number) =>
      `${number}. [TODO] Git Commit: \`${DRAFT_COMMIT_MESSAGE}\` (hash: TBD)`
  );
};

const appendReviewStep = (content: string, reviewNumber: number): string =>
  appendTaskPair({
    content,
    taskId: buildReviewTaskId(reviewNumber),
    commitMessage: buildReviewCommitMessage(reviewNumber),
    phaseHeader:
      reviewNumber === 1
        ? buildPhaseHeader(
            "Phase 2 — Quality Gates Contract Review",
            "User-Led Review"
          )
        : [""],
    taskLine:
      "User reviews the Quality Gates contract and either accepts it or requests revision (scope: user decision + `.codeai-hub/**/quality_gates/quality-gates.md, .codeai-hub/**/quality_gates/quality-gates.json`;",
  });

export const appendIntegrationStep = (content: string): string =>
  appendTaskPair({
    content,
    taskId: buildIntegrateTaskId(1),
    commitMessage: INTEGRATE_COMMIT_MESSAGE,
    phaseHeader: buildPhaseHeader(
      "Phase 3 — Quality Gates Integration",
      "Accepted-Only Integration"
    ),
    taskLine:
      "Integrate the user-accepted Quality Gates contract into package scripts, gate infrastructure, and lifecycle hooks, then stop for Core validation (scope: `.codeai-hub/**/quality_gates/**, package.json, lockfiles, .husky/pre-commit, .husky/pre-push, scripts/quality-gates/**, accepted gate configs/CI files`;",
  });

const appendRepairStep = (params: {
  readonly attemptNumber: number;
  readonly commitMessage: string;
  readonly content: string;
  readonly taskId: string;
  readonly taskLine: string;
  readonly title: string;
}): string =>
  appendTaskPair({
    content: params.content,
    taskId: params.taskId,
    commitMessage: params.commitMessage,
    phaseHeader:
      params.attemptNumber === 1
        ? buildPhaseHeader(params.title, "Core-Gated Repair Attempts")
        : [""],
    taskLine: params.taskLine,
  });

const appendDraftRepairStep = (
  content: string,
  attemptNumber: number
): string =>
  appendRepairStep({
    content,
    attemptNumber,
    taskId: buildDraftRepairTaskId(attemptNumber),
    commitMessage: buildDraftRepairCommitMessage(attemptNumber),
    title: "Quality Gates Draft Repair Cycle",
    taskLine:
      "Repair the rejected Quality Gates research/contract draft artifacts and stop for Core validation (scope: `.codeai-hub/**/quality_gates/quality-gates-research.md, .codeai-hub/**/quality_gates/quality-gates-research.json, .codeai-hub/**/quality_gates/quality-gates.md, .codeai-hub/**/quality_gates/quality-gates.json`;",
  });

const appendIntegrationRepairStep = (
  content: string,
  attemptNumber: number
): string =>
  appendRepairStep({
    content,
    attemptNumber,
    taskId: buildIntegrationRepairTaskId(attemptNumber),
    commitMessage: buildIntegrationRepairCommitMessage(attemptNumber),
    title: "Quality Gates Integration Repair Cycle",
    taskLine:
      "Repair the rejected Quality Gates integration and stop for Core validation (scope: `.codeai-hub/**/quality_gates/**, package.json, lockfiles, .husky/pre-commit, .husky/pre-push, scripts/quality-gates/**, accepted gate configs/CI files`;",
  });

const appendVerificationRepairStep = (
  content: string,
  attemptNumber: number
): string =>
  appendRepairStep({
    content,
    attemptNumber,
    taskId: buildVerificationRepairTaskId(attemptNumber),
    commitMessage: buildVerificationRepairCommitMessage(attemptNumber),
    title: "Quality Gates Verification Repair Cycle",
    taskLine:
      "Repair the rejected Quality Gates formal verification evidence and stop for Core validation (scope: `.codeai-hub/**/quality_gates/**, package.json, .husky/pre-commit, .husky/pre-push, scripts/quality-gates/**, accepted gate configs`;",
  });

const appendFormalVerificationStep = (content: string): string =>
  appendTaskPair({
    content,
    taskId: FORMAL_VERIFY_TASK_ID,
    commitMessage: FORMAL_VERIFY_COMMIT_MESSAGE,
    phaseHeader: buildPhaseHeader(
      "Phase 4 — Formal Quality Gates Verification",
      "Enforcement Surface Verification"
    ),
    taskLine:
      "Run and record formal verification for the integrated Quality Gates enforcement surface before persistent return (scope: `.codeai-hub/**/quality_gates/**, package.json, .husky/pre-commit, .husky/pre-push, scripts/quality-gates/**, accepted gate configs`;",
  });

const appendPersistentReturnStep = (content: string): string =>
  appendTaskPair({
    content,
    taskId: PHASE5_TASK_ID,
    commitMessage: "not-created-persistent-user-return-open",
    phaseHeader: buildPhaseHeader(
      "Phase 5 — Persistent Quality Gates User Return",
      "User Return And Revisions"
    ),
    taskLine:
      "Persistent Quality Gates return phase is open for future user revisions after accepted integration (scope: user workflow;",
  }).replace(
    "[TODO] Git Commit: `not-created-persistent-user-return-open` (hash: TBD)",
    "[DONE] Git Commit: `not-created-persistent-user-return-open` (hash: not-created-persistent-user-return-open)"
  );

export const resolveNextAfterCommit = (params: {
  readonly currentTaskId: string;
  readonly decision: QualityGatesManagedValidationResult;
}): NextPlanStep => {
  if (
    params.currentTaskId === DRAFT_TASK_ID ||
    parseDraftRepairTaskNumber(params.currentTaskId) !== null
  ) {
    return {
      expectedCommitMessage: buildReviewCommitMessage(1),
      taskId: buildReviewTaskId(1),
    };
  }
  const reviewNumber = parseReviewTaskNumber(params.currentTaskId);
  if (reviewNumber !== null) {
    const nextReviewNumber = reviewNumber + 1;
    return {
      expectedCommitMessage: buildReviewCommitMessage(nextReviewNumber),
      taskId: buildReviewTaskId(nextReviewNumber),
    };
  }
  if (
    params.decision.nextAction === "open_persistent_return" &&
    (params.currentTaskId.startsWith(INTEGRATE_TASK_PREFIX) ||
      params.currentTaskId.startsWith(INTEGRATION_REPAIR_TASK_PREFIX))
  ) {
    return {
      expectedCommitMessage: FORMAL_VERIFY_COMMIT_MESSAGE,
      taskId: FORMAL_VERIFY_TASK_ID,
    };
  }
  if (
    params.currentTaskId === FORMAL_VERIFY_TASK_ID ||
    params.currentTaskId.startsWith(VERIFICATION_REPAIR_TASK_PREFIX)
  ) {
    return { expectedCommitMessage: null, taskId: PHASE5_TASK_ID };
  }
  return { expectedCommitMessage: null, taskId: null };
};

export const resolveNextAfterRejectedCommit = (params: {
  readonly content: string;
  readonly decision: QualityGatesManagedValidationResult;
}): NextPlanStep => {
  const prefix = resolveRepairTaskPrefix(params.decision.phase);
  const attemptNumber = nextRepairAttemptNumber(params.content, prefix);
  if (params.decision.phase === "verification") {
    return {
      expectedCommitMessage:
        buildVerificationRepairCommitMessage(attemptNumber),
      taskId: buildVerificationRepairTaskId(attemptNumber),
    };
  }
  return params.decision.phase === "integration"
    ? {
        expectedCommitMessage:
          buildIntegrationRepairCommitMessage(attemptNumber),
        taskId: buildIntegrationRepairTaskId(attemptNumber),
      }
    : {
        expectedCommitMessage: buildDraftRepairCommitMessage(attemptNumber),
        taskId: buildDraftRepairTaskId(attemptNumber),
      };
};

export const updateStagePlanAfterCommit = (params: {
  readonly content: string;
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
  readonly hash: string;
  readonly next: NextPlanStep;
}): string => {
  const taskPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS|BLOCKED)(\\] \`${escapeRegExp(
      params.currentTaskId
    )}\` .*)$`,
    "mu"
  );
  const commitPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|PENDING|IN_PROGRESS|BLOCKED)(\\] Git Commit: \`${escapeRegExp(
      params.expectedCommitMessage
    )}\` \\(hash: )(?:TBD|[^)]+)(\\))$`,
    "mu"
  );
  const markedDone = params.content
    .replace(taskPattern, "$1DONE$2")
    .replace(commitPattern, `$1DONE$2${params.hash}$3`);
  if (params.next.taskId?.startsWith(REVIEW_TASK_PREFIX)) {
    return appendReviewStep(
      markedDone,
      Number(params.next.taskId.slice(REVIEW_TASK_PREFIX.length))
    );
  }
  const draftRepairNumber = params.next.taskId
    ? parseDraftRepairTaskNumber(params.next.taskId)
    : null;
  if (draftRepairNumber !== null) {
    return appendDraftRepairStep(markedDone, draftRepairNumber);
  }
  const integrationRepairNumber = params.next.taskId
    ? parsePrefixedTaskNumber(
        params.next.taskId,
        INTEGRATION_REPAIR_TASK_PREFIX
      )
    : null;
  if (integrationRepairNumber !== null) {
    return appendIntegrationRepairStep(markedDone, integrationRepairNumber);
  }
  const verificationRepairNumber = params.next.taskId
    ? parsePrefixedTaskNumber(
        params.next.taskId,
        VERIFICATION_REPAIR_TASK_PREFIX
      )
    : null;
  if (verificationRepairNumber !== null) {
    return appendVerificationRepairStep(markedDone, verificationRepairNumber);
  }
  if (params.next.taskId === FORMAL_VERIFY_TASK_ID) {
    return appendFormalVerificationStep(markedDone);
  }
  return params.next.taskId === PHASE5_TASK_ID
    ? appendPersistentReturnStep(markedDone)
    : markedDone;
};

export const markReviewAcceptedWithoutRevision = (params: {
  readonly content: string;
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
}): string =>
  updateStagePlanAfterCommit({
    content: params.content,
    currentTaskId: params.currentTaskId,
    expectedCommitMessage: params.expectedCommitMessage,
    hash: NO_REVISION_DISPOSITION,
    next: { expectedCommitMessage: null, taskId: null },
  });
