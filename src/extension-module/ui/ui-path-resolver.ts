import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { UIRegistry } from "./ui-registry";
import type { UIBundleId } from "./ui-types";

export type UIPathResolveResult = {
  readonly path: string;
  readonly source: "installed" | "embedded";
};

/**
 * Resolves the path to a UI bundle.
 * Prefers installed bundle from packages layout, falls back to embedded UI for development.
 */
export async function resolveUIBundlePath(
  bundleId: UIBundleId,
  embeddedFallbackPath?: string
): Promise<UIPathResolveResult> {
  // Try packages layout first
  const packagesPath = join(
    homedir(),
    ".codeai-hub",
    "packages",
    "ui",
    bundleId,
    "current"
  );

  try {
    await access(packagesPath);
    return { path: packagesPath, source: "installed" };
  } catch {
    // Installed bundle not found
  }

  // Try legacy layout via registry (during migration)
  try {
    const registry = new UIRegistry();
    await registry.load();
    const entry = registry.getBundle(bundleId);
    if (entry?.path) {
      await access(entry.path);
      return { path: entry.path, source: "installed" };
    }
  } catch {
    // ignore registry/legacy failures
  }

  // Fallback to embedded UI (for development)
  if (embeddedFallbackPath) {
    try {
      await access(embeddedFallbackPath);
      return { path: embeddedFallbackPath, source: "embedded" };
    } catch {
      throw new Error(
        `UI bundle '${bundleId}' not found. Neither installed bundle nor embedded fallback exists.`
      );
    }
  }

  throw new Error(
    `UI bundle '${bundleId}' not installed and no fallback provided.`
  );
}
