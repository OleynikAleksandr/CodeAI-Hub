import { buildProviderUsageLimitScopeKey } from "../../provider-usage-limits-scope-key";
import type {
  ProviderUsageLimitsSnapshot,
  ReadProviderUsageLimitsParams,
} from "../../provider-usage-limits-types";
import {
  CodexUsageLimitsNormalizer,
  extractCodexUsageLimitsSnapshotFromRateLimits,
} from "./codex-usage-limits-normalizer";

export const CODEAI_CODEX_RATE_LIMITS_PAYLOAD_ENV_KEY =
  "CODEAI_CODEX_RATE_LIMITS_PAYLOAD";

type CodexRuntimePayload = {
  readonly collectedAt?: string;
  readonly rateLimits?: unknown;
  readonly rate_limits?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseRuntimePayload = (
  value: string | null | undefined
): CodexRuntimePayload | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    return parsed as CodexRuntimePayload;
  } catch {
    return null;
  }
};

export type CodexRpcUsageLimitsReaderOptions = {
  readonly envKey?: string;
  readonly normalizer?: CodexUsageLimitsNormalizer;
};

export class CodexRpcUsageLimitsReader {
  readonly #envKey: string;
  readonly #normalizer: CodexUsageLimitsNormalizer;

  constructor(options: CodexRpcUsageLimitsReaderOptions = {}) {
    this.#envKey = options.envKey ?? CODEAI_CODEX_RATE_LIMITS_PAYLOAD_ENV_KEY;
    this.#normalizer = options.normalizer ?? new CodexUsageLimitsNormalizer();
  }

  read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null> {
    if (params.providerId !== "codex" || !params.providerSessionId?.trim()) {
      return Promise.resolve(null);
    }

    const runtimePayload = parseRuntimePayload(
      params.environment?.[this.#envKey] ?? process.env[this.#envKey]
    );
    if (!runtimePayload) {
      return Promise.resolve(null);
    }

    const snapshot = extractCodexUsageLimitsSnapshotFromRateLimits({
      collectedAt: runtimePayload.collectedAt ?? null,
      rateLimits: runtimePayload.rateLimits ?? runtimePayload.rate_limits,
    });
    if (!snapshot) {
      return Promise.resolve(null);
    }

    return Promise.resolve(
      this.#normalizer.normalize({
        providerScopeKey: buildProviderUsageLimitScopeKey({
          providerId: "codex",
          providerSessionId: params.providerSessionId,
        }),
        snapshot,
        source: "codex_rpc",
      })
    );
  }
}
