import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Uri } from "vscode";
import type { LauncherInstallInfo } from "./launcher-installer";
import { ensureDirectory } from "./runtime-files";

const CONFIG_FILE_NAME = "config.json";

const buildLaunchArgs = (
  indexFilePath: string,
  configPath: string
): string[] => {
  const fileUrl = Uri.file(indexFilePath).toString();
  const args = [
    `--config=${configPath}`,
    `--url=${fileUrl}`,
    "--use-alloy-style",
  ];

  return args;
};

const ensureLauncherConfig = async (
  launcher: LauncherInstallInfo,
  indexFilePath: string
): Promise<string> => {
  const configDir = path.join(launcher.installDir, "config");
  await ensureDirectory(configDir);

  const configPath = path.join(configDir, CONFIG_FILE_NAME);
  const config = {
    uiRoot: path.dirname(indexFilePath),
    entry: path.basename(indexFilePath),
    url: Uri.file(indexFilePath).toString(),
    generatedAt: new Date().toISOString(),
  };

  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
  });

  return configPath;
};

export const launchCefClient = async (
  launcher: LauncherInstallInfo,
  indexFilePath: string
): Promise<void> => {
  const { executablePath: binaryPath } = launcher;

  try {
    await fs.access(binaryPath);
  } catch {
    throw new Error(
      `CEF client binary is missing: ${path.relative(process.cwd(), binaryPath)}`
    );
  }

  const configPath = await ensureLauncherConfig(launcher, indexFilePath);
  const args = buildLaunchArgs(indexFilePath, configPath);
  const workingDir = path.dirname(binaryPath);

  const child = spawn(binaryPath, args, {
    cwd: workingDir,
    detached: true,
    stdio: "ignore",
  });

  child.unref();
};

export const getCefClientTarget = (
  launcher: LauncherInstallInfo,
  indexFilePath: string
): { path: string; args: readonly string[] } => {
  const configPath = path.join(launcher.installDir, "config", CONFIG_FILE_NAME);
  const args = buildLaunchArgs(indexFilePath, configPath);
  return { path: launcher.executablePath, args };
};
