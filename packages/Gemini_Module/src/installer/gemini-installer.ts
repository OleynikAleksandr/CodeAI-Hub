import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import type { GeminiInstallerPaths, ModuleReporter } from "../types/index.js";

const DEFAULT_CREDENTIAL_FILES = [
  "oauth_creds.json",
  "credentials.json",
] as const;

const requireModule = createRequire(import.meta.url);

type DependencyInfo = {
  readonly name: string;
  readonly version: string | null;
};

export type GeminiInstallerOptions = {
  readonly reporter?: ModuleReporter;
  readonly credentialsDirectory?: string;
  readonly requiredCredentialFiles?: readonly string[];
};

export class GeminiInstaller {
  private readonly reporter?: ModuleReporter;

  private readonly credentialsDirectory: string;

  private readonly credentialFiles: readonly string[];

  private coreVersion: string | null = null;

  private cliVersion: string | null = null;

  constructor(
    _paths: GeminiInstallerPaths,
    options: GeminiInstallerOptions = {}
  ) {
    this.reporter = options.reporter;
    this.credentialsDirectory = options.credentialsDirectory
      ? this.expandPath(options.credentialsDirectory)
      : path.join(homedir(), ".gemini");
    this.credentialFiles =
      options.requiredCredentialFiles &&
      options.requiredCredentialFiles.length > 0
        ? options.requiredCredentialFiles
        : DEFAULT_CREDENTIAL_FILES;
  }

  async ensureInstalled(): Promise<void> {
    const dependencies = this.verifyDependencies();
    const credentialFile = await this.verifyCredentials();

    if (credentialFile) {
      this.reporter?.info?.("Gemini module prerequisites validated", {
        coreVersion: dependencies.core.version,
        cliVersion: dependencies.cli.version,
        credentials: credentialFile,
      });
    } else {
      this.reporter?.warn?.(
        "Gemini credentials not detected during startup. Continuing without preflight auth check.",
        {
          credentialDirectory: this.credentialsDirectory,
          expectedFiles: this.credentialFiles,
          coreVersion: dependencies.core.version,
          cliVersion: dependencies.cli.version,
        }
      );
    }
  }

  getDetectedVersion(): string | null {
    return this.coreVersion;
  }

  getCliVersion(): string | null {
    return this.cliVersion;
  }

  getCredentialsDirectory(): string {
    return this.credentialsDirectory;
  }

  async hasCredentials(): Promise<boolean> {
    return (await this.verifyCredentials()) !== null;
  }

  private verifyDependencies(): {
    readonly core: DependencyInfo;
    readonly cli: DependencyInfo;
  } {
    const core = this.resolveDependencyVersion("@google/gemini-cli-core");
    if (!core.version) {
      throw new Error(
        "Unable to resolve @google/gemini-cli-core. Reinstall the Gemini module package."
      );
    }
    this.coreVersion = core.version;

    const cli = this.resolveDependencyVersion("@google/gemini-cli");
    if (cli.version) {
      this.cliVersion = cli.version;
    } else {
      this.reporter?.warn?.(
        "@google/gemini-cli package not found alongside the module. Tool metadata may be unavailable.",
        {
          dependency: cli.name,
        }
      );
    }

    return { core, cli };
  }

  private resolveDependencyVersion(packageName: string): DependencyInfo {
    try {
      const manifestPath = requireModule.resolve(`${packageName}/package.json`);
      const manifest = requireModule(manifestPath) as { version?: string };
      const version =
        typeof manifest.version === "string" ? manifest.version : null;
      return { name: packageName, version };
    } catch (error) {
      this.reporter?.warn?.("Failed to resolve dependency", {
        dependency: packageName,
        message: error instanceof Error ? error.message : String(error),
      });
      return { name: packageName, version: null };
    }
  }

  private async verifyCredentials(): Promise<string | null> {
    for (const relative of this.credentialFiles) {
      const candidate = path.join(this.credentialsDirectory, relative);
      if (await this.fileExists(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private expandPath(raw: string): string {
    if (raw.startsWith("~/")) {
      return path.join(homedir(), raw.slice(2));
    }
    return raw;
  }

  private async fileExists(target: string): Promise<boolean> {
    try {
      await access(target, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
