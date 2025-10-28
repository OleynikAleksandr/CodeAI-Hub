import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { GeminiInstallerPaths, ModuleReporter } from "../types";

const HOME_DIRECTORY_PATTERN = /^~(?=$|\/|\\)/u;
const USERPROFILE_PATTERN = /%USERPROFILE%/giu;
const DEFAULT_MINIMUM_VERSION = "0.10.0";
const WINDOWS_EXECUTABLES = ["gemini.cmd", "gemini.exe"] as const;
const UNIX_EXECUTABLE = "gemini" as const;
const VERSION_REGEX = /(\d+\.\d+\.\d+)/u;
const VERSION_SPLIT_REGEX = /[.-]/u;
const LIB_SUFFIX = `${path.sep}lib` as const;
const LIB_SUFFIX_LENGTH = LIB_SUFFIX.length;
const DEFAULT_CREDENTIAL_FILES = [
  "oauth_creds.json",
  "credentials.json",
] as const;

const execFileAsync = promisify(execFile);

export type GeminiInstallerOptions = {
  readonly reporter?: ModuleReporter;
  readonly binaryPathOverride?: string;
  readonly minimumVersion?: string;
  readonly credentialsDirectory?: string;
  readonly requiredCredentialFiles?: readonly string[];
};

export class GeminiInstaller {
  private readonly paths: GeminiInstallerPaths;

  private readonly reporter?: ModuleReporter;

  private readonly binaryPathOverride?: string;

  private readonly minimumVersion: string;

  private readonly credentialsDirectory: string;

  private resolvedBinaryPath: string | null = null;

  private detectedVersion: string | null = null;

  private readonly credentialFiles: readonly string[];

  constructor(
    paths: GeminiInstallerPaths,
    options: GeminiInstallerOptions = {}
  ) {
    this.paths = paths;
    this.reporter = options.reporter;
    this.binaryPathOverride = options.binaryPathOverride
      ? this.expandPath(options.binaryPathOverride)
      : undefined;
    this.minimumVersion = options.minimumVersion ?? DEFAULT_MINIMUM_VERSION;
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
    const binaryPath = await this.resolveBinaryPath();
    await this.verifyBinary(binaryPath);
    const version = await this.verifyVersion(binaryPath);
    const credentialFile = await this.verifyCredentials();
    this.reporter?.info?.("Gemini CLI verified", {
      binaryPath,
      version,
      credentials: credentialFile,
    });
  }

  getBinaryPath(): string {
    if (!this.resolvedBinaryPath) {
      throw new Error(
        "Gemini CLI binary path not resolved. Call ensureInstalled()."
      );
    }
    return this.resolvedBinaryPath;
  }

  getDetectedVersion(): string | null {
    return this.detectedVersion;
  }

  getCredentialsDirectory(): string {
    return this.credentialsDirectory;
  }

  async hasCredentials(): Promise<boolean> {
    for (const relative of this.credentialFiles) {
      const target = path.join(this.credentialsDirectory, relative);
      if (await this.fileExists(target)) {
        return true;
      }
    }
    return false;
  }

  private async resolveBinaryPath(): Promise<string> {
    if (this.resolvedBinaryPath) {
      return this.resolvedBinaryPath;
    }

    for (const candidate of this.buildBinaryCandidates()) {
      try {
        await this.ensureExecutable(candidate);
        this.resolvedBinaryPath = candidate;
        this.reporter?.info?.("Gemini CLI candidate accepted", {
          candidate,
        });
        return candidate;
      } catch (candidateError) {
        this.reporter?.warn?.("Gemini CLI candidate rejected", {
          candidate,
          reason:
            candidateError instanceof Error
              ? candidateError.message
              : String(candidateError),
        });
      }
    }

    const error = new Error(
      "Gemini CLI binary not found. Install @google/gemini-cli globally or set GEMINI_CLI_PATH."
    );
    this.reporter?.error?.("Gemini CLI binary resolution failed", error);
    throw error;
  }

  private async verifyBinary(candidate: string): Promise<void> {
    try {
      await this.ensureExecutable(candidate);
    } catch (error) {
      this.reporter?.error?.("Gemini CLI binary is not executable", error, {
        candidate,
      });
      throw new Error(
        `Gemini CLI binary at ${candidate} is not executable. Adjust permissions and retry.`
      );
    }
  }

  private async verifyVersion(binaryPath: string): Promise<string> {
    const result = await this.readVersion(binaryPath);
    if (!result) {
      throw new Error(
        "Unable to determine Gemini CLI version. Reinstall the package."
      );
    }
    if (!this.isVersionAtLeast(result, this.minimumVersion)) {
      throw new Error(
        `Gemini CLI version ${result} is below required ${this.minimumVersion}. Run npm install -g @google/gemini-cli@latest.`
      );
    }
    this.detectedVersion = result;
    return result;
  }

