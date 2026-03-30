import { homedir } from "node:os";
import path from "node:path";

import {
  isGeminiCliCompatibilityError,
  loadCliBridgeFromGlobal,
} from "../runtime/cli-bridge";
import type { GeminiCliBridge } from "../runtime/cli-types";
import type {
  GeminiInstallerPaths,
  GeminiUpdateResult,
  ModuleReporter,
} from "../types";
import { GeminiPackageManager } from "./gemini-package-manager";

const CLI_EXECUTABLE_UNIX = "gemini";
const CLI_EXECUTABLE_WINDOWS = "gemini.cmd";
const HOME_DIRECTORY_PATTERN = /^~(?=$|\/|\\)/u;
const USERPROFILE_PATTERN = /%USERPROFILE%/giu;

export interface GeminiInstallerOptions {
  readonly reporter?: ModuleReporter;
}

export class GeminiInstaller {
  private readonly bridgePackageManager: GeminiPackageManager;
  private readonly cliExecutablePath: string;
  private readonly installerDirectory: string;
  private readonly npmPrefix: string;
  private readonly reporter?: ModuleReporter;
  private readonly npmExecutable: string;

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
    this.bridgePackageManager = new GeminiPackageManager({
      cliExecutablePath: this.cliExecutablePath,
      npmExecutable: this.npmExecutable,
      npmPrefix: this.npmPrefix,
      reporter: this.reporter,
    });
  }

  async ensureCliBridge(): Promise<GeminiCliBridge> {
    if (this.bridge) {
      return this.bridge;
    }

    await this.bridgePackageManager.prepareBridgeEnvironment();
    const expectedVersions = this.bridgePackageManager.getCurrentVersions();

    try {
      this.bridgePackageManager.validateInstalledRuntimeIntegrity();
      this.bridge = await this.loadBridgeWithDiagnostics({
        expectedCliVersion: expectedVersions.cliVersion ?? undefined,
        expectedCoreVersion: expectedVersions.coreVersion ?? undefined,
      });
      return this.bridge;
    } catch (error) {
      if (!isGeminiCliCompatibilityError(error)) {
        throw error;
      }
      await this.bridgePackageManager.recoverCompatibility();
      this.bridge = await this.loadBridgeWithDiagnostics({
        expectedCliVersion: expectedVersions.cliVersion ?? undefined,
        expectedCoreVersion: expectedVersions.coreVersion ?? undefined,
      });
      return this.bridge;
    }
  }

  async updateToLatest(): Promise<GeminiUpdateResult> {
    const result = await this.bridgePackageManager.updatePackagesToLatest();
    this.bridge = null;
    await this.loadBridgeWithDiagnostics({
      expectedCliVersion: result.cliVersion,
      expectedCoreVersion: result.coreVersion,
    });
    return result;
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
