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
import { ensureLauncherInstalled } from "./extension-module/cef/launcher-installer";
import { ensureCefRuntime } from "./extension-module/cef/runtime-installer";
import {
  type CoreRuntimeInfo,
  ensureCoreInstalled,
} from "./extension-module/core/core-installer";
import {
  CoreProcessManager,
  getDefaultCoreConnectionInfo,
} from "./extension-module/core/core-process-manager";
import { HomeViewProvider } from "./extension-module/home-view-provider";
import { ensureClaudeModuleInstalled } from "./extension-module/provider/claude/claude-module-installer";
import { ensureCodexModuleInstalled } from "./extension-module/provider/codex/codex-module-installer";
import { ensureGeminiModuleInstalled } from "./extension-module/provider/gemini/gemini-module-installer";
import { ensureWebClientShortcuts } from "./extension-module/web-client/shortcut-manager";

let coreProcessManager: CoreProcessManager | null = null;

const resolveWorkspacePath = (): string => {
  const folder = workspace.workspaceFolders?.[0];
  if (folder) {
    return folder.uri.fsPath;
  }
  return process.cwd();
};

async function ensureLocalRuntimeComponents(
  context: ExtensionContext,
  indexPath: string,
  workspacePath: string
): Promise<CoreRuntimeInfo | null> {
  await ensureCefRuntime(context);
  const ensuredLauncher = await ensureLauncherInstalled(context);
  await ensureLauncherWorkspaceConfig(
    ensuredLauncher,
    indexPath,
    workspacePath
  );
  const launcherTarget = getCefClientTarget(ensuredLauncher, indexPath);
  await ensureWebClientShortcuts(launcherTarget);
  const ensuredCore = await ensureCoreInstalled(context);
  await ensureClaudeModuleInstalled(context);
  await ensureCodexModuleInstalled(context);
  await ensureGeminiModuleInstalled(context);
  return ensuredCore;
}

async function handleLaunchWebClientCommand(
  context: ExtensionContext,
  indexPath: string
): Promise<void> {
  await ensureCefRuntime(context);
  const ensuredLauncher = await ensureLauncherInstalled(context);
  const workspacePath = resolveWorkspacePath();
  await launchCefClient(ensuredLauncher, indexPath, workspacePath);
  const target = getCefClientTarget(ensuredLauncher, indexPath);
  await ensureWebClientShortcuts(target);
}

async function initializeCoreManager(
  context: ExtensionContext,
  indexPath: string,
  workspacePath: string
): Promise<void> {
  const ensuredCore = await ensureLocalRuntimeComponents(
    context,
    indexPath,
    workspacePath
  );
  coreProcessManager = new CoreProcessManager(context);
  await coreProcessManager.ensureStarted(ensuredCore ?? undefined);
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

  const coreConnectionInfo = getDefaultCoreConnectionInfo();
  const workspacePath = resolveWorkspacePath();

  if (!env.remoteName) {
    try {
      await initializeCoreManager(context, indexPath, workspacePath);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      window.showErrorMessage(
        `Failed to prepare CodeAI Hub runtime: ${reason}`
      );
      throw error instanceof Error ? error : new Error(reason);
    }
  }

  const provider = new HomeViewProvider(
    context.extensionUri,
    coreConnectionInfo,
    coreProcessManager ?? undefined
  );

  registerCommands(context, provider, indexPath);
}

export function deactivate(): void {
  coreProcessManager?.dispose();
}
