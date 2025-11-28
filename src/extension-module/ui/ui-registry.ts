import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { UIBundleId, UIRegistryEntry, UIRegistryFile } from "./ui-types";

const DEFAULT_REGISTRY: UIRegistryFile = {
  schema: 1,
  installed: {},
};

export class UIRegistry {
  private readonly registryPath: string;
  private current: UIRegistryFile;

  constructor(registryPath?: string) {
    this.registryPath =
      registryPath || join(homedir(), ".codeai-hub", "ui", "registry.json");
    this.current = JSON.parse(JSON.stringify(DEFAULT_REGISTRY));
  }

  /**
   * Loads the registry from disk.
   * If the file does not exist, it initializes with a default empty registry.
   */
  async load(): Promise<UIRegistryFile> {
    try {
      const content = await readFile(this.registryPath, "utf-8");
      this.current = JSON.parse(content);
      // Basic schema validation could be added here
      if (this.current.schema !== 1) {
        throw new Error(`Unsupported registry schema: ${this.current.schema}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // File doesn't exist, use default
        this.current = JSON.parse(JSON.stringify(DEFAULT_REGISTRY));
      } else {
        throw error;
      }
    }
    return this.current;
  }

  /**
   * Saves the current registry state to disk atomically.
   */
  async save(): Promise<void> {
    await mkdir(dirname(this.registryPath), { recursive: true });
    const tempPath = `${this.registryPath}.tmp`;
    await writeFile(tempPath, JSON.stringify(this.current, null, 2), "utf-8");
    // Atomic rename
    await rename(tempPath, this.registryPath);
  }

  /**
   * Returns the installation entry for a specific bundle, if it exists.
   */
  getBundle(bundleId: UIBundleId): UIRegistryEntry | undefined {
    return this.current.installed[bundleId];
  }

  /**
   * Returns a list of all installed bundles.
   */
  listBundles(): UIRegistryEntry[] {
    return Object.values(this.current.installed);
  }

  /**
   * Registers a new bundle installation and saves the registry.
   */
  async registerBundle(entry: UIRegistryEntry): Promise<void> {
    this.current.installed[entry.bundleId] = entry;
    await this.save();
  }

  /**
   * Unregisters a bundle and saves the registry.
   */
  async unregisterBundle(bundleId: UIBundleId): Promise<void> {
    if (this.current.installed[bundleId]) {
      delete this.current.installed[bundleId];
      await this.save();
    }
  }
}
