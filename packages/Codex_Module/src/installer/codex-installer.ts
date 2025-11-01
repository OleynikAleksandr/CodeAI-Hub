import { access, mkdir } from "node:fs/promises";
import https from "node:https";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { CodexInstallerPaths, ModuleReporter } from "../types";
import { runNpmCommand } from "./npm-runner";

const SDK_PACKAGE_NAME = "@openai/codex-sdk";
const CLI_PACKAGE_NAME = "@openai/codex";
const SDK_REGISTRY_URL = "https://registry.npmjs.org/@openai/codex-sdk/latest";
const CLI_REGISTRY_URL = "https://registry.npmjs.org/@openai/codex/latest";
const SDK_ENTRY_FILENAME = "dist/index.js";
const CLI_EXECUTABLE_UNIX = "codex";
const CLI_EXECUTABLE_WINDOWS = "codex.cmd";
const HOME_DIRECTORY_PATTERN = /^~(?=$|\/|\\)/u;
const USERPROFILE_PATTERN = /%USERPROFILE%/giu;

export type InstallerEvent =
  | { readonly type: "status"; readonly message: string }
  | { readonly type: "error"; readonly message: string };

export class CodexInstaller {
  private readonly moduleDirectory: string;
  private readonly moduleEntryPath: string;
  private readonly npmPrefix: string;
  private readonly cliExecutablePath: string;
  private readonly reporter?: (event: InstallerEvent) => void;
  private readonly logger?: ModuleReporter;
  private readonly npmExecutable: string;
  private currentSdkVersion: string | null = null;
  private currentCliVersion: string | null = null;

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
      scope: "codexCli",
      firstRun: options?.firstRun,
      detail: options?.detail,
    });
  }

  constructor(
    paths: CodexInstallerPaths,
    options?: {
      readonly reporter?: (event: InstallerEvent) => void;
      readonly npmExecutable?: string;
      readonly logger?: ModuleReporter;
    }
  ) {
    this.moduleDirectory = this.normalizeInstallerPath(paths);
    this.moduleEntryPath = path.join(this.moduleDirectory, SDK_ENTRY_FILENAME);
    this.npmPrefix = this.computePrefix(this.moduleDirectory);
    this.cliExecutablePath = this.resolveCliExecutablePath();
    this.reporter = options?.reporter;
    this.logger = options?.logger;
    this.npmExecutable =
      options?.npmExecutable ??
      (process.platform === "win32" ? "npm.cmd" : "npm");
  }

  getModulePath(): string {
    return this.moduleEntryPath;
  }

  getExecutablePath(): string {
    return this.cliExecutablePath;
  }

  getCurrentSdkVersion(): string | null {
    return this.currentSdkVersion;
  }

  getCurrentCliVersion(): string | null {
    return this.currentCliVersion;
  }

  loadModule<TModule = unknown>(): Promise<TModule> {
    const moduleUrl = pathToFileURL(this.moduleEntryPath).href;
    const dynamicImport = new Function("url", "return import(url);") as (
      url: string
    ) => Promise<TModule>;
    return dynamicImport(moduleUrl);
  }

  async ensureInstalled(): Promise<void> {
    await this.ensurePrefixDirectories();
    const sdkInstalled = await this.checkPackageInstalled(
      SDK_PACKAGE_NAME,
      "sdk"
    );
    if (sdkInstalled) {
      this.emitProgress("Checking Codex components...");
      await this.updatePackageIfNeeded(SDK_PACKAGE_NAME, "sdk");
    } else {
      this.emitProgress("Downloading Codex components for the first run...", {
        firstRun: true,
        detail: "This may take a little longer the very first time.",
      });
      await this.installPackage(SDK_PACKAGE_NAME, "sdk");
    }

    const cliInstalled = await this.checkPackageInstalled(
      CLI_PACKAGE_NAME,
      "cli"
    );
    if (cliInstalled) {
      this.emitProgress("Refreshing Codex components...");
      await this.updatePackageIfNeeded(CLI_PACKAGE_NAME, "cli");
    } else {
      this.emitProgress("Finishing Codex setup...", {
        firstRun: true,
        detail: "Almost done — this step only runs once.",
      });
      await this.installPackage(CLI_PACKAGE_NAME, "cli");
    }

    this.emitProgress("Codex components ready.", { phase: "provider" });
    await this.verifyInstallation();
  }

  private normalizeInstallerPath(paths: CodexInstallerPaths): string {
    const rawPath = this.selectPlatformPath(paths);
    const expanded = rawPath
      .replace(HOME_DIRECTORY_PATTERN, homedir())
      .replace(USERPROFILE_PATTERN, process.env.USERPROFILE ?? homedir());
    return path.resolve(expanded);
  }

  private selectPlatformPath(paths: CodexInstallerPaths): string {
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

  private async ensurePrefixDirectories(): Promise<void> {
    const libDir = path.join(this.npmPrefix, "lib", "node_modules");
    await mkdir(libDir, { recursive: true });
  }

  private async verifyInstallation(): Promise<void> {
    await access(this.moduleEntryPath);
    await access(this.cliExecutablePath);
  }

  private async checkPackageInstalled(
    packageName: string,
    kind: "sdk" | "cli"
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
        if (kind === "sdk") {
          this.currentSdkVersion = version;
          this.reportStatus(`Detected Codex SDK v${version}`);
        } else {
          this.currentCliVersion = version;
          this.reportStatus(`Detected Codex CLI v${version}`);
        }
        return true;
      }
      return false;
    } catch (error) {
      this.logger?.warn?.(
        `Failed to detect existing ${kind.toUpperCase()} installation`
      );
      this.logger?.error?.("npm list error", error);
      return false;
    }
  }

  private async installPackage(
    packageName: string,
    kind: "sdk" | "cli"
  ): Promise<void> {
    this.reportStatus(`Installing ${this.describePackage(kind)} globally`);
    await this.runNpm(["install", "-g", `${packageName}@latest`, "--force"]);
    await this.checkPackageInstalled(packageName, kind);
  }

  private async updatePackageIfNeeded(
    packageName: string,
    kind: "sdk" | "cli"
  ): Promise<void> {
    const currentVersion =
      kind === "sdk" ? this.currentSdkVersion : this.currentCliVersion;
    const latestVersion = await this.getLatestVersion(kind);
    if (
      !(latestVersion && currentVersion) ||
      currentVersion === latestVersion
    ) {
      return;
    }
    this.reportStatus(
      `Updating ${this.describePackage(kind)} to v${latestVersion}`
    );
    this.emitProgress("Updating Codex components...", {
      detail: "Applying the latest improvements.",
    });
    await this.runNpm(["install", "-g", `${packageName}@latest`, "--force"]);
    await this.checkPackageInstalled(packageName, kind);
  }

  private getRegistryUrl(kind: "sdk" | "cli"): string {
    return kind === "sdk" ? SDK_REGISTRY_URL : CLI_REGISTRY_URL;
  }

  private getLatestVersion(kind: "sdk" | "cli"): Promise<string | null> {
    const registryUrl = this.getRegistryUrl(kind);
    return new Promise((resolve) => {
      https
        .get(registryUrl, (response) => {
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
        .on("error", (error) => {
          this.logger?.error?.("Unable to reach npm registry", error);
          resolve(null);
        });
    });
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

  private describePackage(kind: "sdk" | "cli"): string {
    return kind === "sdk" ? "Codex SDK" : "Codex CLI";
  }

  private reportStatus(message: string): void {
    this.reporter?.({ type: "status", message });
  }
}
