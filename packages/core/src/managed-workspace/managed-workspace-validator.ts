import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { MANAGED_WORKSPACE_MANIFEST_RELATIVE_PATH } from "./managed-workspace-manifest";
import { createManagedWorkspacePaths } from "./managed-workspace-paths";

const REQUIRED_PACKAGE_SCRIPTS: readonly string[] = [
  "plan:commit",
  "plan:repair",
  "plan:status",
  "plan:validate",
];

const REQUIRED_GITIGNORE_ENTRIES: readonly string[] = [
  ".codeai-hub/runtime",
  ".codeai-hub/logs",
  ".codeai-hub/cache",
];
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const WORKSPACE_PLAN_STATE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_PLAN_STATE_END = "<!-- codeai-workspace-plan-state:end -->";
const JSON_FENCE_END_RE = /\s*```$/u;
const JSON_FENCE_START_RE = /^```json\s*/u;
const LINE_SPLIT_RE = /\r?\n/u;
const TRAILING_SLASH_RE = /\/$/u;

export type ManagedWorkspaceValidationIssueCode =
  | "missing_directory"
  | "missing_file"
  | "missing_git_repo"
  | "missing_gitignore_entry"
  | "missing_package_script"
  | "open_plan_debt"
  | "blocked_active_plan";

export interface ManagedWorkspaceValidationIssue {
  readonly code: ManagedWorkspaceValidationIssueCode;
  readonly message: string;
  readonly relativePath: string;
}

export interface ManagedWorkspaceValidationResult {
  readonly issues: readonly ManagedWorkspaceValidationIssue[];
  readonly ok: boolean;
  readonly workspaceRoot: string;
}

export class ManagedWorkspaceValidator {
  async validate(
    workspaceRoot: string
  ): Promise<ManagedWorkspaceValidationResult> {
    const paths = createManagedWorkspacePaths(workspaceRoot);
    const issues: ManagedWorkspaceValidationIssue[] = [];

    if (!(await pathExists(path.join(paths.workspaceRoot, ".git")))) {
      issues.push(issue("missing_git_repo", ".git", "Missing Git repository"));
    }

    for (const directory of [
      paths.controlPlaneRoot,
      paths.hookDirectory,
      paths.planCommandDirectory,
      paths.workflowCheckDirectory,
      paths.workflowMigrationDirectory,
      ...paths.workflowRevisionDirectories,
      ...paths.ignoredStateDirectories,
    ]) {
      if (!(await isDirectory(directory.absolutePath))) {
        issues.push(
          issue(
            "missing_directory",
            directory.relativePath,
            "Missing directory"
          )
        );
      }
    }

    const activePlanPath = await readActivePlanPath(paths.workspaceRoot);
    for (const file of [
      {
        absolutePath: path.join(paths.workspaceRoot, WORKSPACE_PLAN_PATH),
        relativePath: WORKSPACE_PLAN_PATH,
      },
      ...(activePlanPath
        ? [
            {
              absolutePath: path.join(paths.workspaceRoot, activePlanPath),
              relativePath: activePlanPath,
            },
          ]
        : []),
      paths.packageManifest,
      ...paths.hooks,
      {
        absolutePath: path.join(
          paths.workspaceRoot,
          MANAGED_WORKSPACE_MANIFEST_RELATIVE_PATH
        ),
        relativePath: MANAGED_WORKSPACE_MANIFEST_RELATIVE_PATH,
      },
    ]) {
      if (!(await isFile(file.absolutePath))) {
        issues.push(issue("missing_file", file.relativePath, "Missing file"));
      }
    }
    if (activePlanPath) {
      issues.push(
        ...(await validateActivePlanState(paths.workspaceRoot, activePlanPath))
      );
    } else {
      issues.push(
        issue(
          "missing_file",
          WORKSPACE_PLAN_PATH,
          "Missing activePlanPath in workspace plan"
        )
      );
    }

    issues.push(
      ...(await validatePackageScripts(paths.packageManifest.absolutePath))
    );
    issues.push(...(await validateGitignore(paths.workspaceRoot)));

    return {
      ok: issues.length === 0,
      issues,
      workspaceRoot: paths.workspaceRoot,
    };
  }
}

