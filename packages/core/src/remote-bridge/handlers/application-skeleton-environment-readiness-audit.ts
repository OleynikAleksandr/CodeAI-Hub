import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";

const COMMAND_TIMEOUT_MS = 120_000;
const COMMAND_OUTPUT_LIMIT = 1024 * 1024;
const WHITESPACE_RE = /\s+/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringArray = (
  value: Record<string, unknown> | null,
  key: string
): readonly string[] => {
  const raw = value?.[key];
  return Array.isArray(raw)
    ? raw.filter((entry): entry is string => typeof entry === "string")
    : [];
};

const splitCommand = (command: string): readonly string[] =>
  command
    .trim()
    .split(WHITESPACE_RE)
    .filter((part) => part.length > 0);

const relativePathExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> =>
  Boolean(await stat(path.join(workspaceRoot, relativePath)).catch(() => null));

const runCommand = async (
  workspaceRoot: string,
  commandParts: readonly string[]
): Promise<string | null> =>
  new Promise((resolve) => {
    const [command, ...args] = commandParts;
    if (!command) {
      resolve("empty command");
      return;
    }
    execFile(
      command,
      args,
      {
        cwd: workspaceRoot,
        maxBuffer: COMMAND_OUTPUT_LIMIT,
        timeout: COMMAND_TIMEOUT_MS,
      },
      (error) => {
        if (!error) {
          resolve(null);
          return;
        }
        resolve(error.message);
      }
    );
  });

const toScriptCommand = (
  packageManager: string,
  script: string
): readonly string[] | null => {
  switch (packageManager) {
    case "bun":
      return ["bun", "run", script];
    case "npm":
      return ["npm", "run", script];
    case "pnpm":
      return ["pnpm", "run", script];
    case "yarn":
      return ["yarn", "run", script];
    default:
      return null;
  }
};

const expectedInstallOutputPaths = (
  packageManager: string
): readonly string[] => {
  switch (packageManager) {
    case "bun":
    case "npm":
    case "pnpm":
    case "yarn":
      return ["node_modules"];
    default:
      return [];
  }
};

export const auditApplicationSkeletonEnvironmentReadiness = async (params: {
  readonly mapJson: Record<string, unknown> | null;
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  const foundation = isRecord(params.mapJson?.projectFoundation)
    ? params.mapJson.projectFoundation
    : null;
  if (!foundation) {
    return [
      "application skeleton environment audit skipped: projectFoundation is missing",
    ];
  }
  const packageManager =
    typeof params.mapJson?.packageManager === "string"
      ? params.mapJson.packageManager.toLowerCase()
      : "";
  const installCommand =
    typeof foundation.installCommand === "string"
      ? foundation.installCommand.trim()
      : "";
  const errors: string[] = [];
  if (installCommand) {
    const installError = await runCommand(
      params.workspaceRoot,
      splitCommand(installCommand)
    );
    if (installError) {
      errors.push(
        `application skeleton install command failed: ${installCommand}: ${installError}`
      );
    }
  } else {
    errors.push("application skeleton install command is missing");
  }
  for (const expectedPath of expectedInstallOutputPaths(packageManager)) {
    if (!(await relativePathExists(params.workspaceRoot, expectedPath))) {
      errors.push(
        `application skeleton install output is missing: ${expectedPath}`
      );
    }
  }
  for (const script of readStringArray(foundation, "requiredScripts")) {
    const scriptCommand = toScriptCommand(packageManager, script);
    if (!scriptCommand) {
      errors.push(
        `application skeleton required script audit is unsupported for packageManager ${packageManager}: ${script}`
      );
      continue;
    }
    const scriptError = await runCommand(params.workspaceRoot, scriptCommand);
    if (scriptError) {
      errors.push(
        `application skeleton required script failed: ${script}: ${scriptError}`
      );
    }
  }
  return errors;
};
