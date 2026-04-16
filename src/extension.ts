import {
  commands,
  type ExtensionContext,
  env,
  window,
  workspace,
} from "vscode";
import { ensureLauncherDependencies } from "./extension-module/cef/launcher-setup";
import { resolvePlatformKey } from "./extension-module/cef/platform";
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
import {
  disposeExtensionLogger,
  getExtensionLogger,
} from "./extension-module/logging/extension-logger";
import { recordVsixVersion } from "./extension-module/runtime/runtime-registry";
import { ProviderAutoUpdateService } from "./extension-module/settings/provider-auto-update-service";
import {
  applyDefaultModelsEnv,
  loadSettingsSnapshot,
} from "./extension-module/settings/settings-storage";
import { ensureFlowNodeContinuityTemplatesInstalled } from "./extension-module/templates/flow-node-continuity-template-installer";
import { prepareUIBundles } from "./extension-module/ui/ui-activation";

let coreProcessManager: CoreProcessManager | null = null;
let coreKeepAlive: CoreKeepAlive | null = null;
const resolveWorkspacePath = (): string =>
  workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

function ensureCoreAndProviderComponents(
  context: ExtensionContext
): Promise<CoreRuntimeInfo> {
  return ensureCoreInstalled(context);
}

async function resolveDeclaredCoreVersion(
  context: ExtensionContext
): Promise<string> {
  const manifest = await readCoreManifest(context);
  const platform = resolvePlatformKey();
  const manifestEntry = getManifestEntryOrThrow(manifest, platform);
  return manifestEntry.coreVersion;
}

async function initializeCoreManager(context: ExtensionContext): Promise<void> {
  const declaredVersion = await resolveDeclaredCoreVersion(context);
  const logger = getExtensionLogger();
  logger.log("core-manager:init", { declaredVersion });
  coreProcessManager = new CoreProcessManager();
  coreProcessManager.setDeclaredVersion(declaredVersion);
  logger.log("core-manager:attachToRunningCore:start", {
    targetVersion: declaredVersion,
  });
  const attached =
    await coreProcessManager.attachToRunningCore(declaredVersion);
  if (attached) {
    logger.log("core-manager:attachToRunningCore:attached", {
      targetVersion: declaredVersion,
    });
    return;
  }
  logger.log("core-manager:attachToRunningCore:miss", {
    targetVersion: declaredVersion,
  });
  const ensuredCore = await ensureCoreAndProviderComponents(context);
  logger.log("core-manager:ensureCoreAndProviders:done", {
    runtimeVersion: ensuredCore.version,
  });
  await coreProcessManager.ensureStarted(ensuredCore, {
    targetVersion: declaredVersion,
  });
  logger.log("core-manager:ensureStarted:done", {
    targetVersion: declaredVersion,
  });
}

async function prepareLocalRuntime(
  context: ExtensionContext,
  indexPath: string,
  projectManagerIndexPath: string
): Promise<void> {
  const logger = getExtensionLogger();
  if (env.remoteName) {
    logger.log("extension:prepareLocalRuntime:remote", {
      remoteName: env.remoteName,
      message:
        "Proceeding with local runtime preparation in remote environment.",
    });
  }

  try {
    const workspacePath = resolveWorkspacePath();
    await ensureLauncherDependencies(
      context,
      indexPath,
      projectManagerIndexPath,
      workspacePath
    );
    const autoUpdateService = new ProviderAutoUpdateService();
    const settingsSnapshot = loadSettingsSnapshot();
    applyDefaultModelsEnv(settingsSnapshot);
    try {
      await autoUpdateService.run(settingsSnapshot);
    } catch (error) {
      logger.warn("extension:auto-update:error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    await initializeCoreManager(context);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    window.showErrorMessage(`Failed to prepare CodeAI Hub runtime: ${reason}`);
    throw error instanceof Error ? error : new Error(reason);
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

  await prepareLocalRuntime(
    context,
    projectManagerIndexPath,
    projectManagerIndexPath
  );
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

  const workspacePath = resolveWorkspacePath();
  const resolvedConnectionInfo = {
    ...(coreProcessManager?.getConnectionInfo() ??
      getDefaultCoreConnectionInfo()),
    workspacePath,
  };
  logger.log("extension:activate:connectionInfo", {
    httpUrl: resolvedConnectionInfo.httpUrl,
    wsUrl: resolvedConnectionInfo.wsUrl,
  });

  const provider = new HomeViewProvider(
    context.extensionUri,
    webviewUIRoot,
    resolvedConnectionInfo,
    coreProcessManager ?? undefined
  );

  registerCommands(context, provider);
}

export function deactivate(): void {
  const logger = getExtensionLogger();
  logger.log("extension:deactivate", {});
  coreKeepAlive?.dispose();
  coreKeepAlive = null;
  coreProcessManager?.dispose();
  disposeExtensionLogger();
}
