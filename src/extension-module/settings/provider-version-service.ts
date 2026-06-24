import {
  buildSnapshot,
  type PackageVersionResult,
  type ProviderId,
  type ProviderVersionsSnapshot,
  resolveDescriptors,
  resolvePackageName,
  type VersionTarget,
} from "./provider-version-model";
import {
  installGlobalPackageLatest,
  readCommandVersion,
  readInstalledVersion,
  readLatestVersion,
} from "./provider-version-npm";

const OPENCODE_VERSION_COMMAND =
  process.platform === "win32"
    ? "opencode.cmd --version"
    : "opencode --version";
const OPENCODE_LATEST_PACKAGE_NAME = "@opencode-ai/sdk";

const combineErrors = (
  ...errors: readonly (string | undefined)[]
): string | undefined => {
  const messages = errors.filter((error): error is string => Boolean(error));
  return messages.length > 0 ? messages.join("; ") : undefined;
};

export class ProviderVersionService {
  async loadSnapshot(): Promise<ProviderVersionsSnapshot> {
    const descriptors = resolveDescriptors();

    const results = await Promise.all(
      descriptors.map(async ({ packageName, provider, target }) => {
        if (provider === "glmOpenCode" && target === "cli") {
          return readOpenCodeVersion();
        }
        const installed = await readInstalledVersion(packageName);
        const latest = await readLatestVersion(packageName);
        return {
          packageName,
          currentVersion: installed.version,
          latestVersion: latest.version,
          error: installed.error ?? latest.error,
        } satisfies PackageVersionResult;
      })
    );
    return buildSnapshot(results);
  }

  async updateTarget(
    provider: ProviderId,
    target: VersionTarget
  ): Promise<ProviderVersionsSnapshot> {
    if (provider === "glmOpenCode") {
      throw new Error("OpenCode CLI updates are managed outside CodeAI Hub.");
    }
    const packageName = resolvePackageName(provider, target);
    await installGlobalPackageLatest(packageName);
    return this.loadSnapshot();
  }
}

const readOpenCodeVersion = async (): Promise<PackageVersionResult> => {
  const [installed, latest] = await Promise.all([
    readCommandVersion(OPENCODE_VERSION_COMMAND),
    readLatestVersion(OPENCODE_LATEST_PACKAGE_NAME),
  ]);

  return {
    packageName: "opencode",
    currentVersion: installed.version,
    latestVersion: latest.version,
    error: combineErrors(installed.error, latest.error),
  };
};
