/**
 * Represents the schema of assets/ui/manifest.json
 */
export interface UIManifest {
  baseUrl: string;
  bundles: {
    [key in UIBundleId]?: UIBundle;
  };
  schema: number;
}

/**
 * Unique identifiers for supported UI bundles.
 */
export type UIBundleId = "vscode-webview" | "project-manager";

/**
 * Describes a single UI bundle artifact.
 */
export interface UIBundle {
  package: string;
  sha1: string;
  size: number;
  version: string;
}

/**
 * Represents an installed UI bundle in the local registry.
 */
export interface UIRegistryEntry {
  bundleId: UIBundleId;
  installedAt: number; // Timestamp
  path: string; // Absolute path to the unpacked bundle
  version: string;
}

/**
 * Represents the structure of ~/.codeai-hub/ui/registry.json
 */
export interface UIRegistryFile {
  installed: {
    [key in UIBundleId]?: UIRegistryEntry;
  };
  schema: number;
}
