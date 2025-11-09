import path from "node:path";
import {
  commands,
  type ExtensionContext,
  env,
  Uri,
  window,
  workspace,
} from "vscode";
import {
  ensureLauncherWorkspaceConfig,
  getCefClientTarget,
  launchCefClient,
} from "./extension-module/cef/launcher";
import {
  ensureLauncherInstalled,
  type LauncherInstallInfo,
} from "./extension-module/cef/launcher-installer";
import { resolvePlatformKey } from "./extension-module/cef/platform";
import { ensureCefRuntime } from "./extension-module/cef/runtime-installer";
import { getDefaultCoreConnectionInfo } from "./extension-module/core/core-connection-info";
import {
  getManifestEntryOrThrow,
  readCoreManifest,
} from "./extension-module/core/core-install-helpers";
import {
  type CoreRuntimeInfo,
  ensureCoreInstalled,
} from "./extension-module/core/core-installer";
import { CoreKeepAlive } from "./extension-module/core/core-keep-alive";
import { CoreProcessManager } from "./extension-module/core/core-process-manager";
import { HomeViewProvider } from "./extension-module/home-view-provider";
import { ensureClaudeModuleInstalled } from "./extension-module/provider/claude/claude-module-installer";
import { ensureCodexModuleInstalled } from "./extension-module/provider/codex/codex-module-installer";
import { ensureGeminiModuleInstalled } from "./extension-module/provider/gemini/gemini-module-installer";
import { recordVsixVersion } from "./extension-module/runtime/runtime-registry";
import { ensureWebClientShortcuts } from "./extension-module/web-client/shortcut-manager";

let coreProcessManager: CoreProcessManager | null = null;
let coreKeepAlive: CoreKeepAlive | null = null;

const resolveWorkspacePath = (): string => {
  const folder = workspace.workspaceFolders?.[0];
  if (folder) {
    return folder.uri.fsPath;
  }
  return process.cwd();
};

async function ensureLauncherDependencies(
  context: ExtensionContext,
  indexPath: string,
  workspacePath: string
): Promise<LauncherInstallInfo> {
  await ensureCefRuntime(context);
  const ensuredLauncher = await ensureLauncherInstalled(context);
  await ensureLauncherWorkspaceConfig(
    ensuredLauncher,
    indexPath,
    workspacePath
  );
  const launcherTarget = getCefClientTarget(ensuredLauncher, indexPath);
  await ensureWebClientShortcuts(launcherTarget);
  return ensuredLauncher;
}

async function ensureCoreAndProviderComponents(
  context: ExtensionContext
): Promise<CoreRuntimeInfo> {
  const ensuredCore = await ensureCoreInstalled(context);
  await ensureClaudeModuleInstalled(context);
  await ensureCodexModuleInstalled(context);
  await ensureGeminiModuleInstalled(context);
  return ensuredCore;
}

async function resolveDeclaredCoreVersion(
  context: ExtensionContext
): Promise<string> {
  const manifest = await readCoreManifest(context);
  const platform = resolvePlatformKey();
  const manifestEntry = getManifestEntryOrThrow(manifest, platform);
  return manifestEntry.coreVersion;
}

async function handleLaunchWebClientCommand(
  context: ExtensionContext,
  indexPath: string
): Promise<void> {
  const workspacePath = resolveWorkspacePath();
  const ensuredLauncher = await ensureLauncherDependencies(
    context,
    indexPath,
    workspacePath
  );
  if (coreProcessManager) {
    try {
      await coreProcessManager.ensureStarted();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      window.showWarningMessage(
        `CodeAI Hub core restart failed before launching web client: ${reason}`
      );
    }
  }
  await launchCefClient(ensuredLauncher, indexPath, workspacePath);
}

async function initializeCoreManager(context: ExtensionContext): Promise<void> {
  const declaredVersion = await resolveDeclaredCoreVersion(context);
  coreProcessManager = new CoreProcessManager(context);
  coreProcessManager.setDeclaredVersion(declaredVersion);
  const attached =
    await coreProcessManager.attachToRunningCore(declaredVersion);
  if (attached) {
    return;
  }
  const ensuredCore = await ensureCoreAndProviderComponents(context);
  await coreProcessManager.ensureStarted(ensuredCore, {
    targetVersion: declaredVersion,
  });
}

async function prepareLocalRuntime(
  context: ExtensionContext,
  indexPath: string
): Promise<void> {
  if (env.remoteName) {
    return;
  }

  try {
    const workspacePath = resolveWorkspacePath();
    await ensureLauncherDependencies(context, indexPath, workspacePath);
    await initializeCoreManager(context);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    window.showErrorMessage(`Failed to prepare CodeAI Hub runtime: ${reason}`);
    throw error instanceof Error ? error : new Error(reason);
  }
}

function registerCommands(
  context: ExtensionContext,
  provider: HomeViewProvider,
  indexPath: string
): void {
  context.subscriptions.push(
    window.registerWebviewViewProvider(HomeViewProvider.viewType, provider),
    commands.registerCommand("codeaiHub.openSettings", () => {
      provider.showSettingsPlaceholder();
    }),
    commands.registerCommand("codeaiHub.launchWebClient", async () => {
      if (env.remoteName) {
        window.showWarningMessage(
          "Launching the local CodeAI Hub client is not supported in remote workspaces."
        );
        return;
      }

      try {
        await handleLaunchWebClientCommand(context, indexPath);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        window.showErrorMessage(
          `Failed to launch CodeAI Hub client: ${reason}`
        );
      }
    })
  );
}

export async function activate(context: ExtensionContext): Promise<void> {
  const indexPath = path.join(
    context.extensionUri.fsPath,
    "media",
    "web-client",
    "dist",
    "index.html"
  );
  const indexUri = Uri.file(indexPath);

  try {
    await workspace.fs.stat(indexUri);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Web client bundle missing.";
    window.showErrorMessage(`Unable to locate web client bundle: ${reason}`);
    throw error instanceof Error ? error : new Error(String(error));
  }

  const extensionVersion =
    (context.extension.packageJSON as { readonly version?: string } | undefined)
      ?.version ?? "0.0.0";
  await recordVsixVersion({
    version: extensionVersion,
    extensionPath: context.extensionUri.fsPath,
  });

  await prepareLocalRuntime(context, indexPath);
  if (!coreKeepAlive && coreProcessManager) {
    coreKeepAlive = new CoreKeepAlive(coreProcessManager);
    coreKeepAlive.start();
    context.subscriptions.push({
      dispose: () => {
        coreKeepAlive?.dispose();
        coreKeepAlive = null;
      },
    });
  }

  const resolvedConnectionInfo =
    coreProcessManager?.getConnectionInfo() ?? getDefaultCoreConnectionInfo();

  const provider = new HomeViewProvider(
    context.extensionUri,
    resolvedConnectionInfo,
    coreProcessManager ?? undefined
  );

  registerCommands(context, provider, indexPath);
}

export function deactivate(): void {
  coreKeepAlive?.dispose();
  coreKeepAlive = null;
  coreProcessManager?.dispose();
}
