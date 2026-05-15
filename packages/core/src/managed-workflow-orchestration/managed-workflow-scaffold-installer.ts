import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PLAN_SCRIPT_PATH = "scripts/plan-orchestrator/plan-cli.mjs";
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const SCRIPT_MODE = 0o755;

const STAGE_PLAN_PATHS = {
  application_skeleton: "doc/TODO/stages/application-skeleton/todo-plan.md",
  diagram_modules: "doc/TODO/stages/diagram-modules/todo-plan.md",
  quality_gates: "doc/TODO/stages/quality-gates/todo-plan.md",
} as const;

const PACKAGE_SCRIPTS = {
  "plan:commit": "node ./scripts/plan-orchestrator/plan-cli.mjs commit",
  "plan:repair": "node ./scripts/plan-orchestrator/plan-cli.mjs repair",
  "plan:status": "node ./scripts/plan-orchestrator/plan-cli.mjs status",
  "plan:validate": "node ./scripts/plan-orchestrator/plan-cli.mjs validate",
} as const;

export interface ManagedWorkflowScaffoldInstallResult {
  readonly createdPaths: readonly string[];
  readonly updatedPaths: readonly string[];
}

const resolveWorkspacePath = (
  workspaceRoot: string,
  relativePath: string
): string => path.join(workspaceRoot, relativePath);

const readExistingFile = async (absolutePath: string): Promise<string | null> =>
  readFile(absolutePath, "utf8").catch(() => null);

const writeIfMissing = async (
  params: {
    readonly content: string;
    readonly relativePath: string;
    readonly workspaceRoot: string;
  },
  createdPaths: string[]
): Promise<void> => {
  const absolutePath = resolveWorkspacePath(
    params.workspaceRoot,
    params.relativePath
  );
  if ((await readExistingFile(absolutePath)) !== null) {
    return;
  }
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, params.content, "utf8");
  createdPaths.push(params.relativePath);
};

const createPlanCliShim = (): string => `#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const WORKSPACE_PLAN_PATH = "${WORKSPACE_PLAN_PATH}";
const START = "<!-- codeai-workspace-plan-state:start -->";
const END = "<!-- codeai-workspace-plan-state:end -->";

const readWorkspaceState = () => {
  if (!existsSync(WORKSPACE_PLAN_PATH)) {
    throw new Error("Missing " + WORKSPACE_PLAN_PATH);
  }
  const block = readFileSync(WORKSPACE_PLAN_PATH, "utf8").split(START)[1]?.split(END)[0];
  const json = block?.trim().replace(/^\`\`\`json\\s*/u, "").replace(/\\s*\`\`\`$/u, "").trim();
  if (!json) {
    throw new Error("Missing managed workspace state block");
  }
  return JSON.parse(json);
};

const command = process.argv[2] ?? "status";
const state = readWorkspaceState();
if (command === "status" || command === "validate") {
  console.log("Managed workspace plan:", state.activePlanPath ?? "none");
  process.exit(0);
}
console.log("Managed workspace plan command is reserved for Core:", command);
`;

const createWorkspacePlan = (): string => `# Managed Workspace Plan

<!-- codeai-workspace-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-workspace-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "activeStage": "diagram_modules",
  "activePlanPath": "${STAGE_PLAN_PATHS.diagram_modules}",
  "stagePlans": ${JSON.stringify(STAGE_PLAN_PATHS, null, 2).replace(/\n/g, "\n  ")},
  "unlockedStages": [
    "diagram_modules"
  ],
  "completedStages": [],
  "lastAcceptedCommitHash": null,
  "lastAcceptedCommitMessage": null,
  "acceptedCommits": [],
  "blockers": []
}
\`\`\`
<!-- codeai-workspace-plan-state:end -->

## Ownership

- Core owns this managed workspace ledger and all task/hash transitions.
- Workflow agents only edit the artifact named by the current Core prompt.
- User review starts only after Core accepts the final Diagram Modules Product Part.
`;

