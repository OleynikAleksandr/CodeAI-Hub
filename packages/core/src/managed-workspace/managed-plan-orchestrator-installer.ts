import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ensureManagedTodoTree,
  type ManagedWorkflowPlanStage,
  normalizeInitialPlanStage,
} from "./managed-todo-tree";
import { createManagedWorkspacePaths } from "./managed-workspace-paths";

const PLAN_SCRIPT_RELATIVE_PATH = "scripts/plan-orchestrator/plan-cli.mjs";
const PLAN_SCRIPT_MODE = 0o755;
const PACKAGE_INDENT = 2;

const PLAN_PACKAGE_SCRIPTS: Readonly<Record<string, string>> = {
  "plan:commit": "node ./scripts/plan-orchestrator/plan-cli.mjs commit",
  "plan:repair": "node ./scripts/plan-orchestrator/plan-cli.mjs repair",
  "plan:status": "node ./scripts/plan-orchestrator/plan-cli.mjs status",
  "plan:validate": "node ./scripts/plan-orchestrator/plan-cli.mjs validate",
};

const HOOK_COMMANDS: Readonly<Record<string, string>> = {
  "commit-msg": 'node scripts/plan-orchestrator/plan-cli.mjs commit-msg "$1"',
  "post-checkout":
    "node scripts/plan-orchestrator/plan-cli.mjs status >/dev/null || true",
  "post-commit":
    "node scripts/plan-orchestrator/plan-cli.mjs post-commit || true",
  "pre-commit": "node scripts/plan-orchestrator/plan-cli.mjs validate",
  "pre-push": "node scripts/plan-orchestrator/plan-cli.mjs validate",
};

export interface ManagedPlanOrchestratorInstallResult {
  readonly hooksWritten: readonly string[];
  readonly packageScripts: readonly string[];
  readonly planScriptPath: string;
  readonly todoPlanCreated: boolean;
}

export interface ManagedPlanOrchestratorInstallOptions {
  readonly initialStage?: ManagedWorkflowPlanStage | string | null;
}

export class ManagedPlanOrchestratorInstaller {
  async install(
    workspaceRoot: string,
    options: ManagedPlanOrchestratorInstallOptions = {}
  ): Promise<ManagedPlanOrchestratorInstallResult> {
    const paths = createManagedWorkspacePaths(workspaceRoot);
    const planScriptPath = path.join(
      paths.workspaceRoot,
      PLAN_SCRIPT_RELATIVE_PATH
    );

    await mkdir(path.dirname(planScriptPath), { recursive: true });
    await writeFile(planScriptPath, createPlanCliShim(), "utf8");
    await chmod(planScriptPath, PLAN_SCRIPT_MODE);

    const hooksWritten: string[] = [];
    await mkdir(paths.hookDirectory.absolutePath, { recursive: true });
    for (const hook of paths.hooks) {
      const command = HOOK_COMMANDS[hook.hookName];
      if (!command) {
        continue;
      }
      await writeFile(hook.absolutePath, createHookScript(command), "utf8");
      await chmod(hook.absolutePath, PLAN_SCRIPT_MODE);
      hooksWritten.push(hook.hookName);
    }

    const packageScripts = await ensurePackageScripts(
      paths.packageManifest.absolutePath
    );
    const todoPlanCreated = await ensureTodoPlan(
      paths.todoPlan.absolutePath,
      normalizeInitialPlanStage(options.initialStage)
    );

    return {
      hooksWritten,
      packageScripts,
      planScriptPath,
      todoPlanCreated,
    };
  }
}

const createHookScript = (command: string): string => `#!/bin/sh
set -e
${command}
`;

