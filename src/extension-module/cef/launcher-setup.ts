import path from "node:path";
import { type ExtensionContext, Uri } from "vscode";
import { ensureProjectManagerConfig } from "./launcher";
import {
  ensureLauncherInstalled,
  type LauncherInstallInfo,
} from "./launcher-installer";
import { ensureCefRuntime } from "./runtime-installer";
import { ensureProjectManagerShortcuts } from "./shortcut-manager";

export async function ensureLauncherDependencies(
  context: ExtensionContext,
  _indexPath: string,
  projectManagerIndexPath: string,
  workspacePath: string
): Promise<LauncherInstallInfo> {
  await ensureCefRuntime(context);
  const ensuredLauncher = await ensureLauncherInstalled(context);

  // Define unique data directories
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const baseDataDir = path.join(homeDir, ".codeai-hub", "data");
  const projectManagerDataDir = path.join(baseDataDir, "project-manager");

  // Project Manager Config & Shortcut
  const pmConfigPath = await ensureProjectManagerConfig(
    ensuredLauncher,
    projectManagerIndexPath,
    workspacePath
  );

  const pmArgs = [
    `--config=${pmConfigPath}`,
    `--url=${Uri.file(projectManagerIndexPath).toString()}`,
    "--use-alloy-style",
    `--user-data-dir=${projectManagerDataDir}`,
  ];

  await ensureProjectManagerShortcuts({
    path: ensuredLauncher.executablePath,
    args: pmArgs,
  });

  return ensuredLauncher;
}
