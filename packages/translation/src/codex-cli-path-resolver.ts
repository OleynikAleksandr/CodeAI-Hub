import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const HOME_DIRECTORY_PATTERN = /^~(?=$|\/|\\)/u;
const USERPROFILE_PATTERN = /%USERPROFILE%/giu;
const NPM_GLOBAL_MODULES_ROOT_UNIX = "~/.npm-global/lib/node_modules";
const NPM_GLOBAL_MODULES_ROOT_WINDOWS =
  "%USERPROFILE%\\AppData\\Roaming\\npm\\node_modules";
const CODEX_INSTALLER_SDK_PATHS = {
  macOS: `${NPM_GLOBAL_MODULES_ROOT_UNIX}/@openai/codex-sdk/`,
  linux: `${NPM_GLOBAL_MODULES_ROOT_UNIX}/@openai/codex-sdk/`,
  windows: `${NPM_GLOBAL_MODULES_ROOT_WINDOWS}\\@openai\\codex-sdk\\`,
} as const;
const CLI_EXECUTABLE_UNIX = "codex";
const CLI_EXECUTABLE_WINDOWS = "codex.cmd";

const expandInstallerPath = (value: string): string =>
  value
    .replace(HOME_DIRECTORY_PATTERN, homedir())
    .replace(USERPROFILE_PATTERN, process.env.USERPROFILE ?? homedir());

const computePrefix = (moduleDirectory: string): string => {
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
};

const resolveDefaultSdkModuleDirectory = (): string => {
  if (process.platform === "win32") {
    return path.resolve(expandInstallerPath(CODEX_INSTALLER_SDK_PATHS.windows));
  }

  const unixPath =
    process.platform === "darwin"
      ? CODEX_INSTALLER_SDK_PATHS.macOS
      : CODEX_INSTALLER_SDK_PATHS.linux;
  return path.resolve(expandInstallerPath(unixPath));
};

const isReadableFile = (candidate: string): boolean => {
  try {
    accessSync(candidate, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

export interface CodexCliPathResolverOptions {
  readonly explicitExecutablePath?: string;
}

export class CodexCliPathResolver {
  private readonly explicitExecutablePath?: string;

  constructor(options: CodexCliPathResolverOptions = {}) {
    this.explicitExecutablePath = options.explicitExecutablePath;
  }

  resolveExecutablePath(): string | null {
    const explicit =
      this.explicitExecutablePath?.trim() ||
      process.env.CODEX_TRANSLATION_CLI_PATH?.trim() ||
      process.env.CODEX_CLI_PATH?.trim();
    if (explicit && isReadableFile(explicit)) {
      return explicit;
    }

    const sdkModuleDirectory = resolveDefaultSdkModuleDirectory();
    const prefix = computePrefix(sdkModuleDirectory);
    const executablePath =
      process.platform === "win32"
        ? path.join(prefix, CLI_EXECUTABLE_WINDOWS)
        : path.join(prefix, "bin", CLI_EXECUTABLE_UNIX);

    return isReadableFile(executablePath) ? executablePath : null;
  }
}
