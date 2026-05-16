import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DiagramModulesManagedGitBoundary } from "./diagram-modules/diagram-modules-managed-git-boundary";

const PLAN_SCRIPT_PATH = "scripts/plan-orchestrator/plan-cli.mjs";
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const SCRIPT_MODE = 0o755;
const PLAN_START = "<!-- codeai-plan-state:start -->";
const PLAN_END = "<!-- codeai-plan-state:end -->";
const WORKSPACE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_END = "<!-- codeai-workspace-plan-state:end -->";
const INPUT_CHECKPOINT_TASK_ID =
  "diagram-modules.phase0.input-checkpoint.task1";
const INPUT_CHECKPOINT_COMMIT_MESSAGE =
  "docs: checkpoint managed workflow inputs";
const INDEX_TASK_ID = "diagram-modules.phase1.index.task1";
const INDEX_COMMIT_MESSAGE = "docs: update diagram modules product part index";
const LEDGER_COMMIT_MESSAGE = "chore: advance managed workflow ledger";
const FENCED_JSON_START_RE = /^```json\s*/u;
const FENCED_JSON_END_RE = /\s*```$/u;

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

interface ManagedPlanState {
  currentTaskId: string | null;
  expectedCommitMessage: string | null;
  lastRecordedCommit: string | null;
  [key: string]: unknown;
}

interface ManagedWorkspaceState {
  acceptedCommits?: unknown[];
  lastAcceptedCommitHash?: string | null;
  lastAcceptedCommitMessage?: string | null;
  unlockedStages?: unknown[];
  [key: string]: unknown;
}

const resolveWorkspacePath = (
  workspaceRoot: string,
  relativePath: string
): string => path.join(workspaceRoot, relativePath);

const readExistingFile = async (absolutePath: string): Promise<string | null> =>
  readFile(absolutePath, "utf8").catch(() => null);

const readText = (
  workspaceRoot: string,
  relativePath: string
): Promise<string> =>
  readFile(resolveWorkspacePath(workspaceRoot, relativePath), "utf8");

const writeText = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const pathExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> =>
  Boolean(
    await stat(resolveWorkspacePath(workspaceRoot, relativePath)).catch(
      () => null
    )
  );

const existingPaths = async (
  workspaceRoot: string,
  paths: readonly string[]
): Promise<readonly string[]> => {
  const existing: string[] = [];
  for (const relativePath of paths) {
    if (await pathExists(workspaceRoot, relativePath)) {
      existing.push(relativePath);
    }
  }
  return existing;
};

const parseStateBlock = <TState>(
  content: string,
  startMarker: string,
  endMarker: string
): TState => {
  const rawBlock = content.split(startMarker)[1]?.split(endMarker)[0];
  const json = rawBlock
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    throw new Error(`Missing managed state block: ${startMarker}`);
  }
  return JSON.parse(json) as TState;
};

const replaceStateBlock = (
  content: string,
  startMarker: string,
  endMarker: string,
  state: unknown
): string =>
  content.replace(
    new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, "u"),
    `${startMarker}\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n${endMarker}`
  );

const addUnique = <TValue>(
  values: readonly unknown[] | undefined,
  value: TValue
): unknown[] => {
  const existing = Array.isArray(values) ? values : [];
  return existing.includes(value) ? [...existing] : [...existing, value];
};

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
      ? INPUT_CHECKPOINT_TASK_ID
      : `${stage.replace("_", "-")}.phase1.bootstrap.task1`;
  const currentTaskId = active ? JSON.stringify(taskId) : "null";
  const commitMessage =
    stage === "diagram_modules"
      ? INPUT_CHECKPOINT_COMMIT_MESSAGE
      : `docs: bootstrap ${labels[stage].toLowerCase()} managed stage`;
  const diagramModulesBody =
    stage === "diagram_modules"
      ? `
## Phase 0 — Managed Input Checkpoint

### Stream: Core Git Hygiene

1. [${taskStatus}] \`${INPUT_CHECKPOINT_TASK_ID}\` Core checkpoints provider-direct inputs and managed scaffold before the first Diagram Modules agent turn (scope: \`.codeai-hub/**/description/**, .codeai-hub/**/virtual_simulation/**, .codeai-hub/**/continuity/**, doc/TODO/**, scripts/plan-orchestrator/**, .husky/**, package.json\`; expected commit: \`${INPUT_CHECKPOINT_COMMIT_MESSAGE}\`).
2. [TODO] Git Commit: \`${INPUT_CHECKPOINT_COMMIT_MESSAGE}\` (hash: TBD)

## Phase 1 — Diagram Modules Managed Bootstrap

### Stream: Core-Gated Work

3. [TODO] \`${INDEX_TASK_ID}\` Diagram Modules managed work is opened by Core (scope: \`.codeai-hub/**/${stage}/**\`; expected commit: \`${INDEX_COMMIT_MESSAGE}\`).
4. [TODO] Git Commit: \`${INDEX_COMMIT_MESSAGE}\` (hash: TBD)
`
      : `
## Phase 1 — ${labels[stage]} Managed Bootstrap

### Stream: Core-Gated Work

1. [${taskStatus}] \`${taskId}\` ${labels[stage]} managed work is opened by Core (scope: \`.codeai-hub/**/${stage}/**\`; expected commit: \`${commitMessage}\`).
2. [TODO] Git Commit: \`${commitMessage}\` (hash: TBD)
`;
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

