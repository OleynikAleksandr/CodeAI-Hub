const STATE_BLOCK_RE =
  /<!-- codeai-plan-state:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- codeai-plan-state:end -->/u;
const STATUS_TOKEN_RE = /\[(TODO|IN_PROGRESS|DONE|BLOCKED|PENDING)\]/u;
const TASK_NUMBER_PREFIX_RE = /^\d+\. /u;
const REVIEW_REVISION_RE =
  /`application-skeleton\.phase2\.review\.revision(\d+)\.task1`/gu;
const REVIEW_TASK_ID_RE = /^application-skeleton\.phase2\.review\.task\d+$/u;
const REPAIR_RE = /`application-skeleton\.[^`]+\.repair(\d+)\.task1`/gu;
const REVIEW_ACCEPTED_WITHOUT_REVISION_HASH =
  "hash: not-created-user-accepted-without-review-revision";
const USER_RETURN_REVISION_RE =
  /`application-skeleton\.phase4\.user-return\.revision(\d+)\.task1`/gu;
const TASK_LINE_NUMBER_RE = /^(\d+)\./u;

export type ApplicationSkeletonPlanTaskKind =
  | "acceptance"
  | "materialization"
  | "repair"
  | "review_revision"
  | "user_return_revision";

export interface ApplicationSkeletonTaskPairInjection {
  readonly nextCommitMessage: string;
  readonly nextCurrentTaskId: string;
  readonly nextPlanText: string;
  readonly sequenceNumber: number | null;
}

export interface ApplicationSkeletonTaskPairInjectionParams {
  readonly diagnostics?: readonly string[];
  readonly kind: ApplicationSkeletonPlanTaskKind;
  readonly planText: string;
  readonly targetPhase?: string | null;
  readonly targetSummary?: string | null;
}

const replaceStatus = (line: string, status: string): string =>
  line.replace(STATUS_TOKEN_RE, `[${status}]`);

const taskNumberBefore = (
  lines: readonly string[],
  lineIndex: number
): number =>
  lines
    .slice(0, lineIndex + 1)
    .filter((line) => TASK_NUMBER_PREFIX_RE.test(line)).length + 1;

const readTaskLineNumber = (line: string, fallback: number): number => {
  const parsed = Number.parseInt(TASK_LINE_NUMBER_RE.exec(line)?.[1] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const formatTaskLine = (
  number: number,
  taskId: string,
  status: string,
  summary: string,
  scope: string,
  message: string
): string =>
  `${number}. [${status}] \`${taskId}\` ${summary} (scope: \`${scope}\`; expected commit: \`${message}\`).`;

const formatCommitLine = (number: number, message: string): string =>
  `${number}. [TODO] Git Commit: \`${message}\` (hash: TBD)`;

const readState = (planText: string): Record<string, unknown> | null => {
  const match = STATE_BLOCK_RE.exec(planText);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[1] ?? "{}") as Record<string, unknown>;
  } catch {
    return null;
  }
};

const replaceState = (
  planText: string,
  state: Record<string, unknown>
): string =>
  planText.replace(
    STATE_BLOCK_RE,
    `<!-- codeai-plan-state:start -->\n\`\`\`json\n${JSON.stringify(
      state,
      null,
      2
    )}\n\`\`\`\n<!-- codeai-plan-state:end -->`
  );

const readCurrentTaskId = (state: Record<string, unknown>): string | null =>
  typeof state.currentTaskId === "string" && state.currentTaskId.trim()
    ? state.currentTaskId.trim()
    : null;

const countMatches = (planText: string, pattern: RegExp): number => {
  let maxNumber = 0;
  for (const match of planText.matchAll(pattern)) {
    const value = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(value) && value > maxNumber) {
      maxNumber = value;
    }
  }
  return maxNumber;
};

const findCurrentTaskLineIndex = (
  lines: readonly string[],
  taskId: string
): number => lines.findIndex((line) => line.includes(`\`${taskId}\``));

