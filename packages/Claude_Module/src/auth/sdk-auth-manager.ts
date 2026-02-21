import { execFile, spawn } from "node:child_process";
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
import { promisify } from "node:util";
import {
  CLAUDE_OAUTH_ENV_KEY,
  readClaudeOAuthToken,
} from "../sdk/claude-oauth-token-reader";
import {
  resolveClaudeProviderClaudeDir,
  resolveClaudeProviderHome,
} from "../sdk/claude-provider-home";
import type { ModuleReporter } from "../types";

const execFileAsync = promisify(execFile);

const CLAUDE_LOGIN_HINT =
  "Claude CLI authentication required. Run `claude /login` in a terminal session.";
const CLAUDE_PROVIDER_HOME_LOGIN_HINT =
  "Claude provider-home authentication required. Run `HOME=~/.codeai-hub/providers/claude/home claude /login`, then restart Core.";

const isWindows = process.platform === "win32";
const LEGACY_CLAUDE_DIR = path.join(homedir(), ".claude");
const CREDENTIALS_FILENAME = ".credentials.json";
const CLAUDE_STATE_FILENAME = ".claude.json";
const AUTH_PROBE_MODEL_ALIAS = "haiku";
const AUTH_PROBE_PROMPT = "Reply with OK only.";
const AUTH_PROBE_TIMEOUT_MS = 20_000;
const AUTH_PROBE_KILL_GRACE_MS = 2000;
const MAX_PROBE_OUTPUT_CHARS = 4000;

type ExecFailure = {
  readonly message?: unknown;
  readonly stdout?: unknown;
  readonly stderr?: unknown;
  readonly code?: unknown;
  readonly signal?: unknown;
  readonly killed?: unknown;
};

const toOptionalString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }
  return "";
};

const toLowerText = (value: unknown): string =>
  typeof value === "string" ? value.toLowerCase() : "";

const serializeExecFailure = (error: unknown): string => {
  const payload = error as ExecFailure;
  const chunks = [
    toOptionalString(payload.message),
    toOptionalString(payload.stderr),
    toOptionalString(payload.stdout),
    error instanceof Error ? error.message : String(error),
  ]
    .map((item) => item.trim())
    .filter(Boolean);
  return chunks.join(" | ");
};

const isAuthFailureMessage = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    lower.includes("/login") ||
    lower.includes("not logged in") ||
    lower.includes("not authenticated") ||
    lower.includes("authentication")
  );
};

const isProbeTimeoutFailure = (error: unknown): boolean => {
  const payload = error as ExecFailure;
  if (payload.killed === true) {
    return true;
  }
  if (payload.signal === "SIGTERM" || payload.signal === "SIGKILL") {
    return true;
  }
  return payload.code === 143;
};

const appendTail = (current: string, chunk: string): string => {
  const merged = current + chunk;
  return merged.length > MAX_PROBE_OUTPUT_CHARS
    ? merged.slice(merged.length - MAX_PROBE_OUTPUT_CHARS)
    : merged;
};

export class SDKAuthManager {
  private readonly npxExecutable =
    process.platform === "win32" ? "npx.cmd" : "npx";
  private readonly reporter?: ModuleReporter;
  private cachedOAuthToken: string | null = null;
  private providerHomeBootstrapReady = false;

  constructor(options?: { readonly reporter?: ModuleReporter }) {
    this.reporter = options?.reporter;
  }

  async ensureSubscriptionAuth(): Promise<void> {
    await this.linkLegacyCliStateIfNeeded();
    await this.migrateLegacyCredentialsIfNeeded();
    await this.bootstrapOAuthToken();
    const authenticated = await this.checkAuthentication();
    if (!authenticated) {
      throw new Error(CLAUDE_LOGIN_HINT);
    }
  }

  async ensureProviderHomeSessionBootstrap(payload: {
    readonly workspacePath: string;
  }): Promise<void> {
    if (this.providerHomeBootstrapReady) {
      return;
    }

    // Best-effort: reuse existing auth without forcing users to re-login
    // after we sandbox HOME for provider execution.
    await this.linkLegacyCliStateIfNeeded();
    await this.migrateLegacyCredentialsIfNeeded();
    await this.bootstrapOAuthToken();

    const initialAttempt = await this.runAuthProbe(payload.workspacePath);
    if (initialAttempt) {
      this.providerHomeBootstrapReady = true;
      return;
    }

    this.reporter?.warn?.(
      "Claude preflight auth probe failed; retrying with refreshed OAuth token"
    );
    await this.bootstrapOAuthToken({ forceRefresh: true });
    const retryAttempt = await this.runAuthProbe(payload.workspacePath);
    if (retryAttempt) {
      this.providerHomeBootstrapReady = true;
      return;
    }

    throw new Error(CLAUDE_PROVIDER_HOME_LOGIN_HINT);
  }

