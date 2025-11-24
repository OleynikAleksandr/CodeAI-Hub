import path from "node:path";
import { type ExtensionContext, window } from "vscode";
import type { ExtensionLogger } from "../logging/extension-logger";
import { UIBundleInstaller } from "./ui-installer";
import { readUIManifest } from "./ui-manifest-reader";
import { resolveUIBundlePath } from "./ui-path-resolver";
import { UIRegistry } from "./ui-registry";

export type UIActivationResult = {
  webview: {
    path: string;
    source: "installed" | "embedded";
  };
  webClient: {
    path: string;
    source: "installed" | "embedded";
  };
};

export async function prepareUIBundles(
  context: ExtensionContext,
  logger: ExtensionLogger
): Promise<UIActivationResult> {
  // 1. Install missing UI bundles
  try {
    const manifestPath = path.join(
      context.extensionUri.fsPath,
      "assets",
      "ui",
      "manifest.json"
    );
    const manifest = await readUIManifest(manifestPath);
    const registry = new UIRegistry();
    const installer = new UIBundleInstaller(registry, manifest);

    logger.log("extension:activate:install-bundles:start");
    await installer.installMissingBundles();
    logger.log("extension:activate:install-bundles:done");
  } catch (error) {
    logger.log("extension:activate:install-bundles:failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Continue execution, hoping fallback paths work
  }

  // 2. Resolve vscode-webview bundle
  const embeddedWebviewPath = path.join(
    context.extensionUri.fsPath,
    "media",
    "react-chat.js"
  );

  let webviewUIRoot: string;
  let webviewSource: "installed" | "embedded";

  try {
    const resolved = await resolveUIBundlePath(
      "vscode-webview",
      embeddedWebviewPath
    );

    if (resolved.source === "installed") {
      webviewUIRoot = resolved.path;
    } else {
      webviewUIRoot = path.dirname(resolved.path);
    }
    webviewSource = resolved.source;

    logger.log("extension:activate:ui-resolved:vscode-webview", {
      source: resolved.source,
      path: webviewUIRoot,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    window.showErrorMessage(`Failed to resolve webview UI: ${reason}`);
    throw error instanceof Error ? error : new Error(String(error));
  }

  // 3. Resolve web-client bundle
  const embeddedWebClientPath = path.join(
    context.extensionUri.fsPath,
    "media",
    "web-client",
    "dist",
    "index.html"
  );

  let webClientIndexPath: string;
  let webClientSource: "installed" | "embedded";

  try {
    const resolved = await resolveUIBundlePath(
      "web-client",
      embeddedWebClientPath
    );

    if (resolved.source === "installed") {
      webClientIndexPath = path.join(resolved.path, "index.html");
    } else {
      webClientIndexPath = resolved.path;
    }
    webClientSource = resolved.source;

    logger.log("extension:activate:ui-resolved:web-client", {
      source: resolved.source,
      path: webClientIndexPath,
    });
  } catch (error) {
    // Non-fatal for extension activation, but launcher won't work
    logger.log("extension:activate:ui-resolved:web-client:failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    webClientIndexPath = embeddedWebClientPath;
    webClientSource = "embedded";
  }

  return {
    webview: { path: webviewUIRoot, source: webviewSource },
    webClient: { path: webClientIndexPath, source: webClientSource },
  };
}
