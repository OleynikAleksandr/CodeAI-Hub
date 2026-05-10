import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createPlanCliShim } from "./managed-plan-orchestrator-shim-source";
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
    return { private: true, scripts: {} };
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
