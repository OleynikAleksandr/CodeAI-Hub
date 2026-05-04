import {
  clearPlanDebtFile,
  createPlanDebtPayload,
  writePlanDebtFile,
} from "./plan-debt.mjs";
import {
  finalizeCommitAndAdvance,
  markTaskDoneAndCommitPending,
  updatePlanState,
} from "./plan-markdown-updater.mjs";

export const beginPlanTransaction = ({
  debtPath,
  expectedCommitMessage,
  markdown,
  preCommitHead,
  taskId,
}) => {
  const debt = createPlanDebtPayload({
    expectedCommitMessage,
    preCommitHead,
    taskId,
  });

  writePlanDebtFile(debtPath, debt);

  return {
    debt,
    markdown: updatePlanState(
      markTaskDoneAndCommitPending(markdown, taskId),
      (state) => ({
        ...state,
        debt,
      })
    ),
  };
};

export const finalizePlanTransaction = ({
  commitHash,
  debtPath,
  markdown,
  taskId,
}) => {
  const nextMarkdown = finalizeCommitAndAdvance(markdown, {
    commitHash,
    taskId,
  });

  clearPlanDebtFile(debtPath);

  return nextMarkdown;
};
