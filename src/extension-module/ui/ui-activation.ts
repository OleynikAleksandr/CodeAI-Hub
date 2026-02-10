import path from "node:path";
import type { ExtensionContext } from "vscode";
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
  projectManager: {
    path: string;
    source: "installed" | "embedded";
  };
};

async function tryResolveBundle(
  bundleId: "vscode-webview" | "project-manager",
  embeddedPath: string,
  logger: ExtensionLogger
): Promise<{ path: string; source: "installed" | "embedded" }> {
  try {
    return await resolveUIBundlePath(bundleId, embeddedPath);
  } catch (error) {
    logger.log(`extension:activate:ui-resolved:${bundleId}:failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return { path: embeddedPath, source: "embedded" };
  }
}

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
  }

  // 2. Resolve vscode-webview bundle
  const embeddedWebviewPath = path.join(
    context.extensionUri.fsPath,
    "media",
    "react-chat.js"
  );

  const webviewResolved = await tryResolveBundle(
    "vscode-webview",
    embeddedWebviewPath,
    logger
  );
  const webviewUIRoot =
    webviewResolved.source === "installed"
      ? webviewResolved.path
      : path.dirname(webviewResolved.path);

  if (webviewResolved.source !== "embedded") {
    logger.log("extension:activate:ui-resolved:vscode-webview", {
      source: webviewResolved.source,
      path: webviewUIRoot,
    });
  }

  // 3. Resolve project-manager bundle
  const embeddedProjectManagerPath = path.join(
    context.extensionUri.fsPath,
    "packages",
    "ui",
    "project-manager",
    "index.html"
  );

  const pmResolved = await tryResolveBundle(
    "project-manager",
    embeddedProjectManagerPath,
    logger
  );
  let projectManagerIndexPath: string;
  if (pmResolved.source === "installed") {
    projectManagerIndexPath = path.join(pmResolved.path, "index.html");
  } else {
    projectManagerIndexPath = pmResolved.path;
  }

  if (pmResolved.source !== "embedded") {
    logger.log("extension:activate:ui-resolved:project-manager", {
      source: pmResolved.source,
      path: projectManagerIndexPath,
    });
  }

  return {
    webview: { path: webviewUIRoot, source: webviewResolved.source },
    projectManager: {
      path: projectManagerIndexPath,
      source: pmResolved.source,
    },
  };
}
