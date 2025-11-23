import path from "node:path";
import { type ExtensionContext, window } from "vscode";
import { UIBundleInstaller } from "./ui-installer";
import { readUIManifest } from "./ui-manifest-reader";
import {
  resolveUIBundlePath,
  type UIPathResolveResult,
} from "./ui-path-resolver";
import { UIRegistry } from "./ui-registry";
import type { UIManifest } from "./ui-types";

type Logger = {
  log: (event: string, payload: unknown) => void;
};

export type ResolvedUIBundles = {
  readonly webview: UIPathResolveResult;
  readonly webClient: UIPathResolveResult;
};

export async function prepareUIBundles(
  context: ExtensionContext,
  logger: Logger
): Promise<ResolvedUIBundles> {
  const manifestPath = path.join(
    context.extensionUri.fsPath,
    "assets",
    "ui",
    "manifest.json"
  );

  let manifest: UIManifest;
  try {
    manifest = await readUIManifest(manifestPath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    window.showErrorMessage(`Failed to read UI manifest: ${reason}`);
    throw error instanceof Error ? error : new Error(reason);
  }

  try {
    const registry = new UIRegistry();
    const installer = new UIBundleInstaller(registry, manifest);
    await installer.installMissingBundles();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    window.showErrorMessage(`Failed to install UI bundles: ${reason}`);
    throw error instanceof Error ? error : new Error(reason);
  }

  try {
    const webview = await resolveUIBundlePath(
      "vscode-webview",
      path.join(context.extensionUri.fsPath, "media")
    );
    const webClient = await resolveUIBundlePath(
      "web-client",
      path.join(context.extensionUri.fsPath, "media", "web-client", "dist")
    );

    logger.log("extension:activate:ui-bundles", {
      vscodeWebview: {
        source: webview.source,
        path: path.join(webview.path, "react-chat.js"),
      },
      webClient: {
        source: webClient.source,
        path: path.join(webClient.path, "index.html"),
      },
    });

    return { webview, webClient };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    window.showErrorMessage(`Failed to resolve UI bundles: ${reason}`);
    throw error instanceof Error ? error : new Error(reason);
  }
}
