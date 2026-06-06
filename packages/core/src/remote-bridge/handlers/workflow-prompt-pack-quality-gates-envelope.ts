const QUALITY_GATES_STAGE = "quality_gates";
const QUALITY_GATES_STAGE_TODO_PLAN_PATH =
  "doc/TODO/stages/quality-gates/todo-plan.md";

export const buildWorkflowStagePrompt = (
  stage: string,
  basePrompt: string
): string => {
  if (stage !== QUALITY_GATES_STAGE) {
    return basePrompt;
  }
  return [
    "Core opens Phase 1 Quality Gates Research.",
    `Active stage todo-plan: \`${QUALITY_GATES_STAGE_TODO_PLAN_PATH}\`.`,
    "This is a zero-context startup prompt for the Quality Gates Baseline managed step; follow the active phase envelope and do not infer phase names from older sessions.",
    basePrompt,
  ].join("\n\n");
};

export const buildArtifactModeBlock = (relativePath: string): string => {
  const researchLine = relativePath.endsWith("/quality-gates-research.md")
    ? "- Quality Gates research pass is research-only: create `quality-gates-research.md` and `quality-gates-research.json`; do not create `quality-gates.md` or `quality-gates.json`."
    : null;
  return [
    "Workflow artifact mode:",
    "- Mode: `create_initial_draft`.",
    `- Target artifact: \`${relativePath}\`.`,
    "- Write the target artifact directly from the current prompt and runtime-provided inputs.",
    "- Do not search for, read, or check whether the target artifact already exists.",
    "- If existing artifact content is relevant, it must be included in this prompt as runtime-provided artifact context.",
    researchLine,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
};
