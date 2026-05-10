import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ManagedWorkflowPlanStage =
  | "application_skeleton"
  | "diagram_modules"
  | "quality_gates";

interface StageTemplate {
  readonly commitMessage: string;
  readonly description: string;
  readonly heading: string;
  readonly phaseLabel: string;
  readonly planId: string;
  readonly scope: string;
  readonly taskId: string;
}

export const STAGE_PLANS: Readonly<Record<ManagedWorkflowPlanStage, string>> = {
  application_skeleton: "doc/TODO/stages/application-skeleton/todo-plan.md",
  diagram_modules: "doc/TODO/stages/diagram-modules/todo-plan.md",
  quality_gates: "doc/TODO/stages/quality-gates/todo-plan.md",
};

export const STAGE_TERMINAL_COMMITS: Readonly<
  Record<ManagedWorkflowPlanStage, string>
> = {
  application_skeleton: "feat: materialize application skeleton",
  diagram_modules: "docs: review diagram modules product map",
  quality_gates: "feat: integrate quality gates baseline",
};

export const NEXT_STAGE_AFTER: Readonly<
  Record<ManagedWorkflowPlanStage, ManagedWorkflowPlanStage | null>
> = {
  application_skeleton: "quality_gates",
  diagram_modules: "application_skeleton",
  quality_gates: null,
};

const WORKSPACE_PLAN_STATE_END = "<!-- codeai-workspace-plan-state:end -->";
const WORKSPACE_PLAN_STATE_START = "<!-- codeai-workspace-plan-state:start -->";
const JSON_FENCE_END_RE = /\s*```$/u;
const JSON_FENCE_START_RE = /^```json\s*/u;

const STAGE_TEMPLATES: Readonly<
  Record<ManagedWorkflowPlanStage, StageTemplate>
> = {
  application_skeleton: {
    commitMessage: "docs: draft application skeleton contract",
    description:
      "Run the Application Skeleton agent under Core gating to produce the initial contract artifacts before user review opens",
    heading: "Core-Gated Initial Draft",
    phaseLabel: "Application Skeleton Contract Bootstrap",
    planId: "managed-workspace-application-skeleton",
    scope:
      ".codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json",
    taskId: "application-skeleton.phase1.draft.task1",
  },
  diagram_modules: {
    commitMessage: "docs: update diagram modules product part index",
    description:
      "Update Diagram Modules Product Part index artifact through the managed workflow",
    heading: "Diagram Modules Artifacts",
    phaseLabel: "Managed Workflow Stage",
    planId: "managed-workspace-diagram-modules",
    scope: ".codeai-hub/**/diagram_modules/product-parts.index.md",
    taskId: "diagram-modules.stream1.task1",
  },
  quality_gates: {
    commitMessage: "docs: draft quality gates contract",
    description:
      "Draft Quality Gates contract artifacts as the first managed microtask before package and gate script integration",
    heading: "Quality Gates Draft Contract",
    phaseLabel: "Managed Workflow Stage",
    planId: "managed-workspace-quality-gates",
    scope:
      ".codeai-hub/**/quality_gates/quality-gates.md, .codeai-hub/**/quality_gates/quality-gates.json",
    taskId: "quality-gates.stream1.task1",
  },
};

export interface ManagedTodoTreeResult {
  readonly created: boolean;
  readonly stagePlanPath: string;
  readonly workspacePlanPath: string;
}

export const normalizeInitialPlanStage = (
  value: ManagedWorkflowPlanStage | string | null | undefined
): ManagedWorkflowPlanStage => {
  if (
    value === "application_skeleton" ||
    value === "diagram_modules" ||
    value === "quality_gates"
  ) {
    return value;
  }
  return "diagram_modules";
};

export const ensureManagedTodoTree = async (
  todoRootProbePath: string,
  initialStage: ManagedWorkflowPlanStage
): Promise<ManagedTodoTreeResult> => {
  const todoRoot = path.dirname(todoRootProbePath);
  const workspacePlanPath = path.join(todoRoot, "workspace.plan.md");
  const stagePlanPath = path.resolve(
    path.dirname(path.dirname(todoRoot)),
    STAGE_PLANS[initialStage]
  );
  let created = false;

  await mkdir(todoRoot, { recursive: true });
  await mkdir(path.dirname(stagePlanPath), { recursive: true });
  if (await writeIfMissing(stagePlanPath, createStagePlan(initialStage))) {
    created = true;
  }
  if (await ensureWorkspacePlan(workspacePlanPath, initialStage)) {
    created = true;
  }

  return { created, stagePlanPath, workspacePlanPath };
};

const ensureWorkspacePlan = async (
  workspacePlanPath: string,
  activeStage: ManagedWorkflowPlanStage
): Promise<boolean> => {
  if (!(await pathExists(workspacePlanPath))) {
    await writeFile(
      workspacePlanPath,
      createWorkspacePlan({ activeStage }),
      "utf8"
    );
    return true;
  }
  const existing = await readFile(workspacePlanPath, "utf8");
  const updated = updateWorkspacePlanState(existing, activeStage);
  if (updated === existing) {
    return false;
  }
  await writeFile(workspacePlanPath, updated, "utf8");
  return true;
};

const updateWorkspacePlanState = (
  text: string,
  activeStage: ManagedWorkflowPlanStage
): string => {
  const state = readWorkspacePlanState(text);
  if (!state) {
    return createWorkspacePlan({ activeStage });
  }
  const nextState = {
    ...state,
    activePlanPath: STAGE_PLANS[activeStage],
    activeStage,
    stagePlans: { ...STAGE_PLANS, ...readObject(state.stagePlans) },
  };
  if (JSON.stringify(nextState) === JSON.stringify(state)) {
    return text;
  }
  return replaceWorkspacePlanState(text, nextState);
};

