import { commands, type ExtensionContext, window } from "vscode";
import { HomeViewProvider } from "./extension-module/home-view-provider";

export function activate(context: ExtensionContext): void {
  const provider = new HomeViewProvider(context.extensionUri);

  context.subscriptions.push(
    window.registerWebviewViewProvider(HomeViewProvider.viewType, provider),
    commands.registerCommand("codeaiHub.openSettings", () => {
      provider.showSettingsPlaceholder();
    })
  );
}

export function deactivate(): void {
  // Nothing to clean up yet.
}
