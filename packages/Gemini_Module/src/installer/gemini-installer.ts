import { promises as fs } from "node:fs";
import https from "node:https";
import { homedir } from "node:os";
import path from "node:path";

import {
  isGeminiCliCompatibilityError,
  loadCliBridgeFromGlobal,
} from "../runtime/cli-bridge";
import { validateGeminiCliCoreDependencyGraph } from "../runtime/cli-bridge-module-loader";
import type { GeminiCliBridge } from "../runtime/cli-types";
import type {
  GeminiInstallerPaths,
  GeminiUpdateResult,
  ModuleReporter,
} from "../types";

import { runNpmCommand } from "./npm-runner";

const GEMINI_CLI_CORE_PACKAGE = "@google/gemini-cli-core";
const GEMINI_CLI_PACKAGE = "@google/gemini-cli";
const HTTP_ERROR_STATUS_THRESHOLD = 400;
const CLI_EXECUTABLE_UNIX = "gemini";
const CLI_EXECUTABLE_WINDOWS = "gemini.cmd";
const HOME_DIRECTORY_PATTERN = /^~(?=$|\/|\\)/u;
const USERPROFILE_PATTERN = /%USERPROFILE%/giu;

export interface GeminiInstallerOptions {
  readonly reporter?: ModuleReporter;
}

export class GeminiInstaller {
  private readonly reporter?: ModuleReporter;
  private readonly installerDirectory: string;
  private readonly npmPrefix: string;
  private readonly cliExecutablePath: string;
  private readonly npmExecutable: string;
  private currentCliVersion: string | null = null;
  private currentCoreVersion: string | null = null;

  private bridge: GeminiCliBridge | null = null;

  constructor(
    _paths: GeminiInstallerPaths,
    options: GeminiInstallerOptions = {}
  ) {
    this.reporter = options.reporter;
    this.installerDirectory = this.normalizeInstallerPath(_paths);
    this.npmPrefix = this.computePrefix(this.installerDirectory);
    this.cliExecutablePath = this.resolveCliExecutablePath();
    this.npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  }

  async ensureCliBridge(): Promise<GeminiCliBridge> {
    if (this.bridge) {
      return this.bridge;
    }

    await this.ensureCliPrefixDirectories();
    await this.ensurePackageInstalled(GEMINI_CLI_CORE_PACKAGE, "core");
    await this.ensurePackageInstalled(GEMINI_CLI_PACKAGE, "cli");
    this.emitProgress("Gemini CLI components ready.", { phase: "provider" });
    await this.verifyCliExecutable();
    const expectedVersions = {
      expectedCliVersion: this.currentCliVersion ?? undefined,
      expectedCoreVersion: this.currentCoreVersion ?? undefined,
    };

    try {
      this.validateInstalledRuntimeIntegrity();
      this.bridge = await this.loadBridgeWithDiagnostics(expectedVersions);
      return this.bridge;
    } catch (error) {
      if (!isGeminiCliCompatibilityError(error)) {
        throw error;
      }
      await this.reinstallPackagesForCompatibilityRecovery();
      this.bridge = await this.loadBridgeWithDiagnostics({
        expectedCliVersion: this.currentCliVersion ?? undefined,
        expectedCoreVersion: this.currentCoreVersion ?? undefined,
      });
      return this.bridge;
    }
  }

  async updateToLatest(): Promise<GeminiUpdateResult> {
    const [latestCliVersion, latestCoreVersion] = await Promise.all([
      this.getLatestVersionFromRegistry(GEMINI_CLI_PACKAGE),
      this.getLatestVersionFromRegistry(GEMINI_CLI_CORE_PACKAGE),
    ]);

    if (!(latestCliVersion && latestCoreVersion)) {
      throw new Error(
        "Failed to fetch latest Gemini CLI versions from npm registry"
      );
    }

    await this.ensureCliPrefixDirectories();
    await this.installPackage(
      GEMINI_CLI_CORE_PACKAGE,
      latestCoreVersion,
      "core"
    );
    await this.installPackage(GEMINI_CLI_PACKAGE, latestCliVersion, "cli");
    this.bridge = null;
    await this.loadBridgeWithDiagnostics({
      expectedCliVersion: latestCliVersion,
      expectedCoreVersion: latestCoreVersion,
    });

    return {
      cliVersion: latestCliVersion,
      coreVersion: latestCoreVersion,
    };
  }

  private emitProgress(
    label: string,
    options?: {
      readonly phase?: "install" | "provider";
      readonly detail?: string;
      readonly firstRun?: boolean;
    }
  ): void {
    this.reporter?.progress?.({
      label,
      scope: "geminiCli",
      phase: options?.phase ?? "install",
      detail: options?.detail,
      firstRun: options?.firstRun,
    });
  }