  getAuthEnvironment(): NodeJS.ProcessEnv {
    // Strip ANTHROPIC_API_KEY (force CLI auth) and CLAUDECODE (prevent nested
    // session detection when Core is launched from a Claude Code CLI context).
    const {
      ANTHROPIC_API_KEY: _anthropicApiKey,
      CLAUDECODE: _claudeCode,
      ...processEnv
    } = process.env;
    const baseEnv: NodeJS.ProcessEnv = {
      ...processEnv,
      HOME: resolveClaudeProviderHome(),
      CLAUDE_USE_CLI_AUTH: "true",
      CLAUDE_SUBSCRIPTION_MODE: "true",
    };
    // Only forward CLAUDE_CODE_OAUTH_TOKEN when the user explicitly provided it
    // in the environment. Do NOT forward tokens bootstrapped from the platform
    // Keychain: Claude CLI reads the Keychain natively (system-wide, HOME-
    // independent) and handles token refresh automatically. Pre-reading and
    // forwarding a stale Keychain access token bypasses the refresh flow and
    // causes 401 errors when the token has expired.
    const userProvidedToken = process.env[CLAUDE_OAUTH_ENV_KEY]?.trim();
    if (userProvidedToken) {
      baseEnv[CLAUDE_OAUTH_ENV_KEY] = userProvidedToken;
      return baseEnv;
    }
    const { [CLAUDE_OAUTH_ENV_KEY]: _oauthToken, ...withoutOauthToken } =
      baseEnv;
    return withoutOauthToken;
  }

  private async linkLegacyCliStateIfNeeded(): Promise<void> {
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

  private async bootstrapOAuthToken(options?: {
    readonly forceRefresh?: boolean;
  }): Promise<void> {
    if (!(options?.forceRefresh || !this.cachedOAuthToken)) {
      return;
    }

    const tokenFromEnv = process.env[CLAUDE_OAUTH_ENV_KEY]?.trim();
    if (tokenFromEnv) {
      this.cachedOAuthToken = tokenFromEnv;
      return;
    }

    const providerCredentials = path.join(
      resolveClaudeProviderClaudeDir(),
      CREDENTIALS_FILENAME
    );
    const legacyCredentials = path.join(
      LEGACY_CLAUDE_DIR,
      CREDENTIALS_FILENAME
    );

    const token = await readClaudeOAuthToken({
      credentialPaths: [providerCredentials, legacyCredentials],
    });
    if (token) {
      this.cachedOAuthToken = token;
      this.reporter?.info?.(
        "Claude OAuth token bootstrapped for provider-home"
      );
      return;
    }

    if (options?.forceRefresh) {
      this.cachedOAuthToken = null;
    }
  }

  private async runAuthProbe(workspacePath: string): Promise<boolean> {
    const args = [
      "@anthropic-ai/claude-code",
      "-p",
      "--no-session-persistence",
      "--model",
      AUTH_PROBE_MODEL_ALIAS,
      AUTH_PROBE_PROMPT,
    ];
    const child = spawn(this.npxExecutable, args, {
      cwd: workspacePath,
      env: this.getAuthEnvironment(),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    return await new Promise<boolean>((resolve, reject) => {
      let stdoutTail = "";
      let stderrTail = "";
      let timedOut = false;
      let timeout: NodeJS.Timeout | null = null;
      let killGrace: NodeJS.Timeout | null = null;

      const safeKill = (signal?: NodeJS.Signals): void => {
        try {
          child.kill(signal);
        } catch {
          // ignore
        }
      };

      const clearTimers = (): void => {
        if (timeout) {
          clearTimeout(timeout);
        }
        if (killGrace) {
          clearTimeout(killGrace);
        }
      };

      timeout = setTimeout(() => {
        timedOut = true;
        safeKill("SIGTERM");
        killGrace = setTimeout(() => {
          safeKill("SIGKILL");
        }, AUTH_PROBE_KILL_GRACE_MS);
      }, AUTH_PROBE_TIMEOUT_MS);

      child.on("error", (error) => {
        clearTimers();
        const message = serializeExecFailure(error);
        if (isAuthFailureMessage(message) || isProbeTimeoutFailure(error)) {
          resolve(false);
          return;
        }
        reject(new Error(`Claude auth preflight failed: ${message}`));
      });

      child.stdout?.on("data", (data: Buffer) => {
        stdoutTail = appendTail(stdoutTail, data.toString("utf8"));
      });

      child.stderr?.on("data", (data: Buffer) => {
        stderrTail = appendTail(stderrTail, data.toString("utf8"));
      });

      child.on("close", (code, signal) => {
        clearTimers();
        if (code === 0) {
          resolve(true);
          return;
        }

        const failureMessage = [stderrTail, stdoutTail]
          .map((chunk) => chunk.trim())
          .filter(Boolean)
          .join(" | ");
        if (
          timedOut ||
          isAuthFailureMessage(failureMessage) ||
          (signal !== null && signal !== undefined)
        ) {
          resolve(false);
          return;
        }

        const codePart = code !== null ? `code=${code}` : "";
        const signalPart = signal ? `signal=${signal}` : "";
        const details = [failureMessage, codePart, signalPart]
          .filter(Boolean)
          .join(" | ");
        reject(new Error(`Claude auth preflight failed: ${details}`));
      });
    });
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
      const message = toLowerText(serializeExecFailure(error));
      if (isAuthFailureMessage(message)) {
        return false;
      }
      throw error;
    }
  }
}
