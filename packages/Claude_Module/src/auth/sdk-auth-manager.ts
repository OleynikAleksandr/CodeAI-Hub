import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CLAUDE_LOGIN_HINT =
  "Claude CLI authentication required. Run `claude login` in a terminal session.";

export class SDKAuthManager {
  private readonly npxExecutable =
    process.platform === "win32" ? "npx.cmd" : "npx";

  async ensureSubscriptionAuth(): Promise<void> {
    const authenticated = await this.checkAuthentication();
    if (!authenticated) {
      throw new Error(CLAUDE_LOGIN_HINT);
    }
  }

  getAuthEnvironment(): NodeJS.ProcessEnv {
    const baseEnv = { ...process.env };
    baseEnv.HOME = homedir();
    baseEnv.CLAUDE_USE_CLI_AUTH = "true";
    baseEnv.CLAUDE_SUBSCRIPTION_MODE = "true";
    baseEnv.ANTHROPIC_API_KEY = undefined;
    return baseEnv;
  }

  private async checkAuthentication(): Promise<boolean> {
    try {
      const { stdout, stderr } = await execFileAsync(
        this.npxExecutable,
        ["@anthropic-ai/claude-code", "--version"],
        {
          env: this.getAuthEnvironment(),
          windowsHide: true,
          timeout: 10_000,
        }
      );
      const output = `${stdout}${stderr}`.toLowerCase();
      return output.includes("claude");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const needsLogin =
        message.includes("login") ||
        message.includes("not authenticated") ||
        message.includes("authentication");
      if (needsLogin) {
        return false;
      }
      throw error;
    }
  }
}
