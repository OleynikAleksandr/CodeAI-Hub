import {
	commands,
	type ExtensionContext,
	env,
	window,
	workspace,
} from "vscode";
import { launchCefClient } from "./extension-module/cef/launcher";
import type { LauncherInstallInfo } from "./extension-module/cef/launcher-installer";
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
import { prepareUIBundles } from "./extension-module/ui/ui-activation";

let coreProcessManager: CoreProcessManager | null = null;
let coreKeepAlive: CoreKeepAlive | null = null;
let cachedLauncherInstallInfo: LauncherInstallInfo | null = null;
const resolveWorkspacePath = (): string =>
	workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

function ensureCoreAndProviderComponents(
	context: ExtensionContext,
): Promise<CoreRuntimeInfo> {
	return ensureCoreInstalled(context);
}

async function resolveDeclaredCoreVersion(
	context: ExtensionContext,
): Promise<string> {
	const manifest = await readCoreManifest(context);
	const platform = resolvePlatformKey();
	const manifestEntry = getManifestEntryOrThrow(manifest, platform);
	return manifestEntry.coreVersion;
}

async function handleLaunchWebClientCommand(
	_context: ExtensionContext,
	indexPath: string,
): Promise<void> {
	const workspacePath = resolveWorkspacePath();
	if (!cachedLauncherInstallInfo) {
		window.showWarningMessage(
			"CodeAI Hub launcher is not configured. Reload the extension to install required components.",
		);
		return;
	}
	if (coreProcessManager) {
		try {
			await coreProcessManager.ensureStarted();
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			window.showWarningMessage(
				`CodeAI Hub core restart failed before launching web client: ${reason}`,
			);
		}
	}
	await launchCefClient(cachedLauncherInstallInfo, indexPath, workspacePath);
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
	projectManagerIndexPath: string,
): Promise<void> {
	if (env.remoteName) {
		const logger = getExtensionLogger();
		logger.log("extension:prepareLocalRuntime:remote", {
			remoteName: env.remoteName,
			message:
				"Proceeding with local runtime preparation in remote environment.",
		});
	}

	try {
		const workspacePath = resolveWorkspacePath();
		cachedLauncherInstallInfo = await ensureLauncherDependencies(
			context,
			indexPath,
			projectManagerIndexPath,
			workspacePath,
		);
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
	indexPath: string,
): void {
	context.subscriptions.push(
		window.registerWebviewViewProvider(HomeViewProvider.viewType, provider),
		commands.registerCommand("codeaiHub.openSettings", () => {
			provider.showSettingsPlaceholder();
		}),
		commands.registerCommand("codeaiHub.launchWebClient", async () => {
			if (env.remoteName) {
				window.showWarningMessage(
					"Launching the local CodeAI Hub client is not supported in remote workspaces.",
				);
				return;
			}

			try {
				await handleLaunchWebClientCommand(context, indexPath);
			} catch (error) {
				const reason = error instanceof Error ? error.message : String(error);
				window.showErrorMessage(
					`Failed to launch CodeAI Hub client: ${reason}`,
				);
			}
		}),
	);
}

export async function activate(context: ExtensionContext): Promise<void> {
	const logger = getExtensionLogger();

	// Prepare UI bundles
	const { webview, webClient, projectManager } = await prepareUIBundles(
		context,
		logger,
	);
	const webviewUIRoot = webview.path;
	const webClientIndexPath = webClient.path;
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

	await prepareLocalRuntime(
		context,
		webClientIndexPath,
		projectManagerIndexPath,
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

	const resolvedConnectionInfo =
		coreProcessManager?.getConnectionInfo() ?? getDefaultCoreConnectionInfo();
	logger.log("extension:activate:connectionInfo", {
		httpUrl: resolvedConnectionInfo.httpUrl,
		wsUrl: resolvedConnectionInfo.wsUrl,
	});

	const provider = new HomeViewProvider(
		context.extensionUri,
		webviewUIRoot,
		resolvedConnectionInfo,
		coreProcessManager ?? undefined,
	);

	registerCommands(context, provider, webClientIndexPath);
}

export function deactivate(): void {
	const logger = getExtensionLogger();
	logger.log("extension:deactivate", {});
	coreKeepAlive?.dispose();
	coreKeepAlive = null;
	coreProcessManager?.dispose();
	disposeExtensionLogger();
}
