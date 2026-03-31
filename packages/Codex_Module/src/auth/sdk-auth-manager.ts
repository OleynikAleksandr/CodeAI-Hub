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
import { CodexProviderConfigMaterializer } from "./codex-provider-config-materializer";
import { resolveCodexReasoningSummaryMode } from "./codex-reasoning-summary-settings";

const CODEX_LOGIN_HINT =
  "Codex authentication required. Run `codex login` in a terminal session.";
const isWindows = process.platform === "win32";

const LEGACY_CODEX_HOME = path.join(homedir(), ".codex");
const CODEAI_CODEX_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "codex",
  "home"
);

export class CodexAuthManager {
  private readonly codexHome: string;
  private readonly configMaterializer: CodexProviderConfigMaterializer;

  constructor() {
    this.codexHome = process.env.CODEX_HOME ?? CODEAI_CODEX_HOME;
    this.configMaterializer = new CodexProviderConfigMaterializer({
      legacyCodexHome: LEGACY_CODEX_HOME,
      overrides: {
        modelReasoningSummary: resolveCodexReasoningSummaryMode(),
      },
      providerCodexHome: this.codexHome,
    });
  }

  async ensureAuthenticated(): Promise<void> {
    await this.migrateLegacyAuthIfNeeded();
    const authenticated = await this.checkAuthentication();
    if (!authenticated) {
      throw new Error(CODEX_LOGIN_HINT);
    }
  }

  getAuthEnvironment(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    env.CODEX_HOME = this.codexHome;
    return env;
  }

  private async checkAuthentication(): Promise<boolean> {
    try {
      await access(path.join(this.codexHome, "auth.json"));
      return true;
    } catch {
      return false;
    }
  }

  private async migrateLegacyAuthIfNeeded(): Promise<void> {
    await this.ensureLegacyFileLinked("auth.json");
    await this.configMaterializer.ensureProviderConfigToml();
  }

  private async ensureLegacyFileLinked(filename: string): Promise<void> {
    const source = path.join(LEGACY_CODEX_HOME, filename);
    const destination = path.join(this.codexHome, filename);

    try {
      await access(source);
    } catch {
      return;
    }

    try {
      await mkdir(this.codexHome, { recursive: true });
      await this.ensureLinkedOrCopiedFile(source, destination);
    } catch {
      // ignore migration errors; ensureAuthenticated will surface missing auth
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