  private reportStatus(
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.reporter?.info?.(message, metadata);
  }

  private async ensurePackageInstalled(
    packageName: string,
    kind: "cli" | "core"
  ): Promise<void> {
    const installed = await this.checkPackageInstalled(packageName, kind);
    if (installed) {
      this.emitProgress(`Checking ${this.describePackage(kind)} components...`);
      await this.updatePackageIfNeeded(packageName, kind);
      return;
    }

    this.emitProgress(
      `Downloading ${this.describePackage(kind)} components for the first run...`,
      {
        detail: "This may take a little longer during the first setup.",
        firstRun: true,
      }
    );
    await this.installPackage(packageName, "latest", kind);
  }

  private async ensureCliPrefixDirectories(): Promise<void> {
    const libDir = path.join(this.npmPrefix, "lib", "node_modules");
    await fs.mkdir(libDir, { recursive: true });
  }

  private async verifyCliExecutable(): Promise<void> {
    await fs.access(this.cliExecutablePath);
  }

  private buildNpmEnv(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      NPM_CONFIG_PREFIX: this.npmPrefix,
      npm_config_prefix: this.npmPrefix,
    };
  }

  private async checkPackageInstalled(
    packageName: string,
    kind: "cli" | "core"
  ): Promise<boolean> {
    try {
      const { stdout } = await this.runNpm([
        "list",
        "-g",
        packageName,
        "--json",
      ]);
      const parsed = JSON.parse(stdout || "{}") as {
        readonly dependencies?: Record<string, { readonly version?: string }>;
      };
      const version = parsed.dependencies?.[packageName]?.version ?? null;
      if (version) {
        if (kind === "cli") {
          this.currentCliVersion = version;
        } else {
          this.currentCoreVersion = version;
        }
        this.reportStatus(`Detected ${this.describePackage(kind)} v${version}`);
        return true;
      }
      return false;
    } catch (error) {
      this.reporter?.warn?.(
        `Failed to detect existing ${this.describePackage(kind)} installation`,
        {
          error: error instanceof Error ? error : new Error(String(error)),
        }
      );
      return false;
    }
  }

  private async installPackage(
    packageName: string,
    version: string,
    kind: "cli" | "core"
  ): Promise<void> {
    const specifier =
      version === "latest"
        ? `${packageName}@latest`
        : `${packageName}@${version}`;
    const versionLabel = version === "latest" ? "latest" : `v${version}`;
    this.reportStatus(
      `Installing ${this.describePackage(kind)} ${versionLabel}`
    );
    await this.removeStaleInstallDirectories(packageName);
    await this.runNpm(["install", "-g", specifier, "--force"]);
    await this.checkPackageInstalled(packageName, kind);
  }

  private async updatePackageIfNeeded(
    packageName: string,
    kind: "cli" | "core"
  ): Promise<void> {
    const currentVersion =
      kind === "cli" ? this.currentCliVersion : this.currentCoreVersion;
    const latestVersion = await this.getLatestVersionFromRegistry(packageName);
    if (
      !(latestVersion && currentVersion) ||
      currentVersion === latestVersion
    ) {
      return;
    }
    this.reportStatus(
      `Updating ${this.describePackage(kind)} to v${latestVersion}`
    );
    this.emitProgress(`Updating ${this.describePackage(kind)}...`, {
      detail: "Fetching the latest improvements.",
    });
    await this.installPackage(packageName, latestVersion, kind);
  }

  private async reinstallPackagesForCompatibilityRecovery(): Promise<void> {
    this.reportStatus(
      "Gemini runtime compatibility check failed. Reinstalling CLI components."
    );
    this.emitProgress("Repairing Gemini CLI installation...", {
      detail:
        "Reinstalling Gemini CLI/Core after a failed runtime sanity check.",
    });
    await this.installPackage(
      GEMINI_CLI_CORE_PACKAGE,
      this.currentCoreVersion ?? "latest",
      "core"
    );
    await this.installPackage(
      GEMINI_CLI_PACKAGE,
      this.currentCliVersion ?? "latest",
      "cli"
    );
  }

  private validateInstalledRuntimeIntegrity(): void {
    const cliCoreRoot = path.join(
      this.npmPrefix,
      "lib",
      "node_modules",
      "@google",
      "gemini-cli-core"
    );
    try {
      validateGeminiCliCoreDependencyGraph(
        cliCoreRoot,
        "Installed Gemini CLI Core"
      );
    } catch (error) {
      const baseMessage =
        error instanceof Error ? error.message : String(error);
      const wrapped = new Error(
        `Installed Gemini CLI Core runtime dependency check failed for fast-uri: ${baseMessage}`
      ) as Error & { code?: string };
      wrapped.name = "GeminiCliCompatibilityError";
      wrapped.code = "GEMINI_CLI_COMPATIBILITY_ERROR";
      throw wrapped;
    }
  }

  private getLatestVersionFromRegistry(
    packageName: string
  ): Promise<string | null> {
    const encodedName = packageName.replace("/", "%2f");
    const url = `https://registry.npmjs.org/${encodedName}/latest`;

    return new Promise((resolve) => {
      https
        .get(url, (response) => {
          if (
            response.statusCode &&
            response.statusCode >= HTTP_ERROR_STATUS_THRESHOLD
          ) {
            resolve(null);
            response.resume();
            return;
          }
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            try {
              const parsed = JSON.parse(body) as { readonly version?: string };
              resolve(parsed.version ?? null);
            } catch {
              resolve(null);
            }
          });
        })
        .on("error", () => {
          resolve(null);
        });
    });
  }

  private normalizeInstallerPath(paths: GeminiInstallerPaths): string {
    const rawPath = this.selectPlatformPath(paths);
    const expanded = rawPath
      .replace(HOME_DIRECTORY_PATTERN, homedir())
      .replace(USERPROFILE_PATTERN, process.env.USERPROFILE ?? homedir());
    return path.resolve(expanded);
  }

  private selectPlatformPath(paths: GeminiInstallerPaths): string {
    if (process.platform === "darwin") {
      return paths.macOS;
    }
    if (process.platform === "win32") {
      return paths.windows;
    }
    return paths.linux;
  }

  private computePrefix(moduleDirectory: string): string {
    const separator = path.sep;
    const marker = `${separator}node_modules${separator}`;
    const markerIndex = moduleDirectory.indexOf(marker);
    if (markerIndex === -1) {
      return path.resolve(moduleDirectory, "..", "..");
    }
    const beforeNodeModules = moduleDirectory.slice(0, markerIndex);
    const libSuffix = `${separator}lib`;
    if (beforeNodeModules.endsWith(libSuffix)) {
      return beforeNodeModules.slice(
        0,
        beforeNodeModules.length - libSuffix.length
      );
    }
    return beforeNodeModules;
  }

  private resolveCliExecutablePath(): string {
    if (process.platform === "win32") {
      return path.join(this.npmPrefix, CLI_EXECUTABLE_WINDOWS);
    }
    return path.join(this.npmPrefix, "bin", CLI_EXECUTABLE_UNIX);
  }

  private describePackage(kind: "cli" | "core"): string {
    return kind === "cli" ? "Gemini CLI" : "Gemini CLI Core";
  }

  private async removeStaleInstallDirectories(
    packageName: string
  ): Promise<void> {
    const packageDirectory = path.join(
      this.npmPrefix,
      "lib",
      "node_modules",
      ...packageName.split("/")
    );
    const parentDirectory = path.dirname(packageDirectory);
    const temporaryPrefix = `.${path.basename(packageDirectory)}-`;

    const entries = await fs
      .readdir(parentDirectory, {
        withFileTypes: true,
      })
      .catch(() => []);
    for (const entry of entries) {
      if (!(entry.isDirectory() && entry.name.startsWith(temporaryPrefix))) {
        continue;
      }
      const stalePath = path.join(parentDirectory, entry.name);
      await fs.rm(stalePath, { recursive: true, force: true });
      this.reportStatus("Removed stale Gemini npm install directory", {
        packageName,
        stalePath,
      });
    }
  }

  private runNpm(
    args: readonly string[]
  ): Promise<{ readonly stdout: string; readonly stderr: string }> {
    return runNpmCommand(args, {
      npmExecutable: this.npmExecutable,
      env: this.buildNpmEnv(),
    });
  }

  private async loadBridgeWithDiagnostics(options: {
    readonly expectedCliVersion?: string;
    readonly expectedCoreVersion?: string;
  }): Promise<GeminiCliBridge> {
    try {
      return await loadCliBridgeFromGlobal({
        expectedCliVersion: options.expectedCliVersion,
        expectedCoreVersion: options.expectedCoreVersion,
        reporter: this.reporter,
      });
    } catch (error) {
      if (isGeminiCliCompatibilityError(error)) {
        this.reporter?.error?.(
          "Gemini CLI runtime module compatibility check failed",
          error,
          {
            reason: "module_compatibility",
            npmPrefix: this.npmPrefix,
            expectedCliVersion: options.expectedCliVersion,
            expectedCoreVersion: options.expectedCoreVersion,
          }
        );
      }
      throw error;
    }
  }
}
