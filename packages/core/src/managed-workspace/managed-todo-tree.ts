import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type ManagedWorkflowPlanStage =
  | "application_skeleton"
  | "diagram_modules"
  | "quality_gates";

interface StageTemplate {
  readonly commitMessage: string;
  readonly description: string;
  readonly heading: string;
  readonly planId: string;
  readonly scope: string;
  readonly taskId: string;
}

const STAGE_PLANS: Readonly<Record<ManagedWorkflowPlanStage, string>> = {
  application_skeleton: "doc/TODO/stages/application-skeleton/todo-plan.md",
  diagram_modules: "doc/TODO/stages/diagram-modules/todo-plan.md",
  quality_gates: "doc/TODO/stages/quality-gates/todo-plan.md",
};

const STAGE_TEMPLATES: Readonly<
  Record<ManagedWorkflowPlanStage, StageTemplate>
> = {
  application_skeleton: {
    commitMessage: "feat: materialize application skeleton",
    description:
      "Materialize Application Skeleton artifacts and tracked filesystem projection through the managed workflow",
    heading: "Application Skeleton Materialization",
    planId: "managed-workspace-application-skeleton",
    scope: ".codeai-hub/**/application_skeleton, product-parts/**",
    taskId: "application-skeleton.stream1.task1",
  },
  diagram_modules: {
    commitMessage: "docs: update diagram modules artifacts",
    description:
      "Update Diagram Modules artifacts through the managed workflow",
    heading: "Diagram Modules Artifacts",
    planId: "managed-workspace-diagram-modules",
    scope: ".codeai-hub/**/diagram_modules",
    taskId: "diagram-modules.stream1.task1",
  },
  quality_gates: {
    commitMessage: "feat: integrate quality gates baseline",
    description:
      "Integrate Quality Gates baseline artifacts and tracked gate files through the managed workflow",
    heading: "Quality Gates Baseline",
    planId: "managed-workspace-quality-gates",
    scope: ".codeai-hub/**/quality_gates, quality-gates/**, scripts/**",
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
  if (
    await writeIfMissing(
      workspacePlanPath,
      createWorkspacePlan({ activeStage: initialStage })
    )
  ) {
    created = true;
  }

  return { created, stagePlanPath, workspacePlanPath };
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

## Phase 1 — Managed Workflow Stage

### Stream: ${stage.heading}

1. [IN_PROGRESS] \`${stage.taskId}\` ${stage.description} (scope: \`${stage.scope}\`; expected commit: \`${stage.commitMessage}\`).
2. [TODO] Git Commit: \`${stage.commitMessage}\` (hash: TBD)
`;
};