const ensurePackageScripts = async (
  packageManifestPath: string
): Promise<readonly string[]> => {
  const packageJson = await readPackageJson(packageManifestPath);
  const scripts = readObject(packageJson.scripts);
  const writtenScripts: string[] = [];

  for (const [name, command] of Object.entries(PLAN_PACKAGE_SCRIPTS)) {
    if (scripts[name] === command) {
      continue;
    }
    scripts[name] = command;
    writtenScripts.push(name);
  }

  packageJson.scripts = scripts;
  await writeFile(
    packageManifestPath,
    `${JSON.stringify(packageJson, null, PACKAGE_INDENT)}\n`,
    "utf8"
  );
  return writtenScripts;
};

const readPackageJson = async (
  packageManifestPath: string
): Promise<Record<string, unknown>> => {
  try {
    return JSON.parse(await readFile(packageManifestPath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return {
      private: true,
      scripts: {},
    };
  }
};

const readObject = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue === "string") {
      result[key] = entryValue;
    }
  }
  return result;
};

const ensureTodoPlan = async (
  todoPlanPath: string,
  initialStage: ManagedWorkflowPlanStage
): Promise<boolean> => {
  return (await ensureManagedTodoTree(todoPlanPath, initialStage)).created;
};

const createPlanCliShim = (): string => `#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const START = "<!-- codeai-plan-state:start -->";
const END = "<!-- codeai-plan-state:end -->";
const WORKSPACE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_END = "<!-- codeai-workspace-plan-state:end -->";

const parseJsonBlock = (text, start, end, label) => {
  const block = text.split(start)[1]?.split(end)[0];
  if (!block) {
    throw new Error(\`Missing \${label} block\`);
  }
  const fence = String.fromCharCode(96).repeat(3);
  const json = block
    .trim()
    .replace(new RegExp("^" + fence + "json\\s*", "u"), "")
    .replace(new RegExp("\\s*" + fence + "$", "u"), "")
    .trim();
  return JSON.parse(json);
};

const readWorkspaceState = () => {
  if (!existsSync(WORKSPACE_PLAN_PATH)) {
    throw new Error("Missing doc/TODO/workspace.plan.md");
  }
  return parseJsonBlock(
    readFileSync(WORKSPACE_PLAN_PATH, "utf8"),
    WORKSPACE_START,
    WORKSPACE_END,
    "codeai-workspace-plan-state"
  );
};

const activePlanPath = () => {
  const workspaceState = readWorkspaceState();
  if (
    !workspaceState.activePlanPath ||
    typeof workspaceState.activePlanPath !== "string"
  ) {
    throw new Error("Workspace plan requires activePlanPath");
  }
  return workspaceState.activePlanPath;
};

const readState = () => {
  const planPath = activePlanPath();
  if (!existsSync(planPath)) {
    throw new Error(\`Missing active managed plan: \${planPath}\`);
  }
  return parseJsonBlock(
    readFileSync(planPath, "utf8"),
    START,
    END,
    "codeai-plan-state"
  );
};

const readPlanText = () => readFileSync(activePlanPath(), "utf8");

const validate = () => {
  const state = readState();
  if (state.debt) {
    throw new Error("Plan debt is open");
  }
  if (state.executionScopeStatus === "ACTIVE" && !state.currentTaskId) {
    throw new Error("ACTIVE plan requires currentTaskId");
  }
  return state;
};

const runGit = (args) => {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "git command failed").trim());
  }
  return result.stdout.trim();
};

const hasStagedChanges = () => {
  const result = spawnSync("git", ["diff", "--cached", "--quiet"]);
  return result.status !== 0;
};

const nextTaskId = (taskId) => {
  const match = /^(.*\\.task)(\\d+)$/u.exec(taskId);
  if (!match) {
    return \`\${taskId}.next\`;
  }
  return \`\${match[1]}\${Number(match[2]) + 1}\`;
};

const replaceState = (text, state) => {
  const blockStart = text.indexOf(START);
  const blockEnd = text.indexOf(END);
  if (blockStart < 0 || blockEnd < 0 || blockEnd <= blockStart) {
    throw new Error("Missing codeai-plan-state block");
  }
  const before = text.slice(0, blockStart + START.length);
  const after = text.slice(blockEnd);
  const json = JSON.stringify(state, null, 2);
  return \`\${before}\\n\\\`\\\`\\\`json\\n\${json}\\n\\\`\\\`\\\`\\n\${after}\`;
};

const advancePlanForCommit = (message) => {
  const state = validate();
  if (state.expectedCommitMessage && message !== state.expectedCommitMessage) {
    throw new Error(\`Expected commit message: \${state.expectedCommitMessage}\`);
  }
  if (!state.currentTaskId) {
    throw new Error("ACTIVE plan requires currentTaskId");
  }

  const text = readPlanText();
  const lines = text.split("\\n");
  const taskLineIndex = lines.findIndex((line) =>
    line.includes(\`\\\`\${state.currentTaskId}\\\`\`)
  );
  if (taskLineIndex < 0) {
    throw new Error(\`Current task not found: \${state.currentTaskId}\`);
  }
  const commitLineIndex = lines.findIndex(
    (line, index) =>
      index > taskLineIndex &&
      line.includes(\`Git Commit: \\\`\${message}\\\`\`)
  );
  if (commitLineIndex < 0) {
    throw new Error(\`Git Commit item not found: \${message}\`);
  }

  const nextId = nextTaskId(state.currentTaskId);
  const nextTaskExists = lines.some((line) => line.includes(\`\\\`\${nextId}\\\`\`));
  lines[taskLineIndex] = lines[taskLineIndex].replace("[IN_PROGRESS]", "[DONE]");
  lines[commitLineIndex] = lines[commitLineIndex]
    .replace("[TODO]", "[DONE]")
    .replace("hash: TBD", "hash: included-in-commit");

  if (!nextTaskExists) {
    const nextNumber = lines
      .slice(0, commitLineIndex + 1)
      .filter((line) => /^\\d+\\. /u.test(line)).length + 1;
    const currentTaskText = lines[taskLineIndex].replace(
      \`\\\`\${state.currentTaskId}\\\`\`,
      \`\\\`\${nextId}\\\`\`
    );
    lines.splice(
      commitLineIndex + 1,
      0,
      \`\${nextNumber}. \${currentTaskText.replace("[DONE]", "[IN_PROGRESS]").replace(/^\\d+\\.\\s+/u, "")}\`,
      \`\${nextNumber + 1}. [TODO] Git Commit: \\\`\${message}\\\` (hash: TBD)\`
    );
  }

  const nextState = {
    ...state,
    lastRecordedCommit: "included-in-commit",
    currentTaskId: nextId,
    expectedCommitMessage: message,
  };
  writeFileSync(
    activePlanPath(),
    replaceState(lines.join("\\n"), nextState),
    "utf8"
  );
};

const command = process.argv[2];

try {
  if (command === "status") {
    const state = validate();
    console.log(\`Execution Scope Status: \${state.executionScopeStatus}\`);
    console.log(\`Current Task: \${state.currentTaskId ?? "none"}\`);
    console.log(\`Expected Commit: \${state.expectedCommitMessage ?? "none"}\`);
  } else if (command === "validate" || command === "post-commit") {
    validate();
  } else if (command === "repair") {
    console.log("Plan repair shim: no repair action required");
  } else if (command === "commit-msg") {
    const state = validate();
    const message = readFileSync(process.argv[3], "utf8").trim();
    if (state.expectedCommitMessage && message !== state.expectedCommitMessage) {
      throw new Error(\`Expected commit message: \${state.expectedCommitMessage}\`);
    }
  } else if (command === "commit") {
    const message = process.argv.slice(3).join(" ");
    if (!hasStagedChanges()) {
      throw new Error("No staged changes to commit");
    }
    advancePlanForCommit(message);
    runGit(["add", activePlanPath()]);
    const result = spawnSync("git", ["commit", "-m", message], { stdio: "inherit" });
    process.exitCode = result.status ?? 1;
  } else {
    throw new Error("Usage: plan-cli.mjs <status|validate|commit|repair|commit-msg|post-commit>");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
`;
