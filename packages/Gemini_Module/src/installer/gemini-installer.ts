import path from "node:path";
import type { GeminiInstallerPaths, ModuleReporter } from "../types";

const HOME_DIRECTORY_PATTERN = /^~(?=$|\/|\\)/u;
const USERPROFILE_PATTERN = /%USERPROFILE%/giu;

export type GeminiInstallerOptions = {
  readonly reporter?: ModuleReporter;
  readonly binaryPathOverride?: string;
};

export class GeminiInstaller {
  private readonly paths: GeminiInstallerPaths;

  private readonly reporter?: ModuleReporter;

  private readonly binaryPathOverride?: string;

  constructor(
    paths: GeminiInstallerPaths,
    options: GeminiInstallerOptions = {}
  ) {
    this.paths = paths;
    this.reporter = options.reporter;
    this.binaryPathOverride = options.binaryPathOverride;
  }

  async ensureInstalled(): Promise<void> {
    await Promise.resolve();
    this.reporter?.info?.("Gemini installer stub invoked");
  }

  getBinaryPath(): string {
    if (this.binaryPathOverride) {
      return this.expandPath(this.binaryPathOverride);
    }
    return this.expandPath(this.selectPlatformPath());
  }

  getCredentialsDirectory(): string {
    return path.join(process.env.HOME ?? "~", ".gemini");
  }

  private selectPlatformPath(): string {
    if (process.platform === "darwin") {
      return this.paths.macOS;
    }
    if (process.platform === "win32") {
      return this.paths.windows;
    }
    return this.paths.linux;
  }

  private expandPath(candidate: string): string {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
    return candidate
      .replace(HOME_DIRECTORY_PATTERN, home)
      .replace(USERPROFILE_PATTERN, process.env.USERPROFILE ?? home);
  }
}
