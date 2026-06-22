import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";
import {
  findTaskExpectedCommitMessage,
  locateNextTask,
  locateTaskPair,
  parsePlanItemLines,
  replaceCommitHash,
  replaceItemStatus,
} from "./plan-task-locator.mjs";

const RESULT_PATTERN = /\s+Result:\s*.*$/u;
const RESERVED_POST_CLOSEOUT_PATTERN =
  /Reserved post-closeout handoff anchor/iu;
const TODO_ARCHIVE_DIR = "doc/TODO/Archive";

const replaceLine = (lines, lineIndex, nextLine) => {
  const nextLines = [...lines];
  nextLines[lineIndex] = nextLine;
  return nextLines;
};

const normalizeResult = (result) => result.trim().replace(/\s+/gu, " ");

const isReservedPostCloseoutTask = (task) =>
  RESERVED_POST_CLOSEOUT_PATTERN.test(task?.text ?? "");

const assertExplicitCloseoutBoundary = (nextTask) => {
  if (nextTask === null) {
    throw new Error(
      "Plan cannot advance to terminal NONE without an explicit reserved post-closeout handoff anchor."
    );
  }
};

const sanitizePathPart = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

const getCloseoutArchivePath = (state) =>
  `${TODO_ARCHIVE_DIR}/todo-plan-closeout-${sanitizePathPart(state.planId)}.md`;

const createTerminalNoneTemplate = ({
  commitHash,
  state,
}) => `# Development TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
${JSON.stringify(
  {
    ...state,
    currentTaskId: null,
    debt: null,
    executionScopeStatus: "NONE",
    expectedCommitMessage: null,
    lastRecordedCommit: commitHash,
  },
  null,
  2
)}
\`\`\`
<!-- codeai-plan-state:end -->

## No Active Execution Scope

- **Execution Scope Status:** NONE
- **Latest closeout archive:** \`${getCloseoutArchivePath(state)}\`
- **Planning source:** \`${state.planningSource}\`
- **Last recorded commit:** \`${commitHash}\`

## Start Next Scope

There is no active execution scope. Before starting new implementation work:

- read \`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md\`;
- use \`doc/SolidWorks-WorkFlow/Docs_Index.md\` to choose relevant documents;
- create or update a planning document under \`doc/SolidWorks-WorkFlow/Plans/\`;
- create a new active \`doc/TODO/todo-plan.md\` only after the new scope is accepted.
`;

const replaceTaskResult = (line, result) => {
  const cleanResult = normalizeResult(result);
  const lineWithoutResult = line.replace(RESULT_PATTERN, "");

  if (!cleanResult) {
    return lineWithoutResult;
  }

  return `${lineWithoutResult} Result: ${cleanResult}`;
};

export const updatePlanState = (markdown, updateState) => {
  const parsed = parsePlanStateMarkdown(markdown);
  const nextState = updateState({ ...parsed.state });
  const nextJson = JSON.stringify(nextState, null, 2);

  return `${markdown.slice(0, parsed.block.start)}${markdown
    .slice(parsed.block.start, parsed.block.end)
    .replace(
      parsed.block.rawJson,
      nextJson
    )}${markdown.slice(parsed.block.end)}`;
};

export const finalizeCommitAndAdvance = (markdown, { commitHash, taskId }) => {
  const { items, pairedCommit, task } = locateTaskPair(markdown, taskId);
  const nextTask = locateNextTask(items, pairedCommit.lineIndex);
  let lines = markdown.split("\n");
  assertExplicitCloseoutBoundary(nextTask);
  const closesScope = isReservedPostCloseoutTask(nextTask);

  if (closesScope) {
    const parsed = parsePlanStateMarkdown(markdown);
    return createTerminalNoneTemplate({
      commitHash,
      state: parsed.state,
    });
  }

  lines = replaceLine(
    lines,
    task.lineIndex,
    replaceItemStatus(task.line, "DONE")
  );
  lines = replaceLine(
    lines,
    pairedCommit.lineIndex,
    replaceCommitHash(replaceItemStatus(pairedCommit.line, "DONE"), commitHash)
  );

  if (nextTask && !closesScope) {
    lines = replaceLine(
      lines,
      nextTask.lineIndex,
      replaceItemStatus(nextTask.line, "IN_PROGRESS")
    );
  }

  if (nextTask && closesScope) {
    lines = replaceLine(
      lines,
      nextTask.lineIndex,
      replaceItemStatus(
        replaceTaskResult(
          nextTask.line,
          "Scope closed by Plan Orchestrator; start a new plan only from NONE state."
        ),
        "DONE"
      )
    );
  }

  return updatePlanState(lines.join("\n"), (state) => ({
    ...state,
    currentTaskId: closesScope ? null : (nextTask?.id ?? null),
    debt: null,
    executionScopeStatus: closesScope ? "NONE" : state.executionScopeStatus,
    expectedCommitMessage:
      !closesScope && nextTask
        ? findTaskExpectedCommitMessage(lines, nextTask.lineIndex)
        : null,
    lastRecordedCommit: commitHash,
  }));
};

export const completeNoCommitTaskAndAdvance = (
  markdown,
  { result, taskId }
) => {
  const items = parsePlanItemLines(markdown);
  const task = items.find((item) => item.id === taskId);

  if (!task) {
    throw new Error(`Plan task not found: ${taskId}`);
  }

  if (task.isCommitItem) {
    throw new Error(`Plan task must not be a Git Commit item: ${taskId}`);
  }

  if (task.status !== "IN_PROGRESS") {
    throw new Error(`Plan task must be IN_PROGRESS: ${taskId}`);
  }

  const nextTask = locateNextTask(items, task.lineIndex);
  let lines = markdown.split("\n");
  assertExplicitCloseoutBoundary(nextTask);
  const closesScope = isReservedPostCloseoutTask(nextTask);

  lines = replaceLine(
    lines,
    task.lineIndex,
    replaceItemStatus(replaceTaskResult(task.line, result), "DONE")
  );

  if (nextTask && !closesScope) {
    lines = replaceLine(
      lines,
      nextTask.lineIndex,
      replaceItemStatus(nextTask.line, "IN_PROGRESS")
    );
  }

  if (nextTask && closesScope) {
    lines = replaceLine(
      lines,
      nextTask.lineIndex,
      replaceItemStatus(
        replaceTaskResult(
          nextTask.line,
          "Scope closed by Plan Orchestrator; start a new plan only from NONE state."
        ),
        "DONE"
      )
    );
  }

  return updatePlanState(lines.join("\n"), (state) => ({
    ...state,
    currentTaskId: closesScope ? null : (nextTask?.id ?? null),
    debt: null,
    executionScopeStatus: closesScope ? "NONE" : state.executionScopeStatus,
    expectedCommitMessage:
      !closesScope && nextTask
        ? findTaskExpectedCommitMessage(lines, nextTask.lineIndex)
        : null,
  }));
};

export const rollbackPendingCommit = (markdown, taskId) => {
  const { pairedCommit, task } = locateTaskPair(markdown, taskId);
  let lines = markdown.split("\n");

  lines = replaceLine(
    lines,
    task.lineIndex,
    replaceItemStatus(task.line, "IN_PROGRESS")
  );
  lines = replaceLine(
    lines,
    pairedCommit.lineIndex,
    replaceItemStatus(pairedCommit.line, "TODO")
  );

  return updatePlanState(lines.join("\n"), (state) => ({
    ...state,
    debt: null,
  }));
};