  private async verifyCredentials(): Promise<string> {
    for (const relative of this.credentialFiles) {
      const candidate = path.join(this.credentialsDirectory, relative);
      if (await this.fileExists(candidate)) {
        return candidate;
      }
    }
    const message =
      "Gemini CLI credentials not found. Run `gemini login` to authenticate before using CodeAI Hub.";
    this.reporter?.warn?.(message, {
      credentialDirectory: this.credentialsDirectory,
      expectedFiles: this.credentialFiles,
    });
    throw new Error(message);
  }

  private buildBinaryCandidates(): readonly string[] {
    const candidates = new Set<string>();
    const addCandidate = (value: string | null | undefined): void => {
      if (!value) {
        return;
      }
      candidates.add(path.resolve(value));
    };

    if (this.binaryPathOverride) {
      addCandidate(this.binaryPathOverride);
    }

    addCandidate(this.expandPath(process.env.GEMINI_CLI_PATH ?? ""));

    for (const entry of this.resolvePathEntries()) {
      for (const name of this.resolveExecutableNames()) {
        addCandidate(path.join(entry, name));
      }
    }

    for (const candidate of this.resolveNpmPrefixBinaries()) {
      addCandidate(candidate);
    }

    return Array.from(candidates.values());
  }

  private resolvePathEntries(): string[] {
    const pathValue = process.env.PATH;
    if (!pathValue) {
      return [];
    }
    return pathValue
      .split(path.delimiter)
      .filter((segment) => segment.trim().length > 0)
      .map((segment) => this.expandPath(segment));
  }

  private resolveExecutableNames(): readonly string[] {
    if (process.platform === "win32") {
      return WINDOWS_EXECUTABLES;
    }
    return [UNIX_EXECUTABLE];
  }

  private resolveNpmPrefixBinaries(): string[] {
    const moduleDirectory = this.normalizeInstallerPath(this.paths);
    const prefix = this.computePrefix(moduleDirectory);
    if (!prefix) {
      return [];
    }
    if (process.platform === "win32") {
      return WINDOWS_EXECUTABLES.map((binary) => path.join(prefix, binary));
    }
    return [path.join(prefix, "bin", UNIX_EXECUTABLE)];
  }

  private normalizeInstallerPath(paths: GeminiInstallerPaths): string {
    const rawPath = this.selectPlatformPath(paths);
    const expanded = this.expandPath(rawPath);
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

  private expandPath(candidate: string): string {
    if (!candidate) {
      return candidate;
    }
    const home = process.env.HOME ?? process.env.USERPROFILE ?? homedir();
    return candidate
      .replace(HOME_DIRECTORY_PATTERN, home)
      .replace(USERPROFILE_PATTERN, process.env.USERPROFILE ?? home);
  }

  private computePrefix(moduleDirectory: string): string {
    const marker = `${path.sep}node_modules${path.sep}`;
    const index = moduleDirectory.indexOf(marker);
    if (index === -1) {
      return path.resolve(moduleDirectory, "..", "..");
    }
    const beforeNodeModules = moduleDirectory.slice(0, index);
    if (beforeNodeModules.endsWith(LIB_SUFFIX)) {
      return beforeNodeModules.slice(
        0,
        beforeNodeModules.length - LIB_SUFFIX_LENGTH
      );
    }
    return beforeNodeModules;
  }

  private async ensureExecutable(candidate: string): Promise<void> {
    try {
      await access(candidate, constants.X_OK);
    } catch (error) {
      if (process.platform === "win32") {
        await access(candidate, constants.F_OK);
        return;
      }
      throw error;
    }
  }

  private async readVersion(binaryPath: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync(binaryPath, ["--version"], {
        encoding: "utf8",
        env: {
          ...process.env,
          NO_COLOR: "1",
        },
      });
      const match = stdout.match(VERSION_REGEX);
      if (match) {
        return match[1];
      }
      return null;
    } catch (error) {
      this.reporter?.error?.("Failed to execute gemini --version", error, {
        binaryPath,
      });
      return null;
    }
  }

  private isVersionAtLeast(candidate: string, minimum: string): boolean {
    const candidateParts = this.parseVersion(candidate);
    const minimumParts = this.parseVersion(minimum);
    if (candidateParts.length === 0) {
      return false;
    }
    const length = Math.max(candidateParts.length, minimumParts.length);
    for (let index = 0; index < length; index += 1) {
      const a = candidateParts[index] ?? 0;
      const b = minimumParts[index] ?? 0;
      if (a > b) {
        return true;
      }
      if (a < b) {
        return false;
      }
    }
    return true;
  }

  private parseVersion(value: string): number[] {
    return value
      .split(VERSION_SPLIT_REGEX)
      .map((segment) => Number.parseInt(segment, 10))
      .filter((part) => Number.isFinite(part) && part >= 0);
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
