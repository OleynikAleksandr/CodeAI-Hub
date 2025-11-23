// biome-ignore lint/performance/noBarrelFile: entrypoint
export { readUIManifest } from "./ui-manifest-reader";
export { UIRegistry } from "./ui-registry";

export type {
  UIBundle,
  UIBundleId,
  UIManifest,
  UIRegistryEntry,
  UIRegistryFile,
} from "./ui-types";
