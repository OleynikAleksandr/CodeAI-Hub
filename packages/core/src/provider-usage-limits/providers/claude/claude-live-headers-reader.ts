import type {
  ProviderUsageLimitSource,
  ReadProviderUsageLimitsParams,
} from "../../provider-usage-limits-types";

const TEMP_SESSION_PREFIX = "temp_";
const ANTHROPIC_MESSAGES_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_BETA = "oauth-2025-04-20";
const USAGE_PROBE_MODEL = "claude-haiku-4-5-20251001";
const USAGE_PROBE_MAX_TOKENS = 1;
const USAGE_PROBE_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BODY_CHARS = 4000;
const RATE_LIMIT_HEADER_PREFIX = "anthropic-ratelimit-unified";

export type ClaudeLiveHeadersSnapshot = {
  readonly collectedAt: string;
  readonly headers: ReadonlyMap<string, string>;
  readonly source: Extract<ProviderUsageLimitSource, "claude_probe">;
};

export type ClaudeOAuthTokenResolver = (
  environment: NodeJS.ProcessEnv | undefined
) => Promise<string | null>;

export type ClaudeLiveHeadersReaderOptions = {
  readonly now?: () => string;
  readonly resolveOAuthToken: ClaudeOAuthTokenResolver;
};

const toHeaderMap = (
  headers: Headers | ReadonlyMap<string, string>
): ReadonlyMap<string, string> => {
  if (headers instanceof Map) {
    return headers;
  }

  const normalized = new Map<string, string>();
  for (const [key, value] of headers.entries()) {
    normalized.set(key.toLowerCase(), value);
  }
  return normalized;
};

export const pickClaudeRateLimitHeaders = (
  headers: Headers | ReadonlyMap<string, string>
): ReadonlyMap<string, string> => {
  const selected = new Map<string, string>();
  for (const [key, value] of toHeaderMap(headers).entries()) {
    if (key.startsWith(RATE_LIMIT_HEADER_PREFIX)) {
      selected.set(key, value);
    }
  }
  return selected;
};

const safeReadResponseBody = async (
  response: Response
): Promise<string | null> => {
  try {
    const text = (await response.text()).trim();
    if (!text) {
      return null;
    }
    return text.length > MAX_RESPONSE_BODY_CHARS
      ? `${text.slice(0, MAX_RESPONSE_BODY_CHARS)}...`
      : text;
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

const resolveProbeSessionId = (
  params: ReadProviderUsageLimitsParams
): string | null => {
  if (params.providerId !== "claude") {
    return null;
  }

  const sessionId = params.providerSessionId?.trim();
  if (!(sessionId && !sessionId.startsWith(TEMP_SESSION_PREFIX))) {
    return null;
  }

  return sessionId;
};

export class ClaudeLiveHeadersReader {
  readonly #now: () => string;
  readonly #resolveOAuthToken: ClaudeOAuthTokenResolver;

  constructor(options: ClaudeLiveHeadersReaderOptions) {
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#resolveOAuthToken = options.resolveOAuthToken;
  }

  async read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ClaudeLiveHeadersSnapshot | null> {
    const sessionId = resolveProbeSessionId(params);
    if (!sessionId) {
      return null;
    }

    const oauthToken = await this.#resolveOAuthToken(params.environment);
    if (!oauthToken) {
      return null;
    }

    const response = await runUsageProbe(oauthToken);
    const headers = pickClaudeRateLimitHeaders(response.headers);
    if (!response.ok) {
      const body = await safeReadResponseBody(response);
      const details = body
        ? `status=${response.status} body=${JSON.stringify(body)}`
        : `status=${response.status}`;
      throw new Error(
        `Claude usage probe request failed for ${sessionId}: ${details}`
      );
    }

    return {
      collectedAt: this.#now(),
      headers,
      source: "claude_probe",
    };
  }
}
