import { createDiagramModulesPlanMutatorShimSource } from "./managed-diagram-modules-plan-mutator";
import {
  createManagedStagePlan,
  NEXT_STAGE_AFTER,
  STAGE_PLANS,
  STAGE_TERMINAL_COMMITS,
} from "./managed-todo-tree";

const buildStageMappingsBlock = (): string =>
  [
    `const STAGE_PLANS = ${JSON.stringify(STAGE_PLANS)};`,
    `const STAGE_TERMINAL_COMMITS = ${JSON.stringify(STAGE_TERMINAL_COMMITS)};`,
    `const NEXT_STAGE_AFTER = ${JSON.stringify(NEXT_STAGE_AFTER)};`,
    `const STAGE_INITIAL_PLAN_TEXTS = ${JSON.stringify({
      application_skeleton: createManagedStagePlan("application_skeleton"),
      diagram_modules: createManagedStagePlan("diagram_modules"),
      quality_gates: createManagedStagePlan("quality_gates"),
    })};`,
  ].join("\n");

export const createPlanCliShim = (): string => `#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const ARTIFACT_COMMIT_ENV = "CODEAI_MANAGED_ARTIFACT_COMMIT";
const LEDGER_COMMIT_MESSAGE = "chore: record managed workspace ledger";
const LEDGER_COMMIT_ENV = "CODEAI_MANAGED_LEDGER_COMMIT";
const START = "<!-- codeai-plan-state:start -->";
const END = "<!-- codeai-plan-state:end -->";
const WORKSPACE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_END = "<!-- codeai-workspace-plan-state:end -->";
const TASK_LINE_RE = new RegExp("^\\\\d+\\\\. \\\\[(?:TODO|IN_PROGRESS)\\\\].*?\`([^\`]+)\`.*expected commit: (?:\`([^\`]+)\`|none)", "u");
const PRODUCT_PART_DECLARATION_RE = /^###\\s+Product Part:\\s*([a-z0-9]+(?:-[a-z0-9]+)*)\\s*$/gimu;
${buildStageMappingsBlock()}

const parseJsonBlock = (text, start, end, label) => {
  const block = text.split(start)[1]?.split(end)[0];
  if (!block) {
    throw new Error(\`Missing \${label} block\`);
  }
  const fence = String.fromCharCode(96).repeat(3);
  const json = block
    .trim()
    .replace(new RegExp("^" + fence + "json\\s*", "u"), "")
    .replace(new RegExp("\\s*" + fence + "$", "u"), "")
    .trim();
  return JSON.parse(json);
};

const readWorkspaceState = () => {
  if (!existsSync(WORKSPACE_PLAN_PATH)) {
    throw new Error("Missing doc/TODO/workspace.plan.md");
  }
  return parseJsonBlock(readFileSync(WORKSPACE_PLAN_PATH, "utf8"), WORKSPACE_START, WORKSPACE_END, "codeai-workspace-plan-state");
};

const activePlanPath = () => {
  const workspaceState = readWorkspaceState();
  if (!workspaceState.activePlanPath || typeof workspaceState.activePlanPath !== "string") {
    throw new Error("Workspace plan requires activePlanPath");
  }
  return workspaceState.activePlanPath;
};

const readState = () => {
  const planPath = activePlanPath();
  if (!existsSync(planPath)) {
    throw new Error(\`Missing active managed plan: \${planPath}\`);
  }
  return parseJsonBlock(readFileSync(planPath, "utf8"), START, END, "codeai-plan-state");
};

const readPlanText = () => readFileSync(activePlanPath(), "utf8");
const readWorkspaceText = () => readFileSync(WORKSPACE_PLAN_PATH, "utf8");
const readPlanStateAt = (planPath) => {
  if (!(typeof planPath === "string" && existsSync(planPath))) {
    return null;
  }
  try {
    return parseJsonBlock(readFileSync(planPath, "utf8"), START, END, "codeai-plan-state");
  } catch {
    return null;
  }
};

const ensureParentDirectory = (filePath) => {
  const parts = filePath.split("/");
  parts.pop();
  const directory = parts.join("/");
  if (directory) {
    mkdirSync(directory, { recursive: true });
  }
};

const ensureStagePlanForStage = (stage) => {
  const planPath = STAGE_PLANS[stage];
  const planText = STAGE_INITIAL_PLAN_TEXTS[stage];
  if (!(typeof planPath === "string" && typeof planText === "string")) {
    return null;
  }
  if (!existsSync(planPath)) {
    ensureParentDirectory(planPath);
    writeFileSync(planPath, planText, "utf8");
  }
  return planPath;
};

const validate = () => {
  const state = readState();
  if (state.debt) {
    throw new Error("Plan debt is open");
  }
  if (state.executionScopeStatus === "ACTIVE" && !state.currentTaskId) {
    throw new Error("ACTIVE plan requires currentTaskId");
  }
  return state;
};

const runGit = (args) => {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "git command failed").trim());
  }
  return result.stdout.trim();
};

const hasStagedChanges = () => {
  const result = spawnSync("git", ["diff", "--cached", "--quiet"]);
  return result.status !== 0;
};

const listStagedFiles = () =>
  runGit(["diff", "--cached", "--name-only"])
    .split("\\n")
    .map((entry) => entry.trim())
    .filter(Boolean);

const nextTaskId = (taskId) => {
  const match = /^(.*\\.task)(\\d+)$/u.exec(taskId);
  if (!match) {
    return \`\${taskId}.next\`;
  }
  return \`\${match[1]}\${Number(match[2]) + 1}\`;
};

const readTaskLine = (line) => {
  const match = TASK_LINE_RE.exec(line); return match ? { id: match[1], message: match[2] ?? null } : null;
};
const summarizeStagedFiles = (files, fallbackMessage) => {
  const productParts = files
    .map((file) => /diagram_modules\\/product-parts\\/([^/]+)\\.md$/u.exec(file)?.[1])
    .filter(Boolean);
  if (productParts.length > 0) {
    return \`Update Diagram Modules Product Part artifacts: \${productParts.join(", ")}\`;
  }
  if (files.some((file) => file.includes("/diagram_modules/product-parts.index.md"))) {
    return "Update Diagram Modules Product Part index artifact";
  }
  if (files.some((file) => file.includes("/application_skeleton/"))) {
    return files.some((file) => file.startsWith("product-parts/")) ? "Update Application Skeleton artifacts and materialized filesystem" : "Update Application Skeleton draft contract artifacts";
  }
  if (files.some((file) => file.includes("/quality_gates/"))) {
    return files.some((file) => file.startsWith("scripts/gates/") || file === "package.json" || file === "package-lock.json") ? "Update Quality Gates baseline artifacts and gate files" : "Update Quality Gates draft contract artifacts";
  }
  if (files.length > 0) {
    return \`Update managed workspace files: \${files.slice(0, 5).join(", ")}\`;
  }
  return fallbackMessage;
};

const formatTaskLine = (line, taskId, status, summary, files, message) => {
  const number = /^\\d+\\./u.exec(line)?.[0] ?? "1.";
  const scope =
    files.length > 0
      ? files.slice(0, 5).join(", ")
      : "managed workspace files";
  return \`\${number} [\${status}] \\\`\${taskId}\\\` \${summary} (scope: \\\`\${scope}\\\`; expected commit: \\\`\${message}\\\`).\`;
};

const formatNewTaskLine = (number, taskId, status, summary, scope, message) => \`\${number}. [\${status}] \\\`\${taskId}\\\` \${summary} (scope: \\\`\${scope}\\\`; expected commit: \\\`\${message}\\\`).\`;
${createDiagramModulesPlanMutatorShimSource()}
const insertApplicationSkeletonReviewTaskPair = (lines, commitLineIndex, state, message) => {
  if (state.currentTaskId !== "application-skeleton.phase1.draft.task1" || message !== "docs: draft application skeleton contract") {
    return;
  }
  if (lines.some((line) => line.includes("application-skeleton.phase2.review.task1"))) {
    return;
  }
  const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1;
  lines.splice(
    commitLineIndex + 1,
    0,
    "",
    "## Phase 2 — Application Skeleton Contract Review",
    "",
    "### Stream: User-Led Review",
    "",
    formatNewTaskLine(taskNumber, "application-skeleton.phase2.review.task1", "TODO", "Open Application Skeleton contract review for user-driven revisions; Core must inject revision task pairs or an explicit acceptance task before materialization", ".codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json", "docs: revise application skeleton review revision 1"),
    \`\${taskNumber + 1}. [TODO] Git Commit: \\\`docs: revise application skeleton review revision 1\\\` (hash: TBD)\`
  );
};
const insertApplicationSkeletonMaterializationTaskPair = (lines, commitLineIndex, state, message) => {
  if (state.currentTaskId !== "application-skeleton.phase2.acceptance.task1" || message !== "docs: accept application skeleton contract") {
    return;
  }
  if (lines.some((line) => line.includes("application-skeleton.phase3.materialize.task1"))) {
    return;
  }
  const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1;
  lines.splice(
    commitLineIndex + 1,
    0,
    "",
    "## Phase 3 — Application Skeleton Materialization",
    "",
    "### Stream: Filesystem Projection",
    "",
    formatNewTaskLine(taskNumber, "application-skeleton.phase3.materialize.task1", "TODO", "Materialize the accepted Application Skeleton filesystem projection and stop for Core validation", "product-parts/**, .codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json", "feat: materialize application skeleton"),
    \`\${taskNumber + 1}. [TODO] Git Commit: \\\`feat: materialize application skeleton\\\` (hash: TBD)\`
  );
};
const existingApplicationSkeletonUserReturnRevisionNumbers = (lines) =>
  lines.map((line) => /application-skeleton\\.phase4\\.user-return\\.revision(\\d+)\\.task1/u.exec(line)?.[1]).filter(Boolean).map((value) => Number.parseInt(value, 10)).filter(Number.isFinite);
const shouldInsertApplicationSkeletonUserReturnRevision = (state, message) =>
  (state.currentTaskId === "application-skeleton.phase3.materialize.task1" && message === "feat: materialize application skeleton") ||
  (/^application-skeleton\\.phase4\\.user-return\\.revision\\d+\\.task1$/u.test(state.currentTaskId ?? "") && /^docs: revise application skeleton user return revision \\d+$/u.test(message));
const insertApplicationSkeletonUserReturnRevisionTaskPair = (lines, commitLineIndex, state, message) => {
  if (!shouldInsertApplicationSkeletonUserReturnRevision(state, message)) {
    return;
  }
  const existingRevisions = existingApplicationSkeletonUserReturnRevisionNumbers(lines);
  const nextRevision = (existingRevisions.length > 0 ? Math.max(...existingRevisions) : 0) + 1;
  const taskId = \`application-skeleton.phase4.user-return.revision\${nextRevision}.task1\`;
  if (lines.some((line) => line.includes(\`\${taskId}\`))) {
    return;
  }
  const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1;
  const messageForRevision = \`docs: revise application skeleton user return revision \${nextRevision}\`;
  const phaseLines = lines.some((line) => line.includes("Phase 4 — Persistent Application Skeleton User Return"))
    ? []
    : ["", "## Phase 4 — Persistent Application Skeleton User Return", "", "### Stream: User Return And Revisions", ""];
  lines.splice(
    commitLineIndex + 1,
    0,
    ...phaseLines,
    formatNewTaskLine(taskNumber, taskId, "TODO", \`Apply post-completion Application Skeleton user revision \${nextRevision} and stop for Core acceptance\`, "product-parts/**, .codeai-hub/**/application_skeleton/**, .codeai-hub/**/workflow/revisions/application-skeleton/**", messageForRevision),
    \`\${taskNumber + 1}. [TODO] Git Commit: \\\`\${messageForRevision}\\\` (hash: TBD)\`
  );
};
const replaceState = (text, state) => {
  const blockStart = text.indexOf(START);
  const blockEnd = text.indexOf(END);
  if (blockStart < 0 || blockEnd < 0 || blockEnd <= blockStart) {
    throw new Error("Missing codeai-plan-state block");
  }
  const before = text.slice(0, blockStart + START.length);
  const after = text.slice(blockEnd);
  return \`\${before}\\n\\\`\\\`\\\`json\\n\${JSON.stringify(state, null, 2)}\\n\\\`\\\`\\\`\\n\${after}\`;
};

const replaceWorkspaceState = (text, state) => {
  const blockStart = text.indexOf(WORKSPACE_START);
  const blockEnd = text.indexOf(WORKSPACE_END);
  if (blockStart < 0 || blockEnd < 0 || blockEnd <= blockStart) {
    throw new Error("Missing codeai-workspace-plan-state block");
  }
  const before = text.slice(0, blockStart + WORKSPACE_START.length);
  const after = text.slice(blockEnd);
  return \`\${before}\\n\\\`\\\`\\\`json\\n\${JSON.stringify(state, null, 2)}\\n\\\`\\\`\\\`\\n\${after}\`;
};

const advancePlanForCommit = (message) => {
  const state = validate();
  const workspaceState = readWorkspaceState();
  const planPath = activePlanPath();
  const changedFiles = listStagedFiles();
  const summary = summarizeStagedFiles(changedFiles, message);
  if (state.expectedCommitMessage && message !== state.expectedCommitMessage) {
    throw new Error(\`Expected commit message: \${state.expectedCommitMessage}\`);
  }
  if (!state.currentTaskId) {
    throw new Error("ACTIVE plan requires currentTaskId");
  }

  const text = readPlanText();
  const lines = text.split("\\n");
  const taskLineIndex = lines.findIndex((line) =>
    line.includes(\`\\\`\${state.currentTaskId}\\\`\`)
  );
  if (taskLineIndex < 0) {
    throw new Error(\`Current task not found: \${state.currentTaskId}\`);
  }
  const commitLineIndex = lines.findIndex(
    (line, index) =>
      index > taskLineIndex &&
      line.includes(\`Git Commit: \\\`\${message}\\\`\`)
  );
  if (commitLineIndex < 0) {
    throw new Error(\`Git Commit item not found: \${message}\`);
  }

  insertDiagramModulesProductPartTasks(lines, commitLineIndex, changedFiles);
  insertApplicationSkeletonReviewTaskPair(lines, commitLineIndex, state, message);
  insertApplicationSkeletonMaterializationTaskPair(lines, commitLineIndex, state, message);
  insertApplicationSkeletonUserReturnRevisionTaskPair(lines, commitLineIndex, state, message);

  const nextTaskLineIndex = lines.findIndex(
    (line, index) => index > commitLineIndex && readTaskLine(line)
  );
  const nextTask = readTaskLine(lines[nextTaskLineIndex] ?? "");
  const nextId = nextTask?.id ?? nextTaskId(state.currentTaskId);
  const nextMessage = nextTask ? nextTask.message : message;
  lines[taskLineIndex] = formatTaskLine(
    lines[taskLineIndex],
    state.currentTaskId,
    "DONE",
    summary,
    changedFiles,
    message
  );
  lines[commitLineIndex] = lines[commitLineIndex]
    .replace("[TODO]", "[DONE]")
    .replace("hash: TBD", "hash: included-in-commit");

  if (nextTaskLineIndex >= 0) {
    lines[nextTaskLineIndex] = lines[nextTaskLineIndex].replace(
      "[TODO]",
      "[IN_PROGRESS]"
    );
  } else {
    const nextNumber = lines
      .slice(0, commitLineIndex + 1)
      .filter((line) => /^\\d+\\. /u.test(line)).length + 1;
    lines.splice(
      commitLineIndex + 1,
      0,
      formatTaskLine(
        String(nextNumber) + ". [IN_PROGRESS] \`" + nextId + "\`",
        nextId,
        "IN_PROGRESS",
        \`Continue managed \${workspaceState.activeStage ?? "stage"} updates\`,
        [],
        nextMessage
      ),
      \`\${nextNumber + 1}. [TODO] Git Commit: \\\`\${nextMessage}\\\` (hash: TBD)\`
    );
  }

  const nextState = {
    ...state,
    lastRecordedCommit: "included-in-commit",
    currentTaskId: nextId,
    expectedCommitMessage: nextMessage,
  };
  writeFileSync(
    planPath,
    replaceState(lines.join("\\n"), nextState),
    "utf8"
  );
  return {
    message,
    planPath,
    stage: workspaceState.activeStage ?? "unknown",
    changedFiles,
    summary,
    taskId: state.currentTaskId,
  };
};

const backfillPlanCommitHash = (event, commitHash) => {
  const planText = readFileSync(event.planPath, "utf8");
  writeFileSync(
    event.planPath,
    planText
      .replace("hash: included-in-commit", \`hash: \${commitHash}\`)
      .replace(
        '"lastRecordedCommit": "included-in-commit"',
        \`"lastRecordedCommit": "\${commitHash}"\`
      ),
    "utf8"
  );
};

const stringArray = (value) => Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
const appendUniqueString = (values, value) => typeof value === "string" && value.length > 0 && !values.includes(value) ? [...values, value] : values;
const shouldUnlockDiagramModulesNextStage = (event, currentStage) => {
  if (currentStage !== "diagram_modules") {
    return false;
  }
  const planState = readPlanStateAt(event.planPath);
  return /^diagram-modules\\.user-return\\.revision\\d+\\.task1$/u.test(
    planState?.currentTaskId ?? ""
  );
};
const resolveWorkspaceLifecycleFields = (event, workspaceState) => {
  const currentStage = typeof workspaceState.activeStage === "string" ? workspaceState.activeStage : null;
  if (!currentStage) {
    return {};
  }
  const terminalMessage = STAGE_TERMINAL_COMMITS[currentStage];
  const terminalNextStage =
    typeof terminalMessage === "string" && terminalMessage === event.message
      ? NEXT_STAGE_AFTER[currentStage] ?? null
      : null;
  const unlockedNextStage = shouldUnlockDiagramModulesNextStage(event, currentStage)
    ? NEXT_STAGE_AFTER[currentStage] ?? null
    : terminalNextStage;
  const baseUnlockedStages = stringArray(workspaceState.unlockedStages);
  const unlockedStages = appendUniqueString(
    appendUniqueString(baseUnlockedStages, currentStage),
    unlockedNextStage
  );
  const completedStages =
    terminalNextStage || unlockedNextStage
      ? appendUniqueString(stringArray(workspaceState.completedStages), currentStage)
      : stringArray(workspaceState.completedStages);
  return {
    ...(terminalNextStage ? { activeStage: terminalNextStage, activePlanPath: STAGE_PLANS[terminalNextStage] } : {}),
    completedStages,
    unlockedStages,
  };
};

const recordWorkspaceCommit = (event, workspaceState, commitHash, commitFullHash) => {
  const acceptedCommits = Array.isArray(workspaceState.acceptedCommits) ? workspaceState.acceptedCommits : [];
  const commitRecord = { commitFullHash, commitHash, changedFiles: event.changedFiles, message: event.message, planPath: event.planPath, stage: event.stage, summary: event.summary, taskId: event.taskId };
  const lifecycleFields = resolveWorkspaceLifecycleFields(event, workspaceState);
  if (typeof lifecycleFields.activeStage === "string") {
    ensureStagePlanForStage(lifecycleFields.activeStage);
  }
  const nextState = { ...workspaceState, ...lifecycleFields, lastAcceptedCommitHash: commitHash, lastAcceptedCommitMessage: event.message, acceptedCommits: [...acceptedCommits, commitRecord] };
  writeFileSync(WORKSPACE_PLAN_PATH, replaceWorkspaceState(readWorkspaceText(), nextState), "utf8");
};

const createWorkspaceLedgerCommit = () => {
  runGit(["add", WORKSPACE_PLAN_PATH, ...Object.values(STAGE_PLANS).filter((planPath) => existsSync(planPath))]);
  if (!hasStagedChanges()) {
    return;
  }
  const result = spawnSync("git", ["commit", "-m", LEDGER_COMMIT_MESSAGE], {
    env: { ...process.env, [LEDGER_COMMIT_ENV]: "1" },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Failed to commit managed workspace ledger");
  }
};

const command = process.argv[2];

try {
  if (command === "status") {
    const state = validate();
    console.log(\`Execution Scope Status: \${state.executionScopeStatus}\`);
    console.log(\`Current Task: \${state.currentTaskId ?? "none"}\`);
    console.log(\`Expected Commit: \${state.expectedCommitMessage ?? "none"}\`);
  } else if (command === "validate" || command === "post-commit") {
    validate();
  } else if (command === "repair") {
    console.log("Plan repair shim: no repair action required");
  } else if (command === "commit-msg") {
    const state = validate();
    const message = readFileSync(process.argv[3], "utf8").trim();
    if (process.env[LEDGER_COMMIT_ENV] === "1" && message === LEDGER_COMMIT_MESSAGE) {
      process.exitCode = 0;
      process.exit();
    }
    if (process.env[ARTIFACT_COMMIT_ENV] === message) { process.exitCode = 0; process.exit(); }
    if (state.expectedCommitMessage && message !== state.expectedCommitMessage) {
      throw new Error(\`Expected commit message: \${state.expectedCommitMessage}\`);
    }
  } else if (command === "commit") {
    const message = process.argv.slice(3).join(" ");
    if (!hasStagedChanges()) {
      throw new Error("No staged changes to commit");
    }
    const event = advancePlanForCommit(message);
    runGit(["add", activePlanPath()]);
    const result = spawnSync("git", ["commit", "-m", message], { env: { ...process.env, [ARTIFACT_COMMIT_ENV]: message }, stdio: "inherit" });
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
    } else {
      const workspaceState = readWorkspaceState();
      const commitHash = runGit(["rev-parse", "--short", "HEAD"]);
      const commitFullHash = runGit(["rev-parse", "HEAD"]);
      backfillPlanCommitHash(event, commitHash);
      recordWorkspaceCommit(event, workspaceState, commitHash, commitFullHash);
      runGit(["add", event.planPath]);
      createWorkspaceLedgerCommit();
      process.exitCode = 0;
    }
  } else {
    throw new Error("Usage: plan-cli.mjs <status|validate|commit|repair|commit-msg|post-commit>");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
`;