const createStagePlan = (stage: keyof typeof STAGE_PLAN_PATHS): string => {
  const labels = {
    application_skeleton: "Application Skeleton",
    diagram_modules: "Diagram Modules",
    quality_gates: "Quality Gates",
  } as const;
  const active = stage === "diagram_modules";
  const taskStatus = active ? "IN_PROGRESS" : "TODO";
  const taskId =
    stage === "diagram_modules"
      ? "diagram-modules.phase1.index.task1"
      : `${stage.replace("_", "-")}.phase1.bootstrap.task1`;
  const currentTaskId = active ? JSON.stringify(taskId) : "null";
  const commitMessage =
    stage === "diagram_modules"
      ? "docs: update diagram modules product part index"
      : `docs: bootstrap ${labels[stage].toLowerCase()} managed stage`;
  return `# ${labels[stage]} Managed TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workspace-${stage.replace(/_/g, "-")}",
  "branch": "main",
  "baseHead": "TBD",
  "lastRecordedCommit": "TBD",
  "planningSource": ".codeai-hub/workflow/index.json",
  "currentTaskId": ${currentTaskId},
  "expectedCommitMessage": ${active ? JSON.stringify(commitMessage) : "null"},
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

## Phase 1 — ${labels[stage]} Managed Bootstrap

### Stream: Core-Gated Work

1. [${taskStatus}] \`${taskId}\` ${labels[stage]} managed work is opened by Core (scope: \`.codeai-hub/**/${stage}/**\`; expected commit: \`${commitMessage}\`).
2. [TODO] Git Commit: \`${commitMessage}\` (hash: TBD)
`;
};

const ensurePackageScripts = async (
  workspaceRoot: string
): Promise<readonly string[]> => {
  const packagePath = resolveWorkspacePath(workspaceRoot, "package.json");
  const raw = await readExistingFile(packagePath);
  const packageJson = raw ? JSON.parse(raw) : { private: true };
  const scripts =
    packageJson.scripts && typeof packageJson.scripts === "object"
      ? packageJson.scripts
      : {};
  const changed: string[] = [];
  for (const [name, command] of Object.entries(PACKAGE_SCRIPTS)) {
    if (scripts[name] !== command) {
      scripts[name] = command;
      changed.push(`package.json#scripts.${name}`);
    }
  }
  if (changed.length > 0 || !raw) {
    packageJson.scripts = scripts;
    await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }
  return changed;
};

const ensureHooks = async (
  workspaceRoot: string,
  updatedPaths: string[]
): Promise<void> => {
  const hooks = {
    "pre-commit": "npm run plan:validate",
    "pre-push": "npm run plan:validate",
  } as const;
  for (const [hookName, command] of Object.entries(hooks)) {
    const relativePath = `.husky/${hookName}`;
    const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, `#!/bin/sh\nset -e\n${command}\n`, "utf8");
    await chmod(absolutePath, SCRIPT_MODE);
    updatedPaths.push(relativePath);
  }
};

export class ManagedWorkflowScaffoldInstaller {
  async installDiagramModulesScaffold(params: {
    readonly workspaceRoot: string;
  }): Promise<ManagedWorkflowScaffoldInstallResult> {
    const createdPaths: string[] = [];
    const updatedPaths: string[] = [];
    await writeIfMissing(
      {
        content: createPlanCliShim(),
        relativePath: PLAN_SCRIPT_PATH,
        workspaceRoot: params.workspaceRoot,
      },
      createdPaths
    );
    await chmod(
      resolveWorkspacePath(params.workspaceRoot, PLAN_SCRIPT_PATH),
      SCRIPT_MODE
    ).catch(() => undefined);
    await writeIfMissing(
      {
        content: createWorkspacePlan(),
        relativePath: WORKSPACE_PLAN_PATH,
        workspaceRoot: params.workspaceRoot,
      },
      createdPaths
    );
    for (const [stage, relativePath] of Object.entries(STAGE_PLAN_PATHS)) {
      await writeIfMissing(
        {
          content: createStagePlan(stage as keyof typeof STAGE_PLAN_PATHS),
          relativePath,
          workspaceRoot: params.workspaceRoot,
        },
        createdPaths
      );
    }
    updatedPaths.push(...(await ensurePackageScripts(params.workspaceRoot)));
    await ensureHooks(params.workspaceRoot, updatedPaths);
    return { createdPaths, updatedPaths };
  }
}
