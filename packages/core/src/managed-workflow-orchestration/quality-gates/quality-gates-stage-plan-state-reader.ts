import { readFile } from "node:fs/promises";
import path from "node:path";

const PLAN_START = "<!-- codeai-plan-state:start -->";
const PLAN_END = "<!-- codeai-plan-state:end -->";
const FENCED_JSON_START_RE = /^```json\s*/u;
const FENCED_JSON_END_RE = /\s*```$/u;

export const QUALITY_GATES_INITIAL_DRAFT_TASK_ID =
  "quality-gates.phase1.draft.task1";
const QUALITY_GATES_STAGE_PLAN_PATH =
  "doc/TODO/stages/quality-gates/todo-plan.md";

export const readQualityGatesCurrentTaskId = async (
  workspaceRoot: string
): Promise<string | null> => {
  const planText = await readFile(
    path.join(workspaceRoot, QUALITY_GATES_STAGE_PLAN_PATH),
    "utf8"
  ).catch(() => null);
  const json = planText
    ?.split(PLAN_START)[1]
    ?.split(PLAN_END)[0]
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    return null;
  }
  try {
    const state = JSON.parse(json) as { readonly currentTaskId?: unknown };
    return typeof state.currentTaskId === "string" ? state.currentTaskId : null;
  } catch {
    return null;
  }
};
