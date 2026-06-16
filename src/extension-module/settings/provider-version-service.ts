import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { GeminiVersionReader } from "./gemini-version-reader";
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

const GEMINI_INSTALLER_PATHS = {
  macOS: "~/.npm-global/lib/node_modules/@google/gemini-cli/",
  linux: "~/.npm-global/lib/node_modules/@google/gemini-cli/",
  windows:
    "%USERPROFILE%\\AppData\\Roaming\\npm\\node_modules\\@google\\gemini-cli\\",
};
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
  private readonly geminiReader: GeminiVersionReader;

  constructor() {
    this.geminiReader = new GeminiVersionReader();
  }

  async loadSnapshot(): Promise<ProviderVersionsSnapshot> {
    const descriptors = resolveDescriptors();
    const geminiVersions = await this.geminiReader.read();

    const results = await Promise.all(
      descriptors.map(async ({ packageName, provider, target }) => {
        if (provider === "gemini" && target === "cli") {
          return geminiVersions.cli;
        }
        if (provider === "gemini" && target === "core") {
          return geminiVersions.core;
        }
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
    if (provider === "gemini") {
      return this.updateGeminiAll();
    }
    if (provider === "glmOpenCode") {
      throw new Error("OpenCode CLI updates are managed outside CodeAI Hub.");
    }
    const packageName = resolvePackageName(provider, target);
    await installGlobalPackageLatest(packageName);
    return this.loadSnapshot();
  }

  async updateGeminiAll(): Promise<ProviderVersionsSnapshot> {
    const modulePath = await this.resolveGeminiModulePath();
    if (!modulePath) {
      throw new Error("Gemini module not installed");
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GeminiInstaller } = require(
      path.join(modulePath, "dist", "index.js")
    );
    const installer = new GeminiInstaller(GEMINI_INSTALLER_PATHS);
    await installer.updateToLatest();
    return this.loadSnapshot();
  }

  private async resolveGeminiModulePath(): Promise<string | null> {
    const root = path.join(homedir(), ".codeai-hub", "providers", "gemini");
    try {
      const version = (
        await fs.readFile(path.join(root, "latest"), "utf8")
      ).trim();
      const modulePath = path.join(root, version);
      await fs.access(path.join(modulePath, "dist", "index.js"));
      return modulePath;
    } catch {
      return null;
    }
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
