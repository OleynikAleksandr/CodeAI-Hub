import {
  PACKAGE_MAP,
  type PackageVersionResult,
} from "./provider-version-model";
import {
  readInstalledVersion,
  readLatestVersion,
} from "./provider-version-npm";

export class GeminiVersionReader {
  async read(): Promise<{
    cli: PackageVersionResult;
    core: PackageVersionResult;
  }> {
    const cliPackageName = PACKAGE_MAP.gemini.cli;
    const corePackageName = PACKAGE_MAP.gemini.core;

    const [cliInstalled, coreInstalled, cliLatest, coreLatest] =
      await Promise.all([
        readInstalledVersion(cliPackageName),
        readInstalledVersion(corePackageName),
        readLatestVersion(cliPackageName),
        readLatestVersion(corePackageName),
      ]);

    return {
      cli: {
        packageName: cliPackageName,
        currentVersion: cliInstalled.version,
        latestVersion: cliLatest.version,
        error: cliInstalled.error ?? cliLatest.error,
      },
      core: {
        packageName: corePackageName,
        currentVersion: coreInstalled.version,
        latestVersion: coreLatest.version,
        error: coreInstalled.error ?? coreLatest.error,
      },
    };
  }
}
