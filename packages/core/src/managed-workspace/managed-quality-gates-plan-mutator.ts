const STATE_BLOCK_RE =
  /<!-- codeai-plan-state:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- codeai-plan-state:end -->/u;
const STATUS_TOKEN_RE = /\[(TODO|IN_PROGRESS|DONE|BLOCKED|PENDING)\]/u;
const TASK_NUMBER_PREFIX_RE = /^\d+\. /u;
const REVIEW_REVISION_RE =
  /`quality-gates\.phase2\.review\.revision(\d+)\.task1`/gu;
const REVIEW_TASK_ID = "quality-gates.phase2.review.task1";
const REPAIR_RE = /`quality-gates\.[^`]+\.repair(\d+)\.task1`/gu;
const REVIEW_ACCEPTED_WITHOUT_REVISION_HASH =
  "hash: not-created-user-accepted-without-review-revision";
const USER_RETURN_REVISION_RE =
  /`quality-gates\.phase4\.user-return\.revision(\d+)\.task1`/gu;
const TASK_LINE_NUMBER_RE = /^(\d+)\./u;

const DRAFT_AND_REVIEW_SCOPE =
  ".codeai-hub/**/quality_gates/quality-gates.md, .codeai-hub/**/quality_gates/quality-gates.json";
const INTEGRATION_SCOPE =
  ".codeai-hub/**/quality_gates/**, package.json, package-lock.json, scripts/gates/**, .husky/**";
const USER_RETURN_SCOPE =
  ".codeai-hub/**/quality_gates/**, .codeai-hub/**/workflow/revisions/quality-gates/**";
const REPAIR_SCOPE =
  ".codeai-hub/**/quality_gates/**, .codeai-hub/**/workflow/revisions/quality-gates/attempts/**";

export type QualityGatesPlanTaskKind =
  | "acceptance"
  | "integration"
  | "repair"
  | "review_revision"
  | "user_return_revision";

export interface QualityGatesTaskPairInjection {
  readonly nextCommitMessage: string;
  readonly nextCurrentTaskId: string;
  readonly nextPlanText: string;
  readonly sequenceNumber: number | null;
}

export interface QualityGatesTaskPairInjectionParams {
  readonly diagnostics?: readonly string[];
  readonly kind: QualityGatesPlanTaskKind;
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

const renumberTaskLinesFrom = (
  lines: string[],
  startIndex: number,
  delta: number
): void => {
  if (delta === 0) {
    return;
  }
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const match = TASK_LINE_NUMBER_RE.exec(line ?? "");
    if (!match) {
      continue;
    }
    const currentNumber = Number.parseInt(match[1] ?? "", 10);
    if (!Number.isFinite(currentNumber) || currentNumber <= 0) {
      continue;
    }
    lines[index] = line.replace(
      TASK_LINE_NUMBER_RE,
      `${currentNumber + delta}.`
    );
  }
};

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
  params: QualityGatesTaskPairInjectionParams
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
    const message = `docs: revise quality gates contract - revision ${sequenceNumber}`;
    return {
      message,
      scope: DRAFT_AND_REVIEW_SCOPE,
      sequenceNumber,
      shouldBlockCurrentTask: false,
      summary: `Apply Quality Gates contract review revision ${sequenceNumber} and stop for Core acceptance`,
      taskId: `quality-gates.phase2.review.revision${sequenceNumber}.task1`,
    };
  }
  if (params.kind === "acceptance") {
    return {
      message: "docs: accept quality gates contract",
      scope: DRAFT_AND_REVIEW_SCOPE,
      sequenceNumber: null,
      shouldBlockCurrentTask: false,
      summary:
        "Record Core-owned Quality Gates contract acceptance state before integration is requested",
      taskId: "quality-gates.phase2.acceptance.task1",
    };
  }
  if (params.kind === "integration") {
    return {
      message: "feat: integrate quality gates baseline",
      scope: INTEGRATION_SCOPE,
      sequenceNumber: null,
      shouldBlockCurrentTask: false,
      summary:
        "Integrate the accepted Quality Gates baseline into the materialized Application Skeleton and stop for Core validation",
      taskId: "quality-gates.phase3.integration.task1",
    };
  }
  if (params.kind === "user_return_revision") {
    const sequenceNumber =
      countMatches(params.planText, USER_RETURN_REVISION_RE) + 1;
    const message = `docs: revise quality gates user return revision ${sequenceNumber}`;
    return {
      message,
      scope: USER_RETURN_SCOPE,
      sequenceNumber,
      shouldBlockCurrentTask: false,
      summary: `Apply post-completion Quality Gates user revision ${sequenceNumber} and stop for Core acceptance`,
      taskId: `quality-gates.phase4.user-return.revision${sequenceNumber}.task1`,
    };
  }
  const sequenceNumber = countMatches(params.planText, REPAIR_RE) + 1;
  const targetPhase = params.targetPhase?.trim() || "current";
  const message = `docs: repair quality gates ${targetPhase} attempt ${sequenceNumber}`;
  return {
    message,
    scope: REPAIR_SCOPE,
    sequenceNumber,
    shouldBlockCurrentTask: true,
    summary: `${params.targetSummary?.trim() || "Core rejected the previous Quality Gates attempt; repair only the named artifact set"}; target phase: \`${targetPhase}\`; diagnostics: ${diagnosticsSummary(params.diagnostics)}`,
    taskId: `quality-gates.${targetPhase}.repair${sequenceNumber}.task1`,
  };
};

