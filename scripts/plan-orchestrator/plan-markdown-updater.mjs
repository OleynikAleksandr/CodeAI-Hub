import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";
import {
  findTaskExpectedCommitMessage,
  locateNextTask,
  locateTaskPair,
  replaceCommitHash,
  replaceItemStatus,
} from "./plan-task-locator.mjs";

const replaceLine = (lines, lineIndex, nextLine) => {
  const nextLines = [...lines];
  nextLines[lineIndex] = nextLine;
  return nextLines;
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