const issue = (
  code: ManagedWorkspaceValidationIssueCode,
  relativePath: string,
  message: string
): ManagedWorkspaceValidationIssue => ({
  code,
  relativePath,
  message,
});

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const validateActivePlanState = async (
  workspaceRoot: string,
  activePlanPath: string
): Promise<readonly ManagedWorkspaceValidationIssue[]> => {
  const activePlan = await readText(path.join(workspaceRoot, activePlanPath));
  const rawState = activePlan
    .split("<!-- codeai-plan-state:start -->")[1]
    ?.split("<!-- codeai-plan-state:end -->")[0];
  if (!rawState) {
    return [
      issue(
        "blocked_active_plan",
        activePlanPath,
        "Missing active plan machine state"
      ),
    ];
  }
  try {
    const state = JSON.parse(stripJsonFence(rawState)) as {
      readonly debt?: unknown;
      readonly executionScopeStatus?: unknown;
    };
    if (state.debt !== null && state.debt !== undefined) {
      return [
        issue("open_plan_debt", activePlanPath, "Active plan debt is open"),
      ];
    }
    if (state.executionScopeStatus === "BLOCKED") {
      return [
        issue("blocked_active_plan", activePlanPath, "Active plan is blocked"),
      ];
    }
  } catch {
    return [
      issue(
        "blocked_active_plan",
        activePlanPath,
        "Active plan machine state is invalid"
      ),
    ];
  }
  return [];
};

const isDirectory = async (targetPath: string): Promise<boolean> => {
  try {
    return (await stat(targetPath)).isDirectory();
  } catch {
    return false;
  }
};

const isFile = async (targetPath: string): Promise<boolean> => {
  try {
    return (await stat(targetPath)).isFile();
  } catch {
    return false;
  }
};

const validatePackageScripts = async (
  packageManifestPath: string
): Promise<readonly ManagedWorkspaceValidationIssue[]> => {
  const packageJson = await readJsonObject(packageManifestPath);
  const scripts = readStringMap(packageJson.scripts);
  return REQUIRED_PACKAGE_SCRIPTS.filter(
    (scriptName) => !scripts[scriptName]
  ).map((scriptName) =>
    issue(
      "missing_package_script",
      "package.json",
      `Missing package script ${scriptName}`
    )
  );
};

const validateGitignore = async (
  workspaceRoot: string
): Promise<readonly ManagedWorkspaceValidationIssue[]> => {
  const gitignore = await readText(path.join(workspaceRoot, ".gitignore"));
  const normalizedLines = new Set(
    gitignore
      .split(LINE_SPLIT_RE)
      .map((line) => line.trim().replace(TRAILING_SLASH_RE, ""))
      .filter(Boolean)
  );
  return REQUIRED_GITIGNORE_ENTRIES.filter(
    (entry) => !normalizedLines.has(entry)
  ).map((entry) =>
    issue(
      "missing_gitignore_entry",
      ".gitignore",
      `Missing ignore entry ${entry}`
    )
  );
};

const readActivePlanPath = async (
  workspaceRoot: string
): Promise<string | null> => {
  const workspacePlan = await readText(
    path.join(workspaceRoot, WORKSPACE_PLAN_PATH)
  );
  const rawState = workspacePlan
    .split(WORKSPACE_PLAN_STATE_START)[1]
    ?.split(WORKSPACE_PLAN_STATE_END)[0];
  if (!rawState) {
    return null;
  }
  const jsonText = stripJsonFence(rawState);
  try {
    const state = JSON.parse(jsonText) as { readonly activePlanPath?: unknown };
    return typeof state.activePlanPath === "string"
      ? state.activePlanPath
      : null;
  } catch {
    return null;
  }
};

const stripJsonFence = (value: string): string => {
  const trimmed = value.trim();
  const withoutStart = trimmed.replace(JSON_FENCE_START_RE, "");
  return withoutStart.replace(JSON_FENCE_END_RE, "").trim();
};

const readJsonObject = async (
  targetPath: string
): Promise<Record<string, unknown>> => {
  try {
    const value = JSON.parse(await readFile(targetPath, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  } catch {
    return {};
  }
};

const readStringMap = (value: unknown): Record<string, string> => {
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

const readText = async (targetPath: string): Promise<string> => {
  try {
    return await readFile(targetPath, "utf8");
  } catch {
    return "";
  }
};
