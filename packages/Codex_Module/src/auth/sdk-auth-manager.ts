import { access, copyFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const CODEX_LOGIN_HINT =
  "Codex authentication required. Run `codex login` in a terminal session.";

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

  constructor() {
    this.codexHome = process.env.CODEX_HOME ?? CODEAI_CODEX_HOME;
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
    try {
      await access(path.join(this.codexHome, "auth.json"));
      return;
    } catch {
      // auth missing in current CODEX_HOME; try migrating from legacy ~/.codex
    }

    try {
      await access(path.join(LEGACY_CODEX_HOME, "auth.json"));
    } catch {
      return;
    }

    try {
      await mkdir(this.codexHome, { recursive: true });
      await copyFile(
        path.join(LEGACY_CODEX_HOME, "auth.json"),
        path.join(this.codexHome, "auth.json")
      );
      await this.migrateLegacyConfigIfNeeded();
    } catch {
      // ignore migration errors; ensureAuthenticated will surface missing auth
    }
  }

  private async migrateLegacyConfigIfNeeded(): Promise<void> {
    try {
      await access(path.join(this.codexHome, "config.toml"));
      return;
    } catch {
      // no config.toml in CODEX_HOME; try copying from legacy directory
    }

    try {
      await access(path.join(LEGACY_CODEX_HOME, "config.toml"));
    } catch {
      return;
    }

    try {
      await copyFile(
        path.join(LEGACY_CODEX_HOME, "config.toml"),
        path.join(this.codexHome, "config.toml")
      );
    } catch {
      // ignore copy errors
    }
  }
}
