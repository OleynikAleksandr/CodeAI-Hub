import { access } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const CODEX_LOGIN_HINT =
  "Codex authentication required. Run `codex login` in a terminal session.";

export class CodexAuthManager {
  private readonly codexHome: string;

  constructor() {
    this.codexHome = process.env.CODEX_HOME ?? path.join(homedir(), ".codex");
  }

  async ensureAuthenticated(): Promise<void> {
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
}
