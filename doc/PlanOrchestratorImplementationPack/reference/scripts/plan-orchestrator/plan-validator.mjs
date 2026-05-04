import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";
import { PlanStateError } from "./plan-state-types.mjs";

const PLAN_ITEM_PATTERN =
  /^\s*\d+\.\s+\[(TODO|IN_PROGRESS|DONE|BLOCKED|PENDING)\]\s+(?:`([^`]+)`\s+)?(.+)$/gmu;

const EXPECTED_COMMIT_PATTERN = /expected commit:\s*`([^`]+)`/u;
const GIT_COMMIT_PATTERN = /Git Commit:\s*`([^`]+)`/u;

const createIssue = (code, message, details = {}) => ({
  code,
  details,
  message,
});

export const extractPlanItems = (markdown) =>
  Array.from(markdown.matchAll(PLAN_ITEM_PATTERN), (match, index) => {
    const text = match[3].trim();
    const commitMatch = text.match(GIT_COMMIT_PATTERN);
    const expectedCommitMatch = text.match(EXPECTED_COMMIT_PATTERN);

    return {
      commitMessage: commitMatch?.[1] ?? null,
      expectedCommitMessage: expectedCommitMatch?.[1] ?? null,
      id: match[2] ?? null,
      index,
      isCommitItem: Boolean(commitMatch),
      status: match[1],
      text,
    };
  });

const validateUniqueTaskIds = (items) => {
  const issues = [];
  const seenIds = new Set();

  for (const item of items) {
    if (item.id === null) {
      continue;
    }

    if (seenIds.has(item.id)) {
      issues.push(
        createIssue(
          "PLAN_DUPLICATE_TASK_ID",
          `Duplicate task id "${item.id}".`,
          {
            taskId: item.id,
          }
        )
      );
      continue;
    }

    seenIds.add(item.id);
  }

  return issues;
};

const validateCurrentTask = (state, items) => {
  if (state.executionScopeStatus !== "ACTIVE") {
    return [];
  }

  const currentItems = items.filter((item) => item.id === state.currentTaskId);

  if (currentItems.length !== 1) {
    return [
      createIssue(
        "PLAN_CURRENT_TASK_NOT_UNIQUE",
        `Expected exactly one current task "${state.currentTaskId}".`,
        { count: currentItems.length, currentTaskId: state.currentTaskId }
      ),
    ];
  }

  const [currentItem] = currentItems;
  const nextItem = items[currentItem.index + 1];
  const issues = [];

  if (currentItem.status !== "IN_PROGRESS") {
    issues.push(
      createIssue(
        "PLAN_CURRENT_TASK_STATUS_INVALID",
        `Current task "${state.currentTaskId}" must be IN_PROGRESS.`,
        { actual: currentItem.status, currentTaskId: state.currentTaskId }
      )
    );
  }

  if (!nextItem?.isCommitItem) {
    if (state.expectedCommitMessage !== null) {
      issues.push(
        createIssue(
          "PLAN_PAIRED_COMMIT_MISSING",
          `Current task "${state.currentTaskId}" must be followed by Git Commit item.`,
          { currentTaskId: state.currentTaskId }
        )
      );
    }

    return issues;
  }

  if (nextItem.commitMessage !== state.expectedCommitMessage) {
    issues.push(
      createIssue(
        "PLAN_PAIRED_COMMIT_MESSAGE_MISMATCH",
        "Paired Git Commit item does not match expected commit message.",
        {
          actual: nextItem.commitMessage,
          expected: state.expectedCommitMessage,
        }
      )
    );
  }

  if (
    currentItem.expectedCommitMessage !== null &&
    currentItem.expectedCommitMessage !== state.expectedCommitMessage
  ) {
    issues.push(
      createIssue(
        "PLAN_TASK_EXPECTED_COMMIT_MISMATCH",
        "Current task expected commit does not match plan state.",
        {
          actual: currentItem.expectedCommitMessage,
          expected: state.expectedCommitMessage,
        }
      )
    );
  }

  return issues;
};

const validateGitBinding = (state, gitState) => {
  if (!gitState) {
    return [];
  }

  const issues = [];

  if (state.branch !== gitState.branch) {
    issues.push(
      createIssue(
        "PLAN_BRANCH_MISMATCH",
        "Plan branch does not match Git branch.",
        {
          actual: gitState.branch,
          expected: state.branch,
        }
      )
    );
  }

  if (state.debt !== null || gitState.debtExists) {
    issues.push(
      createIssue(
        "PLAN_DEBT_EXISTS",
        "Plan debt must be repaired before continuing.",
        {
          fileDebt: gitState.debtExists,
          stateDebt: state.debt,
        }
      )
    );
  }

  return issues;
};

export const validatePlanMarkdown = (
  markdown,
  { gitState = null, sourcePath = "todo-plan.md" } = {}
) => {
  let parsed;

  try {
    parsed = parsePlanStateMarkdown(markdown, sourcePath);
  } catch (error) {
    if (error instanceof PlanStateError) {
      return {
        issues: [createIssue(error.code, error.message, error.details)],
        ok: false,
        state: null,
      };
    }

    throw error;
  }

  const items = extractPlanItems(markdown);
  const issues = [
    ...validateUniqueTaskIds(items),
    ...validateCurrentTask(parsed.state, items),
    ...validateGitBinding(parsed.state, gitState),
  ];

  return {
    issues,
    items,
    ok: issues.length === 0,
    state: parsed.state,
  };
};