${diagramModulesBody}`;
};

const markInputCheckpointDone = (content: string, hash: string): string =>
  content
    .replace(
      `[IN_PROGRESS] \`${INPUT_CHECKPOINT_TASK_ID}\``,
      `[DONE] \`${INPUT_CHECKPOINT_TASK_ID}\``
    )
    .replace(
      `Git Commit: \`${INPUT_CHECKPOINT_COMMIT_MESSAGE}\` (hash: TBD)`,
      `Git Commit: \`${INPUT_CHECKPOINT_COMMIT_MESSAGE}\` (hash: ${hash})`
    )
    .replace(
      `[TODO] \`${INDEX_TASK_ID}\``,
      `[IN_PROGRESS] \`${INDEX_TASK_ID}\``
    );

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

  async checkpointDiagramModulesInputs(params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly gitBoundary?: DiagramModulesManagedGitBoundary;
  }): Promise<void> {
    const stagePlanPath = STAGE_PLAN_PATHS.diagram_modules;
    const stagePlan = await readText(params.workspaceRoot, stagePlanPath);
    const stageState = parseStateBlock<ManagedPlanState>(
      stagePlan,
      PLAN_START,
      PLAN_END
    );
    if (stageState.currentTaskId !== INPUT_CHECKPOINT_TASK_ID) {
      return;
    }
    const gitBoundary =
      params.gitBoundary ?? new DiagramModulesManagedGitBoundary();
    const checkpointPaths = await existingPaths(params.workspaceRoot, [
      `.codeai-hub/${params.workspaceSlug}/description`,
      `.codeai-hub/${params.workspaceSlug}/virtual_simulation`,
      `.codeai-hub/${params.workspaceSlug}/continuity`,
      `.codeai-hub/${params.workspaceSlug}/workflow/state.json`,
      WORKSPACE_PLAN_PATH,
      ...Object.values(STAGE_PLAN_PATHS),
      PLAN_SCRIPT_PATH,
      ".husky/pre-commit",
      ".husky/pre-push",
      "package.json",
    ]);
    const checkpoint = await gitBoundary.commitManagedChanges({
      commitMessage: INPUT_CHECKPOINT_COMMIT_MESSAGE,
      managedPaths: checkpointPaths,
      workspaceRoot: params.workspaceRoot,
    });
    if (checkpoint.noStagedChanges || !checkpoint.hash) {
      return;
    }
    const nextStageState: ManagedPlanState = {
      ...stageState,
      currentTaskId: INDEX_TASK_ID,
      expectedCommitMessage: INDEX_COMMIT_MESSAGE,
      lastRecordedCommit: checkpoint.hash,
    };
    await writeText(
      params.workspaceRoot,
      stagePlanPath,
      replaceStateBlock(
        markInputCheckpointDone(stagePlan, checkpoint.hash),
        PLAN_START,
        PLAN_END,
        nextStageState
      )
    );
    await this.recordWorkspaceCheckpoint({
      checkpointHash: checkpoint.hash,
      workspaceRoot: params.workspaceRoot,
    });
    const ledgerPaths = await existingPaths(params.workspaceRoot, [
      WORKSPACE_PLAN_PATH,
      stagePlanPath,
    ]);
    await gitBoundary.commitManagedChanges({
      commitMessage: LEDGER_COMMIT_MESSAGE,
      managedPaths: ledgerPaths,
      workspaceRoot: params.workspaceRoot,
    });
  }

  private async recordWorkspaceCheckpoint(params: {
    readonly checkpointHash: string;
    readonly workspaceRoot: string;
  }): Promise<void> {
    const workspacePlan = await readText(
      params.workspaceRoot,
      WORKSPACE_PLAN_PATH
    );
    const workspaceState = parseStateBlock<ManagedWorkspaceState>(
      workspacePlan,
      WORKSPACE_START,
      WORKSPACE_END
    );
    const acceptedCommits = Array.isArray(workspaceState.acceptedCommits)
      ? workspaceState.acceptedCommits
      : [];
    const nextWorkspaceState: ManagedWorkspaceState = {
      ...workspaceState,
      acceptedCommits: [
        ...acceptedCommits,
        {
          hash: params.checkpointHash,
          message: INPUT_CHECKPOINT_COMMIT_MESSAGE,
          stage: "diagram_modules",
          taskId: INPUT_CHECKPOINT_TASK_ID,
        },
      ],
      lastAcceptedCommitHash: params.checkpointHash,
      lastAcceptedCommitMessage: INPUT_CHECKPOINT_COMMIT_MESSAGE,
      unlockedStages: addUnique(
        workspaceState.unlockedStages,
        "diagram_modules"
      ),
    };
    await writeText(
      params.workspaceRoot,
      WORKSPACE_PLAN_PATH,
      replaceStateBlock(
        workspacePlan,
        WORKSPACE_START,
        WORKSPACE_END,
        nextWorkspaceState
      )
    );
  }
}
