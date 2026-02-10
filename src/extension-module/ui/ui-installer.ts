import { access, mkdir, rm, symlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { verifySha1 } from "../cef/runtime-files";
import { extractArchiveWithTar } from "../cef/tar-utils";
import type { UIRegistry } from "./ui-registry";
import type { UIBundle, UIBundleId, UIManifest } from "./ui-types";

export class UIBundleInstaller {
  private readonly registry: UIRegistry;
  private readonly manifest: UIManifest;

  constructor(registry: UIRegistry, manifest: UIManifest) {
    this.registry = registry;
    this.manifest = manifest;
  }

  /**
   * Main entry point to ensure all bundles in the manifest are installed.
   */
  async installMissingBundles(): Promise<void> {
    await this.registry.load();

    for (const [bundleId, bundle] of Object.entries(this.manifest.bundles)) {
      const existing = this.registry.getBundle(bundleId as UIBundleId);

      // Skip if already installed with the correct version and layouts exist
      if (
        existing &&
        existing.version === bundle.version &&
        (await this.hasRequiredLayouts(bundleId as UIBundleId))
      ) {
        continue;
      }

      // Find and validate archive
      const archivePath = await this.findArchive(
        bundle,
        bundleId as UIBundleId
      );
      if (!archivePath) {
        throw new Error(`Archive not found for ${bundleId}: ${bundle.package}`);
      }

      const isValid = await this.validateArchive(archivePath, bundle.sha1);
      if (!isValid) {
        throw new Error(`Archive validation failed for ${bundleId}`);
      }

      // Install the bundle
      await this.installBundle(bundle, archivePath, bundleId as UIBundleId);
    }
  }

  /**
   * Resolves the path to the bundle archive.
   * Checks `~/.codeai-hub/releases/`.
   */
  private async findArchive(
    bundle: UIBundle,
    bundleId: UIBundleId
  ): Promise<string | undefined> {
    const releasesDir = join(homedir(), ".codeai-hub", "releases");
    const candidates = [
      bundle.package,
      `${bundleId}-${bundle.version}.tar.bz2`,
    ];

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }
      const archivePath = join(releasesDir, candidate);
      try {
        await access(archivePath);
        return archivePath;
      } catch {
        // Try next candidate
      }
    }

    return;
  }

  /**
   * Validates the SHA-1 of the archive.
   */
  private validateArchive(
    path: string,
    expectedSha1: string
  ): Promise<boolean> {
    if (!expectedSha1 || expectedSha1.trim().length === 0) {
      return Promise.resolve(true);
    }
    return verifySha1(path, expectedSha1);
  }

  private async hasRequiredLayouts(bundleId: UIBundleId): Promise<boolean> {
    const packagesCurrent = join(
      homedir(),
      ".codeai-hub",
      "packages",
      "ui",
      bundleId,
      "current"
    );

    try {
      await access(packagesCurrent);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Installs a specific bundle from an archive.
   */
  private async installBundle(
    bundle: UIBundle,
    archivePath: string,
    bundleId: UIBundleId
  ): Promise<void> {
    const packagesBaseDir = join(homedir(), ".codeai-hub", "packages", "ui");
    const packagesInstallDir = join(packagesBaseDir, bundleId, bundle.version);

    // Create installation directory
    await mkdir(packagesInstallDir, { recursive: true });

    // Extract to canonical packages layout
    await extractArchiveWithTar({
      archivePath,
      destination: packagesInstallDir,
      label: `UI bundle ${bundleId}`,
    });

    // Create 'current' symlink in packages layout
    const currentLink = join(packagesBaseDir, bundleId, "current");
    try {
      await rm(currentLink, { force: true });
    } catch {
      // Ignore if symlink doesn't exist
    }
    await symlink(packagesInstallDir, currentLink);

    // Register in registry
    await this.registry.registerBundle({
      bundleId,
      version: bundle.version,
      installedAt: Date.now(),
      path: packagesInstallDir,
    });
  }
}
