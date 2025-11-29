import type { UIBundleInstaller } from "./ui-installer";
import type { UIRegistry } from "./ui-registry";
import type { UIBundleId, UIManifest } from "./ui-types";

export type UpdateInfo = {
	readonly bundleId: UIBundleId;
	readonly currentVersion: string | null;
	readonly availableVersion: string;
};

export type ProgressCallback = (message: string) => void;

export class UIUpdateChecker {
	private readonly registry: UIRegistry;
	private readonly manifest: UIManifest;
	private readonly installer: UIBundleInstaller;

	constructor(
		registry: UIRegistry,
		manifest: UIManifest,
		installer: UIBundleInstaller,
	) {
		this.registry = registry;
		this.manifest = manifest;
		this.installer = installer;
	}

	/**
	 * Checks for available updates by comparing manifest with installed bundles.
	 */
	async checkForUpdates(): Promise<UpdateInfo[]> {
		await this.registry.load();
		const updates: UpdateInfo[] = [];

		for (const [bundleId, bundle] of Object.entries(this.manifest.bundles)) {
			const installed = this.registry.getBundle(bundleId as UIBundleId);

			if (!installed || installed.version !== bundle.version) {
				updates.push({
					bundleId: bundleId as UIBundleId,
					currentVersion: installed?.version ?? null,
					availableVersion: bundle.version,
				});
			}
		}

		return updates;
	}

	/**
	 * Applies all available updates.
	 */
	async applyUpdates(onProgress?: ProgressCallback): Promise<void> {
		onProgress?.("Checking for UI updates...");
		const updates = await this.checkForUpdates();

		if (updates.length === 0) {
			onProgress?.("All UI bundles are up to date");
			return;
		}

		onProgress?.(`Installing ${updates.length} UI bundle update(s)...`);
		await this.installer.installMissingBundles();
		onProgress?.("UI updates complete");
	}
}
