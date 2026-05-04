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

const replaceLine = (lines, lineIndex, nextLine) => {
  const nextLines = [...lines];
  nextLines[lineIndex] = nextLine;
  return nextLines;
};

const normalizeResult = (result) => result.trim().replace(/\s+/gu, " ");

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

export const markTaskDoneAndCommitPending = (markdown, taskId) => {
  const { pairedCommit, task } = locateTaskPair(markdown, taskId);
  let lines = markdown.split("\n");

  lines = replaceLine(
    lines,
    task.lineIndex,
    replaceItemStatus(task.line, "DONE")
  );
  lines = replaceLine(
    lines,
    pairedCommit.lineIndex,
    replaceItemStatus(pairedCommit.line, "PENDING")
  );

  return updatePlanState(lines.join("\n"), (state) => ({
    ...state,
    debt: {
      expectedCommitMessage: state.expectedCommitMessage,
      stage: "commit_pending",
      taskId,
    },
  }));
};

export const finalizeCommitAndAdvance = (markdown, { commitHash, taskId }) => {
  const { items, pairedCommit } = locateTaskPair(markdown, taskId);
  const nextTask = locateNextTask(items, pairedCommit.lineIndex);
  let lines = markdown.split("\n");

  lines = replaceLine(
    lines,
    pairedCommit.lineIndex,
    replaceCommitHash(replaceItemStatus(pairedCommit.line, "DONE"), commitHash)
  );

  if (nextTask) {
    lines = replaceLine(
      lines,
      nextTask.lineIndex,
      replaceItemStatus(nextTask.line, "IN_PROGRESS")
    );
  }

  return updatePlanState(lines.join("\n"), (state) => ({
    ...state,
    currentTaskId: nextTask?.id ?? null,
    debt: null,
    expectedCommitMessage: nextTask
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

  lines = replaceLine(
    lines,
    task.lineIndex,
    replaceItemStatus(replaceTaskResult(task.line, result), "DONE")
  );

  if (nextTask) {
    lines = replaceLine(
      lines,
      nextTask.lineIndex,
      replaceItemStatus(nextTask.line, "IN_PROGRESS")
    );
  }

  return updatePlanState(lines.join("\n"), (state) => ({
    ...state,
    currentTaskId: nextTask?.id ?? null,
    debt: null,
    expectedCommitMessage: nextTask
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