const findPairedCommitLineIndex = (
  lines: readonly string[],
  taskLineIndex: number
): number =>
  lines.findIndex(
    (line, index) => index > taskLineIndex && line.includes("Git Commit:")
  );

const closeOpenReviewAnchorForAcceptance = (params: {
  readonly currentTaskId: string;
  readonly lines: string[];
  readonly pairedCommitLineIndex: number;
  readonly taskLineIndex: number;
}): void => {
  if (!REVIEW_TASK_ID_RE.test(params.currentTaskId)) {
    return;
  }
  params.lines[params.taskLineIndex] = replaceStatus(
    params.lines[params.taskLineIndex] ?? "",
    "DONE"
  );
  params.lines[params.pairedCommitLineIndex] = replaceStatus(
    params.lines[params.pairedCommitLineIndex] ?? "",
    "DONE"
  ).replace("hash: TBD", REVIEW_ACCEPTED_WITHOUT_REVISION_HASH);
};

const diagnosticsSummary = (
  diagnostics: readonly string[] | undefined
): string =>
  diagnostics?.length ? diagnostics.join("; ") : "no diagnostics captured";

const resolveTaskPair = (
  params: ApplicationSkeletonTaskPairInjectionParams
): {
  readonly message: string;
  readonly sequenceNumber: number | null;
  readonly shouldBlockCurrentTask: boolean;
  readonly scope: string;
  readonly summary: string;
  readonly taskId: string;
} => {
  if (params.kind === "review_revision") {
    const sequenceNumber =
      countMatches(params.planText, REVIEW_REVISION_RE) + 1;
    const message = `docs: revise application skeleton review revision ${sequenceNumber}`;
    return {
      message,
      scope:
        ".codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json",
      sequenceNumber,
      shouldBlockCurrentTask: false,
      summary: `Apply Application Skeleton contract review revision ${sequenceNumber} and stop for Core acceptance`,
      taskId: `application-skeleton.phase2.review.revision${sequenceNumber}.task1`,
    };
  }
  if (params.kind === "acceptance") {
    return {
      message: "docs: accept application skeleton contract",
      scope:
        ".codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json",
      sequenceNumber: null,
      shouldBlockCurrentTask: false,
      summary:
        "Record Core-owned Application Skeleton contract acceptance state before materialization is requested",
      taskId: "application-skeleton.phase2.acceptance.task1",
    };
  }
  if (params.kind === "materialization") {
    return {
      message: "feat: materialize application skeleton",
      scope:
        "product-parts/**, package.json, package-lock.json, tsconfig*.json, .codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json",
      sequenceNumber: null,
      shouldBlockCurrentTask: false,
      summary:
        "Materialize the accepted Application Skeleton filesystem projection and stop for Core validation",
      taskId: "application-skeleton.phase3.materialize.task1",
    };
  }
  if (params.kind === "user_return_revision") {
    const sequenceNumber =
      countMatches(params.planText, USER_RETURN_REVISION_RE) + 1;
    const message = `docs: revise application skeleton user return revision ${sequenceNumber}`;
    return {
      message,
      scope:
        "product-parts/**, package.json, package-lock.json, tsconfig*.json, .codeai-hub/**/application_skeleton/**, .codeai-hub/**/workflow/revisions/application-skeleton/**",
      sequenceNumber,
      shouldBlockCurrentTask: false,
      summary: `Apply post-completion Application Skeleton user revision ${sequenceNumber} and stop for Core acceptance`,
      taskId: `application-skeleton.phase4.user-return.revision${sequenceNumber}.task1`,
    };
  }
  const sequenceNumber = countMatches(params.planText, REPAIR_RE) + 1;
  const targetPhase = params.targetPhase?.trim() || "current";
  const message = `docs: repair application skeleton ${targetPhase} attempt ${sequenceNumber}`;
  return {
    message,
    scope:
      ".codeai-hub/**/application_skeleton/**, product-parts/**, package.json, package-lock.json, tsconfig*.json, .codeai-hub/**/product-parts/**, .codeai-hub/**/workflow/revisions/application-skeleton/attempts/**",
    sequenceNumber,
    shouldBlockCurrentTask: true,
    summary: `${params.targetSummary?.trim() || "Core rejected the previous Application Skeleton attempt; repair only the named artifact set"}; target phase: \`${targetPhase}\`; diagnostics: ${diagnosticsSummary(params.diagnostics)}`,
    taskId: `application-skeleton.${targetPhase}.repair${sequenceNumber}.task1`,
  };
};

