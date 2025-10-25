import path from "node:path";
import {
  commands,
  type ExtensionContext,
  env,
  ProgressLocation,
  Uri,
  window,
  workspace,
} from "vscode";
import {
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
import { ensureWebClientShortcuts } from "./extension-module/web-client/shortcut-manager";

let coreProcessManager: CoreProcessManager | null = null;

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
  let ensuredCore: CoreRuntimeInfo | null = null;

  if (!env.remoteName) {
    try {
      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          cancellable: false,
          title: "Preparing CodeAI Hub runtime",
        },
        async (progress) => {
          progress.report({ message: "Ensuring CEF runtime…" });
          await ensureCefRuntime(context, progress);
          progress.report({ message: "Ensuring CodeAIHubLauncher…" });
          const ensuredLauncher = await ensureLauncherInstalled(
            context,
            progress
          );
          const target = getCefClientTarget(ensuredLauncher, indexPath);
          progress.report({ message: "Finalizing desktop shortcuts…" });
          await ensureWebClientShortcuts(target);
          progress.report({ message: "Ensuring CodeAI Hub core…" });
          ensuredCore = await ensureCoreInstalled(context, progress);
        }
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      window.showErrorMessage(
        `Failed to prepare CodeAI Hub runtime: ${reason}`
      );
      throw error instanceof Error ? error : new Error(reason);
    }

    coreProcessManager = new CoreProcessManager(context);
    await coreProcessManager.ensureStarted(ensuredCore ?? undefined);
  }

  const provider = new HomeViewProvider(
    context.extensionUri,
    coreConnectionInfo
  );

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
        const { launcher } = await window.withProgress(
          {
            location: ProgressLocation.Notification,
            cancellable: false,
            title: "Preparing CodeAI Hub client",
          },
          async (progress) => {
            await ensureCefRuntime(context, progress);
            const ensuredLauncher = await ensureLauncherInstalled(
              context,
              progress
            );
            return { launcher: ensuredLauncher };
          }
        );

        await launchCefClient(launcher, indexPath);

        const target = getCefClientTarget(launcher, indexPath);
        await ensureWebClientShortcuts(target);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        window.showErrorMessage(
          `Failed to launch CodeAI Hub client: ${reason}`
        );
      }
    })
  );
}

export function deactivate(): void {
  coreProcessManager?.dispose();
}
