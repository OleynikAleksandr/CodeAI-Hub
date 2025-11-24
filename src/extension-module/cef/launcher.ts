import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Uri } from "vscode";
import type { LauncherInstallInfo } from "./launcher-installer";
import { ensureDirectory } from "./runtime-files";

const CONFIG_FILE_NAME = "config.json";

const buildLaunchArgs = (
  indexFilePath: string,
  configPath: string,
  userDataDir?: string
): string[] => {
  const fileUrl = Uri.file(indexFilePath).toString();
  const args = [
    `--config=${configPath}`,
    `--url=${fileUrl}`,
    "--use-alloy-style",
  ];

  if (userDataDir) {
    args.push(`--user-data-dir=${userDataDir}`);
  }

  return args;
};

const readExistingConfig = async (
  configPath: string
): Promise<Record<string, unknown>> => {
  try {
    const raw = await fs.readFile(configPath, { encoding: "utf8" });
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    /* ignore missing or invalid config */
  }
  return {};
};

const ensureLauncherConfig = async (
  launcher: LauncherInstallInfo,
  indexFilePath: string,
  workspacePath?: string,
  configFileName: string = CONFIG_FILE_NAME
): Promise<string> => {
  const configDir = path.join(launcher.installDir, "config");
  await ensureDirectory(configDir);

  const configPath = path.join(configDir, configFileName);
  const existingConfig = await readExistingConfig(configPath);

  const config = {
    ...existingConfig,
    uiRoot: path.dirname(indexFilePath),
    entry: path.basename(indexFilePath),
    url: Uri.file(indexFilePath).toString(),
    generatedAt: new Date().toISOString(),
    workspacePath: workspacePath ?? existingConfig.workspacePath,
  };

  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
  });

  return configPath;
};

export const ensureLauncherWorkspaceConfig = (
  launcher: LauncherInstallInfo,
  indexFilePath: string,
  workspacePath?: string
): Promise<string> =>
  ensureLauncherConfig(launcher, indexFilePath, workspacePath);

export const ensureProjectManagerConfig = (
  launcher: LauncherInstallInfo,
  indexFilePath: string,
  workspacePath?: string
): Promise<string> =>
  ensureLauncherConfig(
    launcher,
    indexFilePath,
    workspacePath,
    "project-manager.json"
  );

export const launchCefClient = async (
  launcher: LauncherInstallInfo,
  indexFilePath: string,
  workspacePath?: string,
  userDataDir?: string
): Promise<void> => {
  const { executablePath: binaryPath } = launcher;

  try {
    await fs.access(binaryPath);
  } catch {
    throw new Error(
      `CEF client binary is missing: ${path.relative(process.cwd(), binaryPath)}`
    );
  }

  const configPath = await ensureLauncherWorkspaceConfig(
    launcher,
    indexFilePath,
    workspacePath
  );
  const args = buildLaunchArgs(indexFilePath, configPath, userDataDir);
  const workingDir = path.dirname(binaryPath);

  const envVars: NodeJS.ProcessEnv = {
    ...process.env,
  };
  if (workspacePath) {
    envVars.CLAUDE_WORKSPACE_PATH = workspacePath;
    envVars.CODEX_WORKSPACE_PATH = workspacePath;
    envVars.GEMINI_WORKSPACE_PATH = workspacePath;
  }

  const child = spawn(binaryPath, args, {
    cwd: workingDir,
    detached: true,
    stdio: "ignore",
    env: envVars,
  });

  child.unref();
};

export const getCefClientTarget = (
  launcher: LauncherInstallInfo,
  indexFilePath: string,
  userDataDir?: string
): { path: string; args: readonly string[] } => {
  const configPath = path.join(launcher.installDir, "config", CONFIG_FILE_NAME);
  const args = buildLaunchArgs(indexFilePath, configPath, userDataDir);
  return { path: launcher.executablePath, args };
};
