import { execFile } from "node:child_process";
import {
  access,
  copyFile,
  lstat,
  mkdir,
  readFile,
  readlink,
  symlink,
  unlink,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  resolveClaudeProviderClaudeDir,
  resolveClaudeProviderHome,
} from "../sdk/claude-provider-home";
import type { ModuleReporter } from "../types";

const execFileAsync = promisify(execFile);

const CLAUDE_LOGIN_HINT =
  "Claude CLI authentication required. Run `claude login` in a terminal session.";
const CLAUDE_PROVIDER_HOME_LOGIN_HINT =
  "Claude provider-home authentication required. Run `HOME=~/.codeai-hub/providers/claude/home claude login`, then restart Core.";

const isWindows = process.platform === "win32";
const LEGACY_CLAUDE_DIR = path.join(homedir(), ".claude");
const CREDENTIALS_FILENAME = ".credentials.json";
const CLAUDE_STATE_FILENAME = ".claude.json";
const CLAUDE_OAUTH_ENV_KEY = "CLAUDE_CODE_OAUTH_TOKEN";
const CLAUDE_OAUTH_KEYCHAIN_SERVICE = "Claude Code-credentials";
const AUTH_PROBE_MODEL_ALIAS = "haiku";
const AUTH_PROBE_PROMPT = "Reply with OK only.";
const TOKEN_FIELD_CANDIDATES = [
  "accessToken",
  "access_token",
  "oauthToken",
  "oauth_token",
  "token",
] as const;

type ExecFailure = {
  readonly message?: unknown;
  readonly stdout?: unknown;
  readonly stderr?: unknown;
};

const toLowerText = (value: unknown): string =>
  typeof value === "string" ? value.toLowerCase() : "";

const serializeExecFailure = (error: unknown): string => {
  const payload = error as ExecFailure;
  const chunks = [
    payload.message,
    payload.stderr,
    payload.stdout,
    error instanceof Error ? error.message : String(error),
  ]
    .map((item) => (typeof item === "string" ? item.trim() : ""))
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

const extractTokenFromCredentialPayload = (value: unknown): string | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const field of TOKEN_FIELD_CANDIDATES) {
    const candidate = record[field];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(record)) {
    const token = extractTokenFromCredentialPayload(nestedValue);
    if (token) {
      return token;
    }
  }

  return null;
};

export class SDKAuthManager {
  private readonly npxExecutable =
    process.platform === "win32" ? "npx.cmd" : "npx";
  private readonly reporter?: ModuleReporter;
  private cachedOAuthToken: string | null = null;

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
    const initialAttempt = await this.runAuthProbe(payload.workspacePath);
    if (initialAttempt) {
      return;
    }

    this.reporter?.warn?.(
      "Claude preflight auth probe failed; retrying with refreshed OAuth token"
    );
    await this.bootstrapOAuthToken({ forceRefresh: true });
    const retryAttempt = await this.runAuthProbe(payload.workspacePath);
    if (retryAttempt) {
      return;
    }

    throw new Error(CLAUDE_PROVIDER_HOME_LOGIN_HINT);
  }

  getAuthEnvironment(): NodeJS.ProcessEnv {
    const baseEnv = { ...process.env };
    baseEnv.HOME = resolveClaudeProviderHome();
    baseEnv.CLAUDE_USE_CLI_AUTH = "true";
    baseEnv.CLAUDE_SUBSCRIPTION_MODE = "true";
    const oauthToken = this.resolveOAuthTokenFromCacheOrEnvironment();
    if (oauthToken) {
      baseEnv[CLAUDE_OAUTH_ENV_KEY] = oauthToken;
    } else {
      delete baseEnv[CLAUDE_OAUTH_ENV_KEY];
    }
    baseEnv.ANTHROPIC_API_KEY = undefined;
    return baseEnv;
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

  private resolveOAuthTokenFromCacheOrEnvironment(): string | null {
    if (this.cachedOAuthToken?.trim()) {
      return this.cachedOAuthToken;
    }
    const tokenFromEnv = process.env[CLAUDE_OAUTH_ENV_KEY]?.trim();
    if (tokenFromEnv) {
      this.cachedOAuthToken = tokenFromEnv;
      return tokenFromEnv;
    }
    return null;
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

    const tokenFromFiles =
      (await this.readOAuthTokenFromCredentialsFile(providerCredentials)) ??
      (await this.readOAuthTokenFromCredentialsFile(legacyCredentials));
    if (tokenFromFiles) {
      this.cachedOAuthToken = tokenFromFiles;
      return;
    }

    const tokenFromPlatform = await this.readOAuthTokenFromPlatformStore();
    if (tokenFromPlatform) {
      this.cachedOAuthToken = tokenFromPlatform;
      return;
    }

    if (options?.forceRefresh) {
      this.cachedOAuthToken = null;
    }
  }

  private async readOAuthTokenFromCredentialsFile(
    filePath: string
  ): Promise<string | null> {
    try {
      const raw = await readFile(filePath, "utf8");
      return this.extractOAuthTokenFromRawPayload(raw);
    } catch {
      return null;
    }
  }

  private extractOAuthTokenFromRawPayload(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return extractTokenFromCredentialPayload(parsed);
    } catch {
      return null;
    }
  }

  private async readOAuthTokenFromPlatformStore(): Promise<string | null> {
    if (process.platform !== "darwin") {
      return null;
    }
    try {
      const { stdout } = await execFileAsync(
        "security",
        ["find-generic-password", "-s", CLAUDE_OAUTH_KEYCHAIN_SERVICE, "-w"],
        {
          windowsHide: true,
          timeout: 5000,
        }
      );
      return this.extractOAuthTokenFromRawPayload(stdout);
    } catch {
      return null;
    }
  }

  private async runAuthProbe(workspacePath: string): Promise<boolean> {
    try {
      await execFileAsync(
        this.npxExecutable,
        [
          "@anthropic-ai/claude-code",
          "-p",
          "--no-session-persistence",
          "--model",
          AUTH_PROBE_MODEL_ALIAS,
          AUTH_PROBE_PROMPT,
        ],
        {
          cwd: workspacePath,
          env: this.getAuthEnvironment(),
          windowsHide: true,
          timeout: 20_000,
        }
      );
      return true;
    } catch (error) {
      const message = serializeExecFailure(error);
      if (isAuthFailureMessage(message)) {
        return false;
      }
      throw new Error(`Claude auth preflight failed: ${message}`);
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
      const message = toLowerText(serializeExecFailure(error));
      if (isAuthFailureMessage(message)) {
        return false;
      }
      throw error;
    }
  }
}
