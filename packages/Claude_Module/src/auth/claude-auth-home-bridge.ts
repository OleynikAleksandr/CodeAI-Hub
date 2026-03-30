import {
  access,
  copyFile,
  lstat,
  mkdir,
  readlink,
  symlink,
  unlink,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  resolveClaudeProviderClaudeDir,
  resolveClaudeProviderHome,
} from "../sdk/claude-provider-home";
import type { ModuleReporter } from "../types";

const isWindows = process.platform === "win32";
const isMacOS = process.platform === "darwin";
const LEGACY_CLAUDE_DIR = path.join(homedir(), ".claude");
const CREDENTIALS_FILENAME = ".credentials.json";
const CLAUDE_STATE_FILENAME = ".claude.json";

const serializeHomeBridgeError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return String(error);
};

export class ClaudeAuthHomeBridge {
  private readonly reporter?: ModuleReporter;

  constructor(options?: { readonly reporter?: ModuleReporter }) {
    this.reporter = options?.reporter;
  }

  async ensureMacOSProviderHomeKeychainBridgeIfNeeded(): Promise<void> {
    if (!isMacOS) {
      return;
    }

    const providerHome = resolveClaudeProviderHome();
    const realHome = homedir();
    if (path.resolve(providerHome) === path.resolve(realHome)) {
      return;
    }

    const sourceKeychainsDir = path.join(realHome, "Library", "Keychains");
    const providerLibraryDir = path.join(providerHome, "Library");
    const providerKeychainsDir = path.join(providerLibraryDir, "Keychains");

    try {
      await access(sourceKeychainsDir);
    } catch {
      // If the user's Keychains dir is missing (unexpected on macOS), don't block.
      return;
    }

    try {
      await mkdir(providerLibraryDir, { recursive: true });

      try {
        const stats = await lstat(providerKeychainsDir);
        if (stats.isSymbolicLink()) {
          const target = await readlink(providerKeychainsDir);
          const resolvedTarget = path.resolve(
            path.dirname(providerKeychainsDir),
            target
          );
          if (
            path.resolve(resolvedTarget) === path.resolve(sourceKeychainsDir)
          ) {
            return;
          }

          await unlink(providerKeychainsDir);
        } else {
          // Avoid destructive changes: if something else already occupies the path,
          // skip creating a bridge and rely on alternative auth methods.
          this.reporter?.warn?.(
            "Claude provider-home Keychains bridge path exists and is not a symlink; skipping"
          );
          return;
        }
      } catch {
        // does not exist; create below
      }

      await symlink(sourceKeychainsDir, providerKeychainsDir);
    } catch (error) {
      // Non-fatal: if it fails, auth-probe will surface the problem.
      this.reporter?.warn?.(
        `Claude provider-home Keychains bridge failed: ${serializeHomeBridgeError(
          error
        )}`
      );
    }
  }

  async linkLegacyCliStateIfNeeded(): Promise<void> {
    const source = path.join(homedir(), CLAUDE_STATE_FILENAME);
    const destination = path.join(
      resolveClaudeProviderHome(),
      CLAUDE_STATE_FILENAME
    );

    try {
      await access(source);
    } catch {
      return;
    }

    try {
      await mkdir(resolveClaudeProviderHome(), { recursive: true });
      await this.ensureLinkedOrCopiedFile(source, destination);
    } catch {
      // ignore linking errors; auth check below will surface failures
    }
  }

  async migrateLegacyCredentialsIfNeeded(): Promise<void> {
    const providerClaudeDir = resolveClaudeProviderClaudeDir();
    const destination = path.join(providerClaudeDir, CREDENTIALS_FILENAME);
    const source = path.join(LEGACY_CLAUDE_DIR, CREDENTIALS_FILENAME);

    try {
      await access(destination);
      return;
    } catch {
      // credentials missing under provider-home; try migrating from legacy ~/.claude
    }

    try {
      await access(source);
    } catch {
      return;
    }

    try {
      await mkdir(providerClaudeDir, { recursive: true });
      await copyFile(source, destination);
    } catch {
      // ignore migration errors; ensureSubscriptionAuth will surface missing auth later
    }
  }

  private async ensureLinkedOrCopiedFile(
    source: string,
    destination: string
  ): Promise<void> {
    const existing = await this.readExistingLinkTarget(destination);
    if (existing && path.resolve(existing) === path.resolve(source)) {
      return;
    }

    if (existing !== null) {
      await unlink(destination);
    }

    if (isWindows) {
      await copyFile(source, destination);
      return;
    }

    try {
      await symlink(source, destination);
    } catch {
      await copyFile(source, destination);
    }
  }

  private async readExistingLinkTarget(
    filePath: string
  ): Promise<string | null> {
    try {
      const stats = await lstat(filePath);
      if (stats.isSymbolicLink()) {
        const linkTarget = await readlink(filePath);
        return path.resolve(path.dirname(filePath), linkTarget);
      }
      return filePath;
    } catch {
      return null;
    }
  }
}
