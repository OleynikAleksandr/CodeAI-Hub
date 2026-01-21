/**
 * Represents the schema of assets/ui/manifest.json
 */
export type UIManifest = {
  schema: number;
  baseUrl: string;
  bundles: {
    [key in UIBundleId]?: UIBundle;
  };
};

/**
 * Unique identifiers for supported UI bundles.
 */
export type UIBundleId = "vscode-webview" | "project-manager";

/**
 * Describes a single UI bundle artifact.
 */
export type UIBundle = {
  version: string;
  package: string;
  size: number;
  sha1: string;
};

/**
 * Represents an installed UI bundle in the local registry.
 */
export type UIRegistryEntry = {
  bundleId: UIBundleId;
  version: string;
  installedAt: number; // Timestamp
  path: string; // Absolute path to the unpacked bundle
};

/**
 * Represents the structure of ~/.codeai-hub/ui/registry.json
 */
export type UIRegistryFile = {
  schema: number;
  installed: {
    [key in UIBundleId]?: UIRegistryEntry;
  };
};
