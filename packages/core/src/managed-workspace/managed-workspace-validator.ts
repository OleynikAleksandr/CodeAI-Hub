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
const LINE_SPLIT_RE = /\r?\n/u;
const TRAILING_SLASH_RE = /\/$/u;

export type ManagedWorkspaceValidationIssueCode =
  | "missing_directory"
  | "missing_file"
  | "missing_git_repo"
  | "missing_gitignore_entry"
  | "missing_package_script";

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

    for (const file of [
      paths.todoPlan,
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
