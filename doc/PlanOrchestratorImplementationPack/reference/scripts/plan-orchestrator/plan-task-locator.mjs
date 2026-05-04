const PLAN_ITEM_LINE_PATTERN =
  /^(\s*\d+\.\s+)\[(TODO|IN_PROGRESS|DONE|BLOCKED|PENDING)\](\s+(?:`([^`]+)`\s+)?(.*))$/u;

const GIT_COMMIT_PATTERN = /Git Commit:\s*`([^`]+)`/u;
const EXPECTED_COMMIT_PATTERN = /expected commit:\s*`([^`]+)`/u;
const ITEM_STATUS_PATTERN = /\[(TODO|IN_PROGRESS|DONE|BLOCKED|PENDING)\]/u;
const COMMIT_HASH_PATTERN = /\(hash:\s*[^)]+\)/u;

const parseLine = (line, lineIndex) => {
  const match = line.match(PLAN_ITEM_LINE_PATTERN);

  if (!match) {
    return null;
  }

  const text = match[5];
  const gitCommitMatch = text.match(GIT_COMMIT_PATTERN);
  const expectedCommitMatch = text.match(EXPECTED_COMMIT_PATTERN);

  return {
    expectedCommitMessage: expectedCommitMatch?.[1] ?? null,
    id: match[4] ?? null,
    isCommitItem: Boolean(gitCommitMatch),
    line,
    lineIndex,
    prefix: match[1],
    rest: match[3],
    status: match[2],
    text,
    commitMessage: gitCommitMatch?.[1] ?? null,
  };
};

export const parsePlanItemLines = (markdown) =>
  markdown.split("\n").flatMap((line, lineIndex) => {
    const item = parseLine(line, lineIndex);
    return item === null ? [] : [item];
  });

export const replaceItemStatus = (line, status) =>
  line.replace(ITEM_STATUS_PATTERN, `[${status}]`);

export const replaceCommitHash = (line, commitHash) =>
  line.replace(COMMIT_HASH_PATTERN, `(hash: ${commitHash})`);

export const findTaskExpectedCommitMessage = (lines, itemLineIndex) => {
  for (let index = itemLineIndex; index < lines.length; index += 1) {
    if (index > itemLineIndex && PLAN_ITEM_LINE_PATTERN.test(lines[index])) {
      return null;
    }

    const match = lines[index].match(EXPECTED_COMMIT_PATTERN);

    if (match) {
      return match[1];
    }
  }

  return null;
};

export const locateTaskPair = (markdown, taskId) => {
  const items = parsePlanItemLines(markdown);
  const task = items.find((item) => item.id === taskId);

  if (!task) {
    throw new Error(`Plan task not found: ${taskId}`);
  }

  const pairedCommit = items.find((item) => item.lineIndex > task.lineIndex);

  if (!pairedCommit?.isCommitItem) {
    throw new Error(`Paired Git Commit item not found for task: ${taskId}`);
  }

  return { items, pairedCommit, task };
};

export const locateNextTask = (items, afterLineIndex) =>
  items.find(
    (item) =>
      item.lineIndex > afterLineIndex &&
      !item.isCommitItem &&
      item.id !== null &&
      item.status === "TODO"
  ) ?? null;
