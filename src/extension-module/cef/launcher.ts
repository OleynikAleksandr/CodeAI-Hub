import { promises as fs } from "node:fs";
import path from "node:path";
import { Uri } from "vscode";
import type { LauncherInstallInfo } from "./launcher-installer";
import { ensureDirectory } from "./runtime-files";

const CONFIG_FILE_NAME = "config.json";

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
