import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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

export class ManagedPlanOrchestratorInstaller {
  async install(
    workspaceRoot: string
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
    const todoPlanCreated = await ensureTodoPlan(paths.todoPlan.absolutePath);

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

const ensureTodoPlan = async (todoPlanPath: string): Promise<boolean> => {
  if (await pathExists(todoPlanPath)) {
    return false;
  }
  await mkdir(path.dirname(todoPlanPath), { recursive: true });
  await writeFile(todoPlanPath, createTodoPlanTemplate(), "utf8");
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

const createTodoPlanTemplate = (): string => `# Managed Workspace TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workspace-diagram-modules",
  "branch": "main",
  "baseHead": "TBD",
  "lastRecordedCommit": "TBD",
  "planningSource": ".codeai-hub/workflow/index.json",
  "currentTaskId": "diagram-modules.stream1.task1",
  "expectedCommitMessage": "docs: update diagram modules artifacts",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** \`.codeai-hub/workflow/index.json\`
- **Read this context before implementation:**
  - \`.codeai-hub/workflow/index.json\`
- Only this Context Pack is the recovery source for the current managed cycle.

## Phase 1 — Diagram Modules Managed Work

### Stream: Diagram Modules Artifacts

1. [IN_PROGRESS] \`diagram-modules.stream1.task1\` Update Diagram Modules artifacts through the managed workflow (scope: \`.codeai-hub/**/diagram_modules\`; expected commit: \`docs: update diagram modules artifacts\`).
2. [TODO] Git Commit: \`docs: update diagram modules artifacts\` (hash: TBD)
`;

const createPlanCliShim = (): string => `#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PLAN_PATH = "doc/TODO/todo-plan.md";
const START = "<!-- codeai-plan-state:start -->";
const END = "<!-- codeai-plan-state:end -->";

const readState = () => {
  if (!existsSync(PLAN_PATH)) {
    throw new Error("Missing doc/TODO/todo-plan.md");
  }
  const text = readFileSync(PLAN_PATH, "utf8");
  const block = text.split(START)[1]?.split(END)[0];
  if (!block) {
    throw new Error("Missing codeai-plan-state block");
  }
  const fence = String.fromCharCode(96).repeat(3);
  const json = block
    .trim()
    .replace(new RegExp("^" + fence + "json\\s*", "u"), "")
    .replace(new RegExp("\\s*" + fence + "$", "u"), "")
    .trim();
  return JSON.parse(json);
};

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