export const injectQualityGatesTaskPair = (
  params: QualityGatesTaskPairInjectionParams
): QualityGatesTaskPairInjection | null => {
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
      formatCommitLine(revisionTaskNumber + 1, taskPair.message),
      ""
    );
    renumberTaskLinesFrom(nextLines, currentTaskLineIndex + 3, 2);
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
  renumberTaskLinesFrom(nextLines, pairedCommitLineIndex + 3, 2);
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

export const createQualityGatesPlanMutatorShimSource = (): string => `
const insertQualityGatesReviewTaskPair = (lines, commitLineIndex, state, message) => {
  if (state.currentTaskId !== "quality-gates.phase1.draft.task1" || message !== "docs: draft quality gates contract") { return; }
  if (lines.some((line) => line.includes("quality-gates.phase2.review.task1"))) { return; }
  const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1;
  lines.splice(commitLineIndex + 1, 0, "", "## Phase 2 — Quality Gates Contract Review", "", "### Stream: User-Led Review", "", formatNewTaskLine(taskNumber, "quality-gates.phase2.review.task1", "TODO", "Open Quality Gates contract review for user-driven revisions; Core must inject revision task pairs or an explicit acceptance task before integration", ".codeai-hub/**/quality_gates/quality-gates.md, .codeai-hub/**/quality_gates/quality-gates.json", "docs: revise quality gates contract - revision 1"), \`\${taskNumber + 1}. [TODO] Git Commit: \\\`docs: revise quality gates contract - revision 1\\\` (hash: TBD)\`);
};
const insertQualityGatesIntegrationTaskPair = (lines, commitLineIndex, state, message) => {
  if (state.currentTaskId !== "quality-gates.phase2.acceptance.task1" || message !== "docs: accept quality gates contract") { return; }
  if (lines.some((line) => line.includes("quality-gates.phase3.integration.task1"))) { return; }
  const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1;
  lines.splice(commitLineIndex + 1, 0, "", "## Phase 3 — Quality Gates Integration", "", "### Stream: Accepted-Only Integration", "", formatNewTaskLine(taskNumber, "quality-gates.phase3.integration.task1", "TODO", "Integrate the accepted Quality Gates baseline into the materialized Application Skeleton and stop for Core validation", ".codeai-hub/**/quality_gates/**, package.json, package-lock.json, scripts/gates/**, .husky/**", "feat: integrate quality gates baseline"), \`\${taskNumber + 1}. [TODO] Git Commit: \\\`feat: integrate quality gates baseline\\\` (hash: TBD)\`);
};
const QUALITY_GATES_JSON_FILE_RE = /\\/quality_gates\\/quality-gates\\.json$/u;
const QUALITY_GATES_MARKDOWN_FILE_RE = /\\/quality_gates\\/quality-gates\\.md$/u;
const QUALITY_GATES_REPAIR_COMMIT_RE = /^docs: repair quality gates phase3\\.integration attempt \\d+$/u;
const readQualityGatesJsonObject = (filePath) => {
  if (!(typeof filePath === "string" && existsSync(filePath))) { return null; }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
const readQualityGatesText = (filePath) =>
  typeof filePath === "string" && existsSync(filePath)
    ? readFileSync(filePath, "utf8")
    : null;
const readQualityGatesBooleanFlag = (value, key) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value) && value[key] === true);
const hasQualityGatesCommands = (value) =>
  Boolean(value && typeof value.commands === "object" && value.commands !== null && !Array.isArray(value.commands));
const readQualityGatesStringArray = (value, key) =>
  Array.isArray(value?.[key])
    ? value[key].filter((entry) => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean)
    : [];
const readQualityGatesPackageScripts = () => {
  const packageJson = readQualityGatesJsonObject("package.json");
  const scripts = packageJson?.scripts;
  if (!(typeof scripts === "object" && scripts !== null && !Array.isArray(scripts))) { return {}; }
  return Object.fromEntries(Object.entries(scripts).filter((entry) => typeof entry[1] === "string"));
};
const toQualityGatesPackageScriptName = (gateId) =>
  gateId.startsWith("qg-") ? \`qg:\${gateId.slice("qg-".length)}\` : gateId;
const hasQualityGatesAggregateHookRunner = ({ hookText, packageScripts, scope, scriptName }) => {
  const script = packageScripts[scriptName];
  return Boolean(script?.includes("scripts/quality-gates/run.mjs") && script.includes(scope) && (hookText.includes(scriptName) || hookText.includes(\`npm run \${scriptName}\`)));
};
const validateQualityGatesHookCommands = ({ gateIds, hookText }) =>
  gateIds.filter((gateId) => {
    const packageScriptName = toQualityGatesPackageScriptName(gateId);
    return !(hookText.includes(gateId) || hookText.includes(packageScriptName));
  });
const validateQualityGatesDeclaredHookIntegration = (contract) => {
  const packageScripts = readQualityGatesPackageScripts();
  const preCommitText = readQualityGatesText(".husky/pre-commit") ?? "";
  const prePushText = readQualityGatesText(".husky/pre-push") ?? "";
  const preCommitGateIds = readQualityGatesStringArray(contract, "requiredBeforeCommit");
  const prePushGateIds = readQualityGatesStringArray(contract, "requiredBeforePush");
  return [
    ...(hasQualityGatesAggregateHookRunner({ hookText: preCommitText, packageScripts, scope: "requiredBeforeCommit", scriptName: "qg:before-commit" }) ? [] : validateQualityGatesHookCommands({ gateIds: preCommitGateIds, hookText: preCommitText })),
    ...(hasQualityGatesAggregateHookRunner({ hookText: prePushText, packageScripts, scope: "requiredBeforePush", scriptName: "qg:before-push" }) ? [] : validateQualityGatesHookCommands({ gateIds: prePushGateIds, hookText: prePushText })),
  ];
};
const hasQualityGatesIntegratedPaths = (contract) => {
  const integratedPaths = readQualityGatesStringArray(contract, "integratedPaths");
  return integratedPaths.length > 0 && integratedPaths.every((entry) => existsSync(entry));
};
const isValidatedQualityGatesIntegration = (changedFiles) => {
  const jsonPath = changedFiles.find((file) => QUALITY_GATES_JSON_FILE_RE.test(file));
  if (!jsonPath) { return false; }
  const markdownPath = changedFiles.find((file) => QUALITY_GATES_MARKDOWN_FILE_RE.test(file)) ?? jsonPath.replace("quality-gates.json", "quality-gates.md");
  const contract = readQualityGatesJsonObject(jsonPath);
  if (!(typeof markdownPath === "string" && existsSync(markdownPath) && contract && hasQualityGatesCommands(contract) && readQualityGatesBooleanFlag(contract, "accepted") && readQualityGatesBooleanFlag(contract, "acceptanceCommitted") && readQualityGatesBooleanFlag(contract, "integrated") && contract.integrationState === "integrated" && hasQualityGatesIntegratedPaths(contract))) { return false; }
  return validateQualityGatesDeclaredHookIntegration(contract).length === 0;
};
const existingQualityGatesUserReturnRevisionNumbers = (lines) => lines.map((line) => /quality-gates\\.phase4\\.user-return\\.revision(\\d+)\\.task1/u.exec(line)?.[1]).filter(Boolean).map((value) => Number.parseInt(value, 10)).filter(Number.isFinite);
const shouldInsertQualityGatesUserReturnAnchor = (state, message, changedFiles) =>
  ((state.currentTaskId === "quality-gates.phase3.integration.task1" && message === "feat: integrate quality gates baseline") ||
    (/^quality-gates\\.phase3\\.integration\\.repair\\d+\\.task1$/u.test(state.currentTaskId ?? "") && QUALITY_GATES_REPAIR_COMMIT_RE.test(message))) &&
  isValidatedQualityGatesIntegration(changedFiles);
const insertQualityGatesUserReturnRevisionTaskPair = (lines, commitLineIndex, state, message, changedFiles) => {
  if (shouldInsertQualityGatesUserReturnAnchor(state, message, changedFiles)) {
    if (lines.some((line) => line.includes("quality-gates.phase4.user-return.task1"))) { return; }
    const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1;
    const phaseLines = lines.some((line) => line.includes("Phase 4 — Persistent Quality Gates User Return"))
      ? []
      : ["", "## Phase 4 — Persistent Quality Gates User Return", "", "### Stream: User Return And Revisions", ""];
    lines.splice(commitLineIndex + 1, 0, ...phaseLines, formatNewTaskLine(taskNumber, "quality-gates.phase4.user-return.task1", "TODO", "Open post-completion Quality Gates user-return revisions; Core must inject revision task pairs after real user diffs", ".codeai-hub/**/quality_gates/**, .codeai-hub/**/workflow/revisions/quality-gates/**", "docs: revise quality gates user return revision 1"), \`\${taskNumber + 1}. [TODO] Git Commit: \\\`docs: revise quality gates user return revision 1\\\` (hash: TBD)\`);
    return;
  }
  if (!(/^quality-gates\\.phase4\\.user-return\\.revision\\d+\\.task1$/u.test(state.currentTaskId ?? "") && /^docs: revise quality gates user return revision \\d+$/u.test(message))) { return; }
  const existingRevisions = existingQualityGatesUserReturnRevisionNumbers(lines);
  const nextRevision = (existingRevisions.length > 0 ? Math.max(...existingRevisions) : 0) + 1;
  const taskId = \`quality-gates.phase4.user-return.revision\${nextRevision}.task1\`;
  if (lines.some((line) => line.includes(\`\${taskId}\`))) { return; }
  const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1;
  const messageForRevision = \`docs: revise quality gates user return revision \${nextRevision}\`;
  const phaseLines = lines.some((line) => line.includes("Phase 4 — Persistent Quality Gates User Return"))
    ? []
    : ["", "## Phase 4 — Persistent Quality Gates User Return", "", "### Stream: User Return And Revisions", ""];
  lines.splice(commitLineIndex + 1, 0, ...phaseLines, formatNewTaskLine(taskNumber, taskId, "TODO", \`Apply post-completion Quality Gates user revision \${nextRevision} and stop for Core acceptance\`, ".codeai-hub/**/quality_gates/**, .codeai-hub/**/workflow/revisions/quality-gates/**", messageForRevision), \`\${taskNumber + 1}. [TODO] Git Commit: \\\`\${messageForRevision}\\\` (hash: TBD)\`);
};
`;
