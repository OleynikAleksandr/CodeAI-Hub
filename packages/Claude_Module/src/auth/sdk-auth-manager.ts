import { execFile } from "node:child_process";
import { access, copyFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  resolveClaudeProviderClaudeDir,
  resolveClaudeProviderHome,
} from "../sdk/claude-provider-home";

const execFileAsync = promisify(execFile);

const CLAUDE_LOGIN_HINT =
  "Claude CLI authentication required. Run `claude login` in a terminal session.";

const LEGACY_CLAUDE_DIR = path.join(homedir(), ".claude");
const CREDENTIALS_FILENAME = ".credentials.json";

export class SDKAuthManager {
  private readonly npxExecutable =
    process.platform === "win32" ? "npx.cmd" : "npx";

  async ensureSubscriptionAuth(): Promise<void> {
    await this.migrateLegacyCredentialsIfNeeded();
    const authenticated = await this.checkAuthentication();
    if (!authenticated) {
      throw new Error(CLAUDE_LOGIN_HINT);
    }
  }

  getAuthEnvironment(): NodeJS.ProcessEnv {
    const baseEnv = { ...process.env };
    baseEnv.HOME = resolveClaudeProviderHome();
    baseEnv.CLAUDE_USE_CLI_AUTH = "true";
    baseEnv.CLAUDE_SUBSCRIPTION_MODE = "true";
    baseEnv.ANTHROPIC_API_KEY = undefined;
    return baseEnv;
  }

  private async migrateLegacyCredentialsIfNeeded(): Promise<void> {
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
