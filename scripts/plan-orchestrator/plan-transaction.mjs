import {
  clearPlanDebtFile,
  createPlanDebtPayload,
  writePlanDebtFile,
} from "./plan-debt.mjs";
import { finalizeCommitAndAdvance } from "./plan-markdown-updater.mjs";

const SELF_HASH = "self";

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
    rollbackMarkdown: markdown,
    taskId,
  });

  writePlanDebtFile(debtPath, debt);

  return {
    debt,
    markdown: finalizeCommitAndAdvance(markdown, {
      commitHash: SELF_HASH,
      taskId,
    }),
  };
};

export const finalizePlanTransaction = ({ debtPath, markdown }) => {
  const nextMarkdown = markdown;

  clearPlanDebtFile(debtPath);

  return nextMarkdown;
};
