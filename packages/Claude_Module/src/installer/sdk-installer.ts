import { access, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ClaudeInstallerPaths, ModuleReporter } from "../types";
import { runNpmCommand } from "./npm-runner";

const PACKAGE_NAME = "@anthropic-ai/claude-agent-sdk";
const HOME_DIRECTORY_PATTERN = /^~(?=$|\/|\\)/u;
const USERPROFILE_PATTERN = /%USERPROFILE%/giu;
const SDK_ENTRY_FILENAME = "sdk.mjs";
const CLI_EXECUTABLE_UNIX = "claude";
const CLI_EXECUTABLE_WINDOWS = "claude.cmd";

export type InstallerEvent =
  | { readonly type: "status"; readonly message: string }
  | { readonly type: "error"; readonly message: string };

export class SDKInstaller {
  private readonly moduleDirectory: string;
  private readonly moduleEntryPath: string;
  private readonly cliExecutablePath: string;
  private readonly npmPrefix: string;
  private readonly npmExecutable: string;
  private currentVersion: string | null = null;
  private readonly reporter?: (event: InstallerEvent) => void;
  private readonly logger?: ModuleReporter;

  private emitProgress(
    label: string,
    options?: {
      readonly phase?: "install" | "provider";
      readonly firstRun?: boolean;
      readonly detail?: string;
    }
  ): void {
    this.logger?.progress?.({
      phase: options?.phase ?? "install",
      label,
      scope: "claudeCodeCli",
      firstRun: options?.firstRun,
      detail: options?.detail,
    });
  }

  constructor(
    paths: ClaudeInstallerPaths,
    options?: {
      readonly reporter?: (event: InstallerEvent) => void;
      readonly npmExecutable?: string;
      readonly logger?: ModuleReporter;
    }
  ) {
    this.moduleDirectory = this.normalizeInstallerPath(paths);
    this.moduleEntryPath = path.join(this.moduleDirectory, SDK_ENTRY_FILENAME);
    this.npmPrefix = this.computePrefix(this.moduleDirectory);
    this.cliExecutablePath = this.resolveExecutablePath();
    this.reporter = options?.reporter;
    this.logger = options?.logger;
    this.npmExecutable =
      options?.npmExecutable ??
      (process.platform === "win32" ? "npm.cmd" : "npm");
  }

  getCurrentVersion(): string | null {
    return this.currentVersion;
  }

  getModulePath(): string {
    return this.moduleEntryPath;
  }

  getExecutablePath(): string {
    return this.cliExecutablePath;
  }

  loadModule<TModule = unknown>(): Promise<TModule> {
    const moduleUrl = pathToFileURL(this.moduleEntryPath).href;
    // ponytail: keep native import; TS commonjs output turns direct
    // import(file://) into require(file://).
    const dynamicImport = new Function("url", "return import(url);") as (
      url: string
    ) => Promise<TModule>;
    return dynamicImport(moduleUrl);
  }

  async ensureInstalled(): Promise<void> {
    await this.ensurePrefixDirectories();
    const installed = await this.checkGlobalInstallation();
    if (installed) {
      this.emitProgress("Claude components already installed.");
    } else {
      this.emitProgress("Downloading Claude components for the first run...", {
        firstRun: true,
        detail: "This may take a little longer the very first time.",
      });
      await this.installGlobalSDK();
    }
    this.emitProgress("Claude components ready.", { phase: "provider" });
    await this.verifyModulePath();
  }

  private normalizeInstallerPath(paths: ClaudeInstallerPaths): string {
    const rawPath = this.selectPlatformPath(paths);
    const expanded = rawPath
      .replace(HOME_DIRECTORY_PATTERN, homedir())
      .replace(USERPROFILE_PATTERN, process.env.USERPROFILE ?? homedir());
    return path.resolve(expanded);
  }

  private selectPlatformPath(paths: ClaudeInstallerPaths): string {
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

  private resolveExecutablePath(): string {
    if (process.platform === "win32") {
      return path.join(this.npmPrefix, CLI_EXECUTABLE_WINDOWS);
    }
    return path.join(this.npmPrefix, "bin", CLI_EXECUTABLE_UNIX);
  }

  private async ensurePrefixDirectories(): Promise<void> {
    const libDir = path.join(this.npmPrefix, "lib", "node_modules");
    await mkdir(libDir, { recursive: true });
  }

  private async verifyModulePath(): Promise<void> {
    await access(this.moduleEntryPath);
    await access(this.cliExecutablePath);
  }

  private async checkGlobalInstallation(): Promise<boolean> {
    try {
      const { stdout } = await this.runNpm([
        "list",
        "-g",
        `${PACKAGE_NAME}`,
        "--json",
      ]);
      const parsed = JSON.parse(stdout ?? "{}") as {
        readonly dependencies?: Record<string, { readonly version?: string }>;
      };
      const version = parsed.dependencies?.[PACKAGE_NAME]?.version;
      if (version) {
        this.currentVersion = version;
        this.reportStatus(`Detected installed Claude SDK v${version}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger?.warn?.("Failed to detect existing Claude SDK installation");
      this.logger?.error?.("npm list error", error);
      return false;
    }
  }

  private async installGlobalSDK(): Promise<void> {
    this.reportStatus("Installing Claude Agent SDK globally");
    await this.runNpm(["install", "-g", `${PACKAGE_NAME}@latest`, "--force"]);
    await this.checkGlobalInstallation();
  }

  private runNpm(
    args: readonly string[]
  ): Promise<{ readonly stdout: string; readonly stderr: string }> {
    const env = {
      ...process.env,
      NPM_CONFIG_PREFIX: this.npmPrefix,
      npm_config_prefix: this.npmPrefix,
    };
    return runNpmCommand(args, {
      npmExecutable: this.npmExecutable,
      env,
    });
  }

  private reportStatus(message: string): void {
    this.reporter?.({ type: "status", message });
  }
}