export const injectApplicationSkeletonTaskPair = (
  params: ApplicationSkeletonTaskPairInjectionParams
): ApplicationSkeletonTaskPairInjection | null => {
  const state = readState(params.planText);
  if (!state) {
    return null;
  }
  const currentTaskId = readCurrentTaskId(state);
  if (!currentTaskId) {
    return null;
  }
  const lines = params.planText.split("\n");
  const currentTaskLineIndex = findCurrentTaskLineIndex(lines, currentTaskId);
  if (currentTaskLineIndex < 0) {
    return null;
  }
  const pairedCommitLineIndex = findPairedCommitLineIndex(
    lines,
    currentTaskLineIndex
  );
  if (pairedCommitLineIndex < 0) {
    return null;
  }
  const taskPair = resolveTaskPair(params);
  const taskNumber = taskNumberBefore(lines, pairedCommitLineIndex);
  const nextLines = [...lines];
  if (
    params.kind === "review_revision" ||
    params.kind === "user_return_revision"
  ) {
    const revisionTaskNumber = readTaskLineNumber(
      nextLines[currentTaskLineIndex] ?? "",
      taskNumber
    );
    nextLines[currentTaskLineIndex] = replaceStatus(
      nextLines[currentTaskLineIndex] ?? "",
      "TODO"
    );
    nextLines.splice(
      currentTaskLineIndex,
      0,
      formatTaskLine(
        revisionTaskNumber,
        taskPair.taskId,
        "IN_PROGRESS",
        taskPair.summary,
        taskPair.scope,
        taskPair.message
      ),
      formatCommitLine(revisionTaskNumber, taskPair.message),
      ""
    );
    const nextPlanText = replaceState(nextLines.join("\n"), {
      ...state,
      currentTaskId: taskPair.taskId,
      expectedCommitMessage: taskPair.message,
    });
    return {
      nextCommitMessage: taskPair.message,
      nextCurrentTaskId: taskPair.taskId,
      nextPlanText,
      sequenceNumber: taskPair.sequenceNumber,
    };
  }
  if (taskPair.shouldBlockCurrentTask) {
    nextLines[currentTaskLineIndex] = replaceStatus(
      nextLines[currentTaskLineIndex] ?? "",
      "BLOCKED"
    );
    nextLines[pairedCommitLineIndex] = replaceStatus(
      nextLines[pairedCommitLineIndex] ?? "",
      "BLOCKED"
    ).replace("hash: TBD", "hash: not-created-core-rejected-before-commit");
  }
  if (params.kind === "acceptance") {
    closeOpenReviewAnchorForAcceptance({
      currentTaskId,
      lines: nextLines,
      pairedCommitLineIndex,
      taskLineIndex: currentTaskLineIndex,
    });
  }
  nextLines.splice(
    pairedCommitLineIndex + 1,
    0,
    formatTaskLine(
      taskNumber,
      taskPair.taskId,
      "IN_PROGRESS",
      taskPair.summary,
      taskPair.scope,
      taskPair.message
    ),
    formatCommitLine(taskNumber + 1, taskPair.message)
  );
  const nextPlanText = replaceState(nextLines.join("\n"), {
    ...state,
    currentTaskId: taskPair.taskId,
    expectedCommitMessage: taskPair.message,
  });
  return {
    nextCommitMessage: taskPair.message,
    nextCurrentTaskId: taskPair.taskId,
    nextPlanText,
    sequenceNumber: taskPair.sequenceNumber,
  };
};
