import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
    PACKAGE_MAP,
    type PackageVersionResult,
    readLatestVersion,
} from "./provider-version-service";

export class GeminiVersionReader {
    constructor(private readonly extensionPath: string) { }

    async read(): Promise<PackageVersionResult> {
        const packageName = PACKAGE_MAP.gemini.core;
        const latest = await readLatestVersion(packageName);

        try {
            const manifestPath = path.join(
                this.extensionPath,
                "assets",
                "providers",
                "gemini",
                "manifest.json"
            );
            const manifestContent = await fs.readFile(manifestPath, "utf8");
            const manifest = JSON.parse(manifestContent) as {
                module: { version: string };
            };
            const moduleVersion = manifest.module.version;

            const geminiCorePackageJsonPath = path.join(
                homedir(),
                ".codeai-hub",
                "providers",
                "gemini",
                moduleVersion,
                "dist",
                "vendor",
                "node_modules",
                "@google",
                "gemini-cli-core",
                "package.json"
            );

            const packageJsonContent = await fs.readFile(
                geminiCorePackageJsonPath,
                "utf8"
            );
            const packageJson = JSON.parse(packageJsonContent) as { version: string };

            return {
                packageName,
                currentVersion: packageJson.version,
                latestVersion: latest.version,
                error: latest.error,
            };
        } catch (error) {
            return {
                packageName,
                currentVersion: null,
                latestVersion: latest.version,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
