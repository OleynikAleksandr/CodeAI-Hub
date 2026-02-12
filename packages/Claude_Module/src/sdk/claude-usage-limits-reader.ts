import { homedir } from "node:os";
import path from "node:path";
import {
  CLAUDE_OAUTH_ENV_KEY,
  readClaudeOAuthToken,
} from "./claude-oauth-token-reader";
import { resolveClaudeProviderClaudeDir } from "./claude-provider-home";
import type { UsageLimitsSnapshot } from "./claude-usage-limits-snapshot";
import { extractUsageLimitsFromRateLimitHeaders } from "./claude-usage-limits-snapshot";

type UsageLimitsReaderOptions = {
  readonly executablePath: string;
  readonly env: NodeJS.ProcessEnv;
};

const TEMP_SESSION_PREFIX = "temp_";
const CLAUDE_CREDENTIALS_FILENAME = ".credentials.json";
const ANTHROPIC_MESSAGES_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_BETA = "oauth-2025-04-20";
const USAGE_PROBE_MODEL = "claude-haiku-4-5-20251001";
const USAGE_PROBE_MAX_TOKENS = 1;
const USAGE_PROBE_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BODY_CHARS = 4000;

const getTokenFromEnvironment = (env: NodeJS.ProcessEnv): string | null => {
  const fromReaderEnv = env[CLAUDE_OAUTH_ENV_KEY]?.trim();
  if (fromReaderEnv) {
    return fromReaderEnv;
  }
  const fromProcessEnv = process.env[CLAUDE_OAUTH_ENV_KEY]?.trim();
  if (fromProcessEnv) {
    return fromProcessEnv;
  }
  return null;
};

const resolveCredentialPaths = (): readonly string[] => {
  const providerCredentials = path.join(
    resolveClaudeProviderClaudeDir(),
    CLAUDE_CREDENTIALS_FILENAME
  );
  const legacyCredentials = path.join(
    homedir(),
    ".claude",
    CLAUDE_CREDENTIALS_FILENAME
  );
  return [providerCredentials, legacyCredentials];
};

const toHeaderMap = (headers: Headers): ReadonlyMap<string, string> => {
  const normalized = new Map<string, string>();
  for (const [key, value] of headers.entries()) {
    normalized.set(key.toLowerCase(), value);
  }
  return normalized;
};

const safeReadResponseBody = async (
  response: Response
): Promise<string | null> => {
  try {
    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed.length > MAX_RESPONSE_BODY_CHARS
      ? `${trimmed.slice(0, MAX_RESPONSE_BODY_CHARS)}...`
      : trimmed;
  } catch {
    return null;
  }
};

const runUsageProbe = async (oauthToken: string): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, USAGE_PROBE_TIMEOUT_MS);

  try {
    return await fetch(ANTHROPIC_MESSAGES_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-beta": ANTHROPIC_BETA,
        authorization: `Bearer ${oauthToken}`,
      },
      body: JSON.stringify({
        model: USAGE_PROBE_MODEL,
        max_tokens: USAGE_PROBE_MAX_TOKENS,
        messages: [{ role: "user", content: "." }],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export class ClaudeUsageLimitsReader {
  private readonly options: UsageLimitsReaderOptions;

  constructor(options: UsageLimitsReaderOptions) {
    this.options = options;
  }

  async read(payload: {
    readonly sessionId: string;
    readonly cwd: string;
  }): Promise<UsageLimitsSnapshot | null> {
    if (payload.sessionId.startsWith(TEMP_SESSION_PREFIX)) {
      return null;
    }

    const oauthToken =
      getTokenFromEnvironment(this.options.env) ??
      (await readClaudeOAuthToken({
        credentialPaths: resolveCredentialPaths(),
      }));

    if (!oauthToken) {
      return null;
    }

    const response = await runUsageProbe(oauthToken);
    if (!response.ok) {
      const body = await safeReadResponseBody(response);
      const details = body
        ? `status=${response.status} body=${JSON.stringify(body)}`
        : `status=${response.status}`;
      throw new Error(`Claude usage probe request failed: ${details}`);
    }

    return extractUsageLimitsFromRateLimitHeaders(
      toHeaderMap(response.headers)
    );
  }
}
