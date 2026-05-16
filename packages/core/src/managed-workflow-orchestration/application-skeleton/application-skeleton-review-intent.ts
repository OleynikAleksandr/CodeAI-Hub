import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  APPLICATION_STAGE_PLAN_PATH,
  PLAN_END,
  PLAN_START,
  REVIEW_TASK_PREFIX,
} from "./application-skeleton-stage-plan-model";

export type ApplicationSkeletonReviewIntent = "accept" | "none" | "revision";

const ACCEPT_RE =
  /(?:\b(?:accept(?:ed)?|approv(?:e|ed)|confirm(?:ed)?|ok(?:ay)?)\b|(?:^|[\s,.;:!?])(?:п[іi]дтверджую|подтверждаю)(?:$|[\s,.;:!?]))/iu;
const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const NEGATED_ACCEPT_RE =
  /(?:\b(?:do\s+not|don't|not)\s+(?:accept|approve|confirm)\b|(?:^|[\s,.;:!?])(?:не|не\s+надо|не\s+нужно)\s+(?:подтверждаю|п[іi]дтверджую)(?:$|[\s,.;:!?]))/iu;

export const classifyApplicationSkeletonReviewIntent = (
  content: string
): ApplicationSkeletonReviewIntent => {
  const normalized = content.trim();
  if (!normalized) {
    return "none";
  }
  if (NEGATED_ACCEPT_RE.test(normalized)) {
    return "revision";
  }
  if (ACCEPT_RE.test(normalized)) {
    return "accept";
  }
  return "revision";
};

export const isApplicationSkeletonReviewOpen = async (
  workspaceRoot: string
): Promise<boolean> => {
  const planText = await readFile(
    path.join(workspaceRoot, APPLICATION_STAGE_PLAN_PATH),
    "utf8"
  ).catch(() => null);
  if (!planText) {
    return false;
  }
  const rawState = planText.split(PLAN_START)[1]?.split(PLAN_END)[0];
  const json = rawState
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    return false;
  }
  try {
    const state = JSON.parse(json) as { readonly currentTaskId?: unknown };
    return (
      typeof state.currentTaskId === "string" &&
      state.currentTaskId.startsWith(REVIEW_TASK_PREFIX)
    );
  } catch {
    return false;
  }
};

export const buildApplicationSkeletonReviewRevisionPrompt = (options: {
  readonly userFeedback: string;
  readonly workspaceSlug: string;
}): string =>
  [
    "Core received Application Skeleton review corrections from the user.",
    "Revise only the Application Skeleton contract artifacts and then stop for Core validation.",
    "",
    "Target artifacts:",
    `- \`.codeai-hub/${options.workspaceSlug}/application_skeleton/application-skeleton.md\``,
    `- \`.codeai-hub/${options.workspaceSlug}/application_skeleton/application-skeleton-map.json\``,
    "",
    "User requested changes:",
    options.userFeedback.trim(),
    "",
    "Do not set `accepted: true`.",
    "Do not set `materialized: true`.",
    "Do not create production scaffold files or Product Part folders.",
    "Do not run Git commands or edit managed plan files.",
  ].join("\n");
