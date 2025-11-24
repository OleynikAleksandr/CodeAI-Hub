import { type ExtensionContext, Uri } from "vscode";
import {
  ensureProjectManagerShortcuts,
  ensureWebClientShortcuts,
} from "../web-client/shortcut-manager";
import {
  ensureLauncherWorkspaceConfig,
  ensureProjectManagerConfig,
  getCefClientTarget,
} from "./launcher";
import {
  ensureLauncherInstalled,
  type LauncherInstallInfo,
} from "./launcher-installer";
import { ensureCefRuntime } from "./runtime-installer";

export async function ensureLauncherDependencies(
  context: ExtensionContext,
  indexPath: string,
  projectManagerIndexPath: string,
  workspacePath: string
): Promise<LauncherInstallInfo> {
  await ensureCefRuntime(context);
  const ensuredLauncher = await ensureLauncherInstalled(context);

  // Web Client Config & Shortcut
  await ensureLauncherWorkspaceConfig(
    ensuredLauncher,
    indexPath,
    workspacePath
  );
  const launcherTarget = getCefClientTarget(ensuredLauncher, indexPath);
  await ensureWebClientShortcuts(launcherTarget);

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
  ];

  await ensureProjectManagerShortcuts({
    path: ensuredLauncher.executablePath,
    args: pmArgs,
  });

  return ensuredLauncher;
}
