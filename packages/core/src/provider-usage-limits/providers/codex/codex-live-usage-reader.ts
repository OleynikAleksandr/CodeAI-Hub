import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { buildProviderUsageLimitScopeKey } from "../../provider-usage-limits-scope-key";
import type {
  ProviderUsageLimitsSnapshot,
  ReadProviderUsageLimitsParams,
} from "../../provider-usage-limits-types";
import { CodexUsageLimitsNormalizer } from "./codex-usage-limits-normalizer";

const CHATGPT_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const DEFAULT_TIMEOUT_MS = 10_000;
const AUTH_FILE = "auth.json";
const DEFAULT_CODEX_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "codex",
  "home"
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const clampPercent = (value: number): number => {
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value);
};

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
};

const resolveCodexHome = (): string =>
  process.env.CODEX_HOME?.trim() || DEFAULT_CODEX_HOME;

const readAccessToken = async (codexHome: string): Promise<string | null> => {
  try {
    const raw = await readFile(path.join(codexHome, AUTH_FILE), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    const tokens = isRecord(parsed.tokens) ? parsed.tokens : null;
    if (!tokens) {
      return null;
    }
    const accessToken =
      typeof tokens.access_token === "string"
        ? tokens.access_token.trim()
        : null;
    return accessToken || null;
  } catch {
    return null;
  }
};

const normalizeResetAt = (value: unknown): string | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const epochMs = value >= 1_000_000_000_000 ? value : value * 1000;
  const date = new Date(epochMs);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const parseWindow = (
  value: unknown
): {
  readonly percentUsed: number;
  readonly resetsAt: string | null;
} | null => {
  if (!isRecord(value)) {
    return null;
  }
  const usedPercent = readNumber(value.used_percent);
  if (usedPercent === null) {
    return null;
  }
  return {
    percentUsed: clampPercent(usedPercent),
    resetsAt: normalizeResetAt(value.reset_at),
  };
};

export interface CodexLiveUsageReaderOptions {
  readonly normalizer?: CodexUsageLimitsNormalizer;
  readonly timeoutMs?: number;
}

export class CodexLiveUsageReader {
  readonly #normalizer: CodexUsageLimitsNormalizer;
  readonly #timeoutMs: number;

  constructor(options: CodexLiveUsageReaderOptions = {}) {
    this.#normalizer = options.normalizer ?? new CodexUsageLimitsNormalizer();
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null> {
    if (params.providerId !== "codex") {
      return null;
    }

    const codexHome = resolveCodexHome();
    const accessToken = await readAccessToken(codexHome);
    if (!accessToken) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.#timeoutMs);

    let body: unknown;
    try {
      const response = await fetch(CHATGPT_USAGE_URL, {
        method: "GET",
        headers: { authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        return null;
      }
      body = (await response.json()) as unknown;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }

    return this.#parseUsageResponse(body, params.providerSessionId);
  }

  #parseUsageResponse(
    body: unknown,
    providerSessionId: string | null
  ): ProviderUsageLimitsSnapshot | null {
    if (!isRecord(body)) {
      return null;
    }
    const rateLimit = isRecord(body.rate_limit) ? body.rate_limit : null;
    if (!rateLimit) {
      return null;
    }

    const primaryWindow = parseWindow(rateLimit.primary_window);
    const secondaryWindow = parseWindow(rateLimit.secondary_window);
    if (!(primaryWindow || secondaryWindow)) {
      return null;
    }

    return this.#normalizer.normalize({
      providerScopeKey: buildProviderUsageLimitScopeKey({
        providerId: "codex",
        providerSessionId,
      }),
      snapshot: {
        collectedAt: new Date().toISOString(),
        currentSession: primaryWindow,
        currentWeekAllModels: secondaryWindow,
        currentWeekSonnetOnly: null,
      },
      source: "codex_live",
    });
  }
}
