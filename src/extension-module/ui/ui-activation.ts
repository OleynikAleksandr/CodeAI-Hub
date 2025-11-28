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
  webClient: {
    path: string;
    source: "installed" | "embedded";
  };
  projectManager: {
    path: string;
    source: "installed" | "embedded";
  };
};

// Actually, the logic differs slightly per bundle.
// webview: installed -> path, embedded -> dirname(path)
// web-client: installed -> path/index.html, embedded -> path
// project-manager: installed -> path/index.html, embedded -> path

// Let's just extract the try-catch block and resolution.

async function tryResolveBundle(
  bundleId: "vscode-webview" | "web-client" | "project-manager",
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
  let webviewUIRoot: string;
  if (webviewResolved.source === "installed") {
    webviewUIRoot = webviewResolved.path;
  } else {
    // For embedded, we need the directory for some reason?
    // Original code: webviewUIRoot = path.dirname(resolved.path);
    // But resolved.path is embeddedWebviewPath which is .../react-chat.js
    webviewUIRoot = path.dirname(webviewResolved.path);
  }

  if (webviewResolved.source !== "embedded") {
    logger.log("extension:activate:ui-resolved:vscode-webview", {
      source: webviewResolved.source,
      path: webviewUIRoot,
    });
  }

  // 3. Resolve web-client bundle
  const embeddedWebClientPath = path.join(
    context.extensionUri.fsPath,
    "media",
    "web-client",
    "dist",
    "index.html"
  );

  const webClientResolved = await tryResolveBundle(
    "web-client",
    embeddedWebClientPath,
    logger
  );
  let webClientIndexPath: string;
  if (webClientResolved.source === "installed") {
    webClientIndexPath = path.join(webClientResolved.path, "index.html");
  } else {
    webClientIndexPath = webClientResolved.path;
  }

  if (webClientResolved.source !== "embedded") {
    logger.log("extension:activate:ui-resolved:web-client", {
      source: webClientResolved.source,
      path: webClientIndexPath,
    });
  }

  // 4. Resolve project-manager bundle
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
    webClient: { path: webClientIndexPath, source: webClientResolved.source },
    projectManager: {
      path: projectManagerIndexPath,
      source: pmResolved.source,
    },
  };
}
