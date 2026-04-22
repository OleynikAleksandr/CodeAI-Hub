import {
  commands,
  type ExtensionContext,
  env,
  window,
  workspace,
} from "vscode";
import { ensureLauncherDependencies } from "./extension-module/cef/launcher-setup";
import {
  type CoreRuntimeInfo,
  ensureCoreInstalled,
} from "./extension-module/core/core-installer";
import { HomeViewProvider } from "./extension-module/home-view-provider";
import {
  disposeExtensionLogger,
  getExtensionLogger,
} from "./extension-module/logging/extension-logger";
import { recordVsixVersion } from "./extension-module/runtime/runtime-registry";
import { ensureFlowNodeContinuityTemplatesInstalled } from "./extension-module/templates/flow-node-continuity-template-installer";
import { prepareUIBundles } from "./extension-module/ui/ui-activation";

const resolveWorkspacePath = (): string =>
  workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

function ensureCoreAndProviderComponents(
  context: ExtensionContext
): Promise<CoreRuntimeInfo> {
  return ensureCoreInstalled(context);
}

async function prepareDistributionShell(
  context: ExtensionContext,
  projectManagerIndexPath: string
): Promise<void> {
  const logger = getExtensionLogger();
  if (env.remoteName) {
    logger.log("extension:prepareDistributionShell:remote", {
      remoteName: env.remoteName,
      message:
        "Proceeding with local runtime preparation in remote environment.",
    });
  }

  try {
    const workspacePath = resolveWorkspacePath();
    await ensureLauncherDependencies(
      context,
      projectManagerIndexPath,
      projectManagerIndexPath,
      workspacePath
    );
    const ensuredCore = await ensureCoreAndProviderComponents(context);
    logger.log("extension:prepareDistributionShell:components-ready", {
      runtimeVersion: ensuredCore.version,
    });
  } catch (error) {
    logger.warn("extension:prepareDistributionShell:error", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function registerCommands(
  context: ExtensionContext,
  provider: HomeViewProvider
): void {
  context.subscriptions.push(
    window.registerWebviewViewProvider(HomeViewProvider.viewType, provider),
    commands.registerCommand("codeaiHub.openSettings", () => {
      provider.showSettingsPlaceholder();
    })
  );
}

export async function activate(context: ExtensionContext): Promise<void> {
  const logger = getExtensionLogger();

  // Prepare UI bundles
  const { webview, projectManager } = await prepareUIBundles(context, logger);
  const webviewUIRoot = webview.path;
  const projectManagerIndexPath = projectManager.path;

  const extensionVersion =
    (context.extension.packageJSON as { readonly version?: string } | undefined)
      ?.version ?? "0.0.0";

  logger.log("extension:activate:start", {
    version: extensionVersion,
    remoteName: env.remoteName ?? null,
  });

  await recordVsixVersion({
    version: extensionVersion,
    extensionPath: context.extensionUri.fsPath,
  });

  await ensureFlowNodeContinuityTemplatesInstalled(context, logger);
  await prepareDistributionShell(context, projectManagerIndexPath);

  const provider = new HomeViewProvider(context.extensionUri, webviewUIRoot);

  registerCommands(context, provider);
}

export function deactivate(): void {
  const logger = getExtensionLogger();
  logger.log("extension:deactivate", {});
  disposeExtensionLogger();
}
