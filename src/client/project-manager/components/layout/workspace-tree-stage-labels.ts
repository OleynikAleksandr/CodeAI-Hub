import type { WorkflowStageId } from "../../services/workflow-state-client";
import {
  WORKFLOW_LABELS,
  WORKFLOW_STAGE_BLOCKED_TITLES,
} from "./workspace-tree-model";

const UI_LABELS_CATEGORY = "ui_interface";

type TranslationResolver = (
  category: typeof UI_LABELS_CATEGORY,
  key: string,
  fallback: string
) => string;

export const resolveStageLabel = (
  stage: WorkflowStageId,
  t: TranslationResolver
): string =>
  t(
    UI_LABELS_CATEGORY,
    `pm.workflow.stage.${stage}.label`,
    WORKFLOW_LABELS[stage]
  );

export const resolveStageTitle = (
  stage: WorkflowStageId,
  status: string,
  blocked: boolean,
  t: TranslationResolver
): string | undefined => {
  if (status === "outdated") {
    return t(
      UI_LABELS_CATEGORY,
      "pm.workflow.stage.outdated_title",
      "OUTDATED: upstream input changed; resync recommended."
    );
  }

  if (!blocked) {
    return undefined;
  }

  return t(
    UI_LABELS_CATEGORY,
    `pm.workflow.stage.${stage}.blocked_title`,
    WORKFLOW_STAGE_BLOCKED_TITLES[stage]
  );
};