const readWorkspacePlanState = (
  text: string
): Record<string, unknown> | null => {
  const rawState = text
    .split(WORKSPACE_PLAN_STATE_START)[1]
    ?.split(WORKSPACE_PLAN_STATE_END)[0];
  if (!rawState) {
    return null;
  }
  try {
    return JSON.parse(stripJsonFence(rawState)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const readObject = (value: unknown): Record<string, string> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string"
        )
      )
    : {};

const replaceWorkspacePlanState = (
  text: string,
  state: Record<string, unknown>
): string => {
  const blockStart = text.indexOf(WORKSPACE_PLAN_STATE_START);
  const blockEnd = text.indexOf(WORKSPACE_PLAN_STATE_END);
  if (blockStart < 0 || blockEnd < 0 || blockEnd <= blockStart) {
    return createWorkspacePlan({
      activeStage: normalizeInitialPlanStage(state.activeStage as string),
    });
  }
  const before = text.slice(0, blockStart + WORKSPACE_PLAN_STATE_START.length);
  const after = text.slice(blockEnd);
  return `${before}\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n${after}`;
};

const stripJsonFence = (value: string): string => {
  const trimmed = value.trim();
  return trimmed
    .replace(JSON_FENCE_START_RE, "")
    .replace(JSON_FENCE_END_RE, "")
    .trim();
};

const writeIfMissing = async (
  targetPath: string,
  content: string
): Promise<boolean> => {
  if (await pathExists(targetPath)) {
    return false;
  }
  await writeFile(targetPath, content, "utf8");
  return true;
};

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const createWorkspacePlan = (params: {
  readonly activeStage: ManagedWorkflowPlanStage;
}): string => `# Managed Workspace Plan

<!-- codeai-workspace-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-workspace-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "activeStage": "${params.activeStage}",
  "activePlanPath": "${STAGE_PLANS[params.activeStage]}",
  "stagePlans": ${JSON.stringify(STAGE_PLANS, null, 2).replace(/\n/g, "\n  ")},
  "lastAcceptedCommitHash": null,
  "lastAcceptedCommitMessage": null,
  "acceptedCommits": [],
  "blockers": []
}
\`\`\`
<!-- codeai-workspace-plan-state:end -->

## Ownership

- Core owns this workspace ledger.
- Workflow agents own only the active child plan assigned by Core.
- Future implementation plans must mirror materialized Product Part / Cluster / Module ownership.
`;

const createStagePlan = (initialStage: ManagedWorkflowPlanStage): string => {
  const stage = STAGE_TEMPLATES[initialStage];
  return `# Managed Workspace TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "${stage.planId}",
  "branch": "main",
  "baseHead": "TBD",
  "lastRecordedCommit": "TBD",
  "planningSource": ".codeai-hub/workflow/index.json",
  "currentTaskId": "${stage.taskId}",
  "expectedCommitMessage": "${stage.commitMessage}",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** \`.codeai-hub/workflow/index.json\`
- **Read this context before implementation:**
  - \`.codeai-hub/workflow/index.json\`
- Only this Context Pack is the recovery source for the current managed cycle.

## Phase 1 — ${stage.phaseLabel}

### Stream: ${stage.heading}

1. [IN_PROGRESS] \`${stage.taskId}\` ${stage.description} (scope: \`${stage.scope}\`; expected commit: \`${stage.commitMessage}\`).
2. [TODO] Git Commit: \`${stage.commitMessage}\` (hash: TBD)
${createStageFollowUpTasks(initialStage)}
`;
};

const createStageFollowUpTasks = (
  initialStage: ManagedWorkflowPlanStage
): string => {
  if (initialStage === "application_skeleton") {
    return `
## Phase 2 — Application Skeleton Contract Review

### Stream: User-Led Review

3. [TODO] \`application-skeleton.phase2.review.task1\` Open-ended user-led review of the Application Skeleton contract; the user drives revisions and clarifying turns until the explicit Accept Contract command fires (scope: \`.codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json\`; expected commit: none — open until acceptance).

## Phase 3 — Application Skeleton Materialization

### Stream: Core-Led Materialization

4. [TODO] \`application-skeleton.phase3.materialize.task1\` Materialize Application Skeleton tracked filesystem projection as one bounded target-group microtask after the Accept Contract command fires (scope: \`product-parts/**, .codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json\`; expected commit: \`feat: materialize application skeleton\`).
5. [TODO] Git Commit: \`feat: materialize application skeleton\` (hash: TBD)

## Phase 4 — Handoff

### Stream: Reserved Post-Closeout Handoff Anchor

6. [TODO] \`application-skeleton.handoff.task1\` Reserved post-closeout handoff anchor; do not execute automatically (scope: chat/process observation only; no commit required).
`;
  }
  if (initialStage === "quality_gates") {
    return `
## Phase 2 — Managed Gate Integration

### Stream: Quality Gates Integration

3. [TODO] \`quality-gates.stream1.task2\` Integrate accepted Quality Gates package scripts, lockfile changes, gate scripts, configs, and verification results as one bounded target-group microtask after the gate contract is accepted and committed (scope: \`package.json, package-lock.json, scripts/gates/**, .codeai-hub/**/quality_gates/quality-gates.md, .codeai-hub/**/quality_gates/quality-gates.json\`; expected commit: \`feat: integrate quality gates baseline\`).
4. [TODO] Git Commit: \`feat: integrate quality gates baseline\` (hash: TBD)
`;
  }
  return "";
};
