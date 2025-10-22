import path from "node:path";
import {
  commands,
  type ExtensionContext,
  env,
  Uri,
  window,
  workspace,
} from "vscode";
import { HomeViewProvider } from "./extension-module/home-view-provider";
import { ensureWebClientShortcuts } from "./extension-module/web-client/shortcut-manager";

export function activate(context: ExtensionContext): void {
  const provider = new HomeViewProvider(context.extensionUri);

  context.subscriptions.push(
    window.registerWebviewViewProvider(HomeViewProvider.viewType, provider),
    commands.registerCommand("codeaiHub.openSettings", () => {
      provider.showSettingsPlaceholder();
    }),
    commands.registerCommand("codeaiHub.launchWebClient", async () => {
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
        window.showErrorMessage(
          `Unable to locate web client bundle: ${reason}`
        );
        return;
      }

      const opened = await env.openExternal(indexUri);
      if (!opened) {
        window.showWarningMessage(
          "Opening the web client failed. Please open the generated index.html manually."
        );
      }
    })
  );

  if (!env.remoteName) {
    ensureWebClientShortcuts(context.extensionUri).catch(() => {
      /* no-op */
    });
  }
}

export function deactivate(): void {
  // Nothing to clean up yet.
}
