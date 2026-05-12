const STATE_BLOCK_RE =
  /<!-- codeai-plan-state:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- codeai-plan-state:end -->/u;
const STATUS_TOKEN_RE = /\[(TODO|IN_PROGRESS|DONE|BLOCKED|PENDING)\]/u;
const TASK_NUMBER_PREFIX_RE = /^\d+\. /u;
const REVIEW_REVISION_RE =
  /`application-skeleton\.phase2\.review\.revision(\d+)\.task1`/gu;
const REVIEW_TASK_ID = "application-skeleton.phase2.review.task1";
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
  if (params.currentTaskId !== REVIEW_TASK_ID) {
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
        "product-parts/**, .codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json",
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
        "product-parts/**, .codeai-hub/**/application_skeleton/**, .codeai-hub/**/workflow/revisions/application-skeleton/**",
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
      ".codeai-hub/**/application_skeleton/**, product-parts/**, .codeai-hub/**/product-parts/**, .codeai-hub/**/workflow/revisions/application-skeleton/attempts/**",
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

export const createApplicationSkeletonPlanMutatorShimSource = (): string => `
const insertApplicationSkeletonReviewTaskPair = (lines, commitLineIndex, state, message) => {
  if (state.currentTaskId !== "application-skeleton.phase1.draft.task1" || message !== "docs: draft application skeleton contract") { return; }
  if (lines.some((line) => line.includes("application-skeleton.phase2.review.task1"))) { return; }
  const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1;
  lines.splice(commitLineIndex + 1, 0, "", "## Phase 2 — Application Skeleton Contract Review", "", "### Stream: User-Led Review", "", formatNewTaskLine(taskNumber, "application-skeleton.phase2.review.task1", "TODO", "Open Application Skeleton contract review for user-driven revisions; Core must inject revision task pairs or an explicit acceptance task before materialization", ".codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json", "docs: revise application skeleton review revision 1"), \`\${taskNumber + 1}. [TODO] Git Commit: \\\`docs: revise application skeleton review revision 1\\\` (hash: TBD)\`);
};
const insertApplicationSkeletonMaterializationTaskPair = (lines, commitLineIndex, state, message) => {
  if (state.currentTaskId !== "application-skeleton.phase2.acceptance.task1" || message !== "docs: accept application skeleton contract") { return; }
  if (lines.some((line) => line.includes("application-skeleton.phase3.materialize.task1"))) { return; }
  const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1;
  lines.splice(commitLineIndex + 1, 0, "", "## Phase 3 — Application Skeleton Materialization", "", "### Stream: Filesystem Projection", "", formatNewTaskLine(taskNumber, "application-skeleton.phase3.materialize.task1", "TODO", "Materialize the accepted Application Skeleton filesystem projection and stop for Core validation", "product-parts/**, .codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json", "feat: materialize application skeleton"), \`\${taskNumber + 1}. [TODO] Git Commit: \\\`feat: materialize application skeleton\\\` (hash: TBD)\`);
};
const APPLICATION_SKELETON_MAP_FILE_RE = /\\/application_skeleton\\/application-skeleton-map\\.json$/u;
const APPLICATION_SKELETON_MARKDOWN_FILE_RE = /\\/application_skeleton\\/application-skeleton\\.md$/u;
const APPLICATION_SKELETON_REPAIR_COMMIT_RE = /^docs: repair application skeleton phase3\\.materialize attempt \\d+$/u;
const readJsonObjectFile = (filePath) => {
  if (!(typeof filePath === "string" && existsSync(filePath))) { return null; }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
const readApplicationSkeletonBooleanFlag = (value, key) => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) { return false; }
  if (value[key] === true) { return true; }
  const nested = value[key === "accepted" ? "acceptance" : "materialization"];
  return typeof nested === "object" && nested !== null && !Array.isArray(nested) && nested[key] === true;
};
const readApplicationSkeletonMaterializationState = (value) => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) { return null; }
  if (typeof value.materializationState === "string") { return value.materializationState; }
  return typeof value.status === "string" ? value.status : null;
};
const collectApplicationSkeletonCodePaths = (nodes) => {
  if (!Array.isArray(nodes)) { return []; }
  const paths = [];
  for (const node of nodes) {
    if (!(node && typeof node === "object" && !Array.isArray(node))) { continue; }
    if (typeof node.codePath === "string" && node.codePath.trim().length > 0) { paths.push(node.codePath.trim()); }
    for (const key of ["clusters", "modules", "standaloneModules"]) {
      paths.push(...collectApplicationSkeletonCodePaths(node[key]));
    }
  }
  return paths;
};
const hasApplicationSkeletonMarkdownStatus = (markdown, field, value) =>
  new RegExp("(?:\\\\\`" + field + "\\\\\`|" + field + ")\\\\s*:\\\\s*\\\\\`?" + value + "\\\\\`?", "i").test(markdown) ||
  new RegExp("\\\\|\\\\s*\\\\\`?" + field + "\\\\\`?\\\\s*\\\\|\\\\s*\\\\\`?" + value + "\\\\\`?\\\\s*\\\\|", "i").test(markdown);
const hasApplicationSkeletonMaterializedMarkdown = (markdown) =>
  typeof markdown === "string" && [["reviewState", "materialized"], ["accepted", "true"], ["materialized", "true"], ["materializationState", "materialized"]].every(([field, value]) => hasApplicationSkeletonMarkdownStatus(markdown, field, value));
const isValidatedApplicationSkeletonMaterialization = (changedFiles) => {
  const mapPath = changedFiles.find((file) => APPLICATION_SKELETON_MAP_FILE_RE.test(file));
  if (!mapPath) { return false; }
  const markdownPath = changedFiles.find((file) => APPLICATION_SKELETON_MARKDOWN_FILE_RE.test(file)) ?? mapPath.replace("application-skeleton-map.json", "application-skeleton.md");
  if (!existsSync(markdownPath)) { return false; }
  const mapJson = readJsonObjectFile(mapPath);
  const markdown = readFileSync(markdownPath, "utf8");
  if (!(mapJson && mapJson.reviewState === "materialized" && readApplicationSkeletonBooleanFlag(mapJson, "accepted") && readApplicationSkeletonBooleanFlag(mapJson, "materialized") && readApplicationSkeletonMaterializationState(mapJson) === "materialized" && hasApplicationSkeletonMaterializedMarkdown(markdown))) { return false; }
  const materializedPaths = Array.isArray(mapJson.materializedPaths) ? mapJson.materializedPaths.filter((entry) => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim()) : [];
  const codePaths = collectApplicationSkeletonCodePaths(mapJson.productParts);
  const declaredPaths = [...new Set([...materializedPaths, ...codePaths])];
  return declaredPaths.length > 0 && declaredPaths.every((entry) => !entry.startsWith(".codeai-hub") && existsSync(entry));
};
const shouldInsertApplicationSkeletonUserReturnAnchor = (state, message, changedFiles) =>
  ((state.currentTaskId === "application-skeleton.phase3.materialize.task1" && message === "feat: materialize application skeleton") || (/^application-skeleton\\.phase3\\.materialize\\.repair\\d+\\.task1$/u.test(state.currentTaskId ?? "") && APPLICATION_SKELETON_REPAIR_COMMIT_RE.test(message))) && isValidatedApplicationSkeletonMaterialization(changedFiles);
const insertApplicationSkeletonUserReturnTaskAnchor = (lines, commitLineIndex, state, message, changedFiles) => {
  if (!shouldInsertApplicationSkeletonUserReturnAnchor(state, message, changedFiles) || lines.some((line) => line.includes("application-skeleton.phase4.user-return.task1"))) { return; }
  const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1;
  const phaseLines = lines.some((line) => line.includes("Phase 4 — Persistent Application Skeleton User Return")) ? [] : ["", "## Phase 4 — Persistent Application Skeleton User Return", "", "### Stream: User Return And Revisions", ""];
  lines.splice(commitLineIndex + 1, 0, ...phaseLines, formatNewTaskLine(taskNumber, "application-skeleton.phase4.user-return.task1", "TODO", "Open post-completion Application Skeleton user-return revisions; Core must inject revision task pairs after real user diffs", "product-parts/**, .codeai-hub/**/application_skeleton/**, .codeai-hub/**/workflow/revisions/application-skeleton/**", "docs: revise application skeleton user return revision 1"), \`\${taskNumber + 1}. [TODO] Git Commit: \\\`docs: revise application skeleton user return revision 1\\\` (hash: TBD)\`);
};
const existingApplicationSkeletonUserReturnRevisionNumbers = (lines) => lines.map((line) => /application-skeleton\\.phase4\\.user-return\\.revision(\\d+)\\.task1/u.exec(line)?.[1]).filter(Boolean).map((value) => Number.parseInt(value, 10)).filter(Number.isFinite);
const shouldInsertApplicationSkeletonUserReturnRevision = (state, message) =>
  /^application-skeleton\\.phase4\\.user-return\\.revision\\d+\\.task1$/u.test(state.currentTaskId ?? "") && /^docs: revise application skeleton user return revision \\d+$/u.test(message);
const insertApplicationSkeletonUserReturnRevisionTaskPair = (lines, commitLineIndex, state, message) => {
  if (!shouldInsertApplicationSkeletonUserReturnRevision(state, message)) { return; }
  const existingRevisions = existingApplicationSkeletonUserReturnRevisionNumbers(lines);
  const nextRevision = (existingRevisions.length > 0 ? Math.max(...existingRevisions) : 0) + 1;
  const taskId = \`application-skeleton.phase4.user-return.revision\${nextRevision}.task1\`;
  if (lines.some((line) => line.includes(\`\${taskId}\`))) { return; }
  const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1;
  const messageForRevision = \`docs: revise application skeleton user return revision \${nextRevision}\`;
  const phaseLines = lines.some((line) => line.includes("Phase 4 — Persistent Application Skeleton User Return")) ? [] : ["", "## Phase 4 — Persistent Application Skeleton User Return", "", "### Stream: User Return And Revisions", ""];
  lines.splice(commitLineIndex + 1, 0, ...phaseLines, formatNewTaskLine(taskNumber, taskId, "TODO", \`Apply post-completion Application Skeleton user revision \${nextRevision} and stop for Core acceptance\`, "product-parts/**, .codeai-hub/**/application_skeleton/**, .codeai-hub/**/workflow/revisions/application-skeleton/**", messageForRevision), \`\${taskNumber + 1}. [TODO] Git Commit: \\\`\${messageForRevision}\\\` (hash: TBD)\`);
};
`;
