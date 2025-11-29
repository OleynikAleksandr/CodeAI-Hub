import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
	PACKAGE_MAP,
	type PackageVersionResult,
	readLatestVersion,
} from "./provider-version-service";

export class GeminiVersionReader {
	private readonly extensionPath: string;

	constructor(extensionPath: string) {
		this.extensionPath = extensionPath;
	}

	async read(): Promise<{
		cli: PackageVersionResult;
		core: PackageVersionResult;
	}> {
		const cliPackageName = PACKAGE_MAP.gemini.cli;
		const corePackageName = PACKAGE_MAP.gemini.core;

		const [cliLatest, coreLatest] = await Promise.all([
			readLatestVersion(cliPackageName),
			readLatestVersion(corePackageName),
		]);

		try {
			const manifestPath = path.join(
				this.extensionPath,
				"assets",
				"providers",
				"gemini",
				"manifest.json",
			);
			const manifestContent = await fs.readFile(manifestPath, "utf8");
			const manifest = JSON.parse(manifestContent) as {
				module: { version: string };
			};
			const moduleVersion = manifest.module.version;

			const vendorPath = path.join(
				homedir(),
				".codeai-hub",
				"providers",
				"gemini",
				moduleVersion,
				"dist",
				"vendor",
				"node_modules",
				"@google",
			);

			const geminiCliPackageJsonPath = path.join(
				vendorPath,
				"gemini-cli",
				"package.json",
			);
			const geminiCorePackageJsonPath = path.join(
				vendorPath,
				"gemini-cli-core",
				"package.json",
			);

			const [cliPackageJsonContent, corePackageJsonContent] = await Promise.all(
				[
					fs.readFile(geminiCliPackageJsonPath, "utf8"),
					fs.readFile(geminiCorePackageJsonPath, "utf8"),
				],
			);

			const cliPackageJson = JSON.parse(cliPackageJsonContent) as {
				version: string;
			};
			const corePackageJson = JSON.parse(corePackageJsonContent) as {
				version: string;
			};

			return {
				cli: {
					packageName: cliPackageName,
					currentVersion: cliPackageJson.version,
					latestVersion: cliLatest.version,
					error: cliLatest.error,
				},
				core: {
					packageName: corePackageName,
					currentVersion: corePackageJson.version,
					latestVersion: coreLatest.version,
					error: coreLatest.error,
				},
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			return {
				cli: {
					packageName: cliPackageName,
					currentVersion: null,
					latestVersion: cliLatest.version,
					error: errorMessage,
				},
				core: {
					packageName: corePackageName,
					currentVersion: null,
					latestVersion: coreLatest.version,
					error: errorMessage,
				},
			};
		}
	}
}
