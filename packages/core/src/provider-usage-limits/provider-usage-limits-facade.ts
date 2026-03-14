import { ProviderUsageLimitsCache } from "./provider-usage-limits-cache";
import { ProviderUsageLimitsChangeDetector } from "./provider-usage-limits-change-detector";
import { ProviderUsageLimitsCompatAdapter } from "./provider-usage-limits-compat-adapter";
import { buildProviderUsageLimitScopeKey } from "./provider-usage-limits-scope-key";
import { buildProviderUsageLimitsStreamPayload } from "./provider-usage-limits-stream-event";
import type {
  CompatibleSessionUsageLimits,
  ProviderUsageLimitProviderId,
  ProviderUsageLimitsAdapter,
  ProviderUsageLimitsReadResult,
  ProviderUsageLimitsSnapshot,
  ProviderUsageLimitsStreamPayload,
  ReadProviderUsageLimitsParams,
} from "./provider-usage-limits-types";

const DEFAULT_MIN_REFRESH_INTERVAL_MS = 1500;

type ProviderUsageLimitsReader = {
  read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null>;
};

type ProviderUsageLimitsReporter = {
  readonly warn?: (message: string) => void;
};

export type ProviderUsageLimitsFacadeOptions = {
  readonly adapter?: ProviderUsageLimitsAdapter;
  readonly cache?: ProviderUsageLimitsCache;
  readonly changeDetector?: ProviderUsageLimitsChangeDetector;
  readonly clock?: () => number;
  readonly minRefreshIntervalMs?: number;
  readonly readers?: Partial<
    Record<ProviderUsageLimitProviderId, ProviderUsageLimitsReader>
  >;
  readonly reporter?: ProviderUsageLimitsReporter;
};

export class ProviderUsageLimitsFacade {
  readonly #adapter: ProviderUsageLimitsAdapter;
  readonly #cache: ProviderUsageLimitsCache;
  readonly #changeDetector: ProviderUsageLimitsChangeDetector;
  readonly #clock: () => number;
  readonly #minRefreshIntervalMs: number;
  readonly #readers: Partial<
    Record<ProviderUsageLimitProviderId, ProviderUsageLimitsReader>
  >;
  readonly #reporter?: ProviderUsageLimitsReporter;
  readonly #inFlight = new Map<
    string,
    Promise<ProviderUsageLimitsReadResult>
  >();
  readonly #lastAttemptAt = new Map<string, number>();

  constructor(options: ProviderUsageLimitsFacadeOptions = {}) {
    this.#adapter = options.adapter ?? new ProviderUsageLimitsCompatAdapter();
    this.#cache = options.cache ?? new ProviderUsageLimitsCache();
    this.#changeDetector =
      options.changeDetector ?? new ProviderUsageLimitsChangeDetector();
    this.#clock = options.clock ?? (() => Date.now());
    this.#minRefreshIntervalMs =
      options.minRefreshIntervalMs ?? DEFAULT_MIN_REFRESH_INTERVAL_MS;
    this.#readers = options.readers ?? {};
    this.#reporter = options.reporter;
  }

  async read(
    params: ReadProviderUsageLimitsParams
  ): Promise<CompatibleSessionUsageLimits> {
    const result = await this.readDetailed(params);
    return result.compat;
  }

  async readDetailed(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsReadResult> {
    const scopeKey = buildProviderUsageLimitScopeKey({
      providerId: params.providerId,
      providerSessionId: params.providerSessionId,
    });
    const cached = this.#cache.get(scopeKey);
    if (!params.force && cached && this.#shouldUseCachedResult(scopeKey)) {
      return {
        snapshot: cached.snapshot,
        compat: cached.compat,
      };
    }

    const inFlight = this.#inFlight.get(scopeKey);
    if (inFlight) {
      return await inFlight;
    }

    const readPromise = this.#performRead(scopeKey, params);
    this.#inFlight.set(scopeKey, readPromise);
    try {
      return await readPromise;
    } finally {
      this.#inFlight.delete(scopeKey);
    }
  }

  async readStreamPayload(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsStreamPayload | null> {
    const result = await this.readDetailed(params);
    return buildProviderUsageLimitsStreamPayload(result);
  }

  getCached(params: {
    readonly providerId: ProviderUsageLimitProviderId;
    readonly providerSessionId: string | null;
  }): CompatibleSessionUsageLimits {
    const scopeKey = buildProviderUsageLimitScopeKey(params);
    return this.#cache.get(scopeKey)?.compat ?? null;
  }

  getCachedSnapshot(params: {
    readonly providerId: ProviderUsageLimitProviderId;
    readonly providerSessionId: string | null;
  }): ProviderUsageLimitsSnapshot | null {
    const scopeKey = buildProviderUsageLimitScopeKey(params);
    return this.#cache.get(scopeKey)?.snapshot ?? null;
  }

  getCachedStreamPayload(params: {
    readonly providerId: ProviderUsageLimitProviderId;
    readonly providerSessionId: string | null;
  }): ProviderUsageLimitsStreamPayload | null {
    const scopeKey = buildProviderUsageLimitScopeKey(params);
    const cached = this.#cache.get(scopeKey);
    if (!cached) {
      return null;
    }

    return buildProviderUsageLimitsStreamPayload({
      snapshot: cached.snapshot,
      compat: cached.compat,
    });
  }

  clearScope(
    providerId: ProviderUsageLimitProviderId,
    providerSessionId: string | null
  ): void {
    const scopeKey = buildProviderUsageLimitScopeKey({
      providerId,
      providerSessionId,
    });
    this.#cache.delete(scopeKey);
    this.#lastAttemptAt.delete(scopeKey);
    this.#inFlight.delete(scopeKey);
  }

  async #performRead(
    scopeKey: string,
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsReadResult> {
    this.#lastAttemptAt.set(scopeKey, this.#clock());

    const reader = this.#readers[params.providerId];
    const cached = this.#cache.get(scopeKey);
    if (!reader) {
      this.#reporter?.warn?.(
        `Provider usage limits reader is not registered for ${params.providerId}`
      );
      return {
        snapshot: cached?.snapshot ?? null,
        compat: cached?.compat ?? null,
      };
    }

    const snapshot = await reader.read(params).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.#reporter?.warn?.(
        `Provider usage limits read failed for ${params.providerId}: ${message}`
      );
      return null;
    });

    if (!snapshot) {
      return {
        snapshot: cached?.snapshot ?? null,
        compat: cached?.compat ?? null,
      };
    }

    const compat = this.#adapter.toCompat(snapshot);
    if (!cached || this.#changeDetector.hasChanged(cached.snapshot, snapshot)) {
      this.#cache.set(scopeKey, {
        snapshot,
        compat,
        cachedAt: this.#clock(),
      });
    }

    const nextEntry = this.#cache.get(scopeKey);
    return {
      snapshot: nextEntry?.snapshot ?? snapshot,
      compat: nextEntry?.compat ?? compat,
    };
  }

  #shouldUseCachedResult(scopeKey: string): boolean {
    const lastAttemptAt = this.#lastAttemptAt.get(scopeKey);
    if (!lastAttemptAt) {
      return false;
    }

    return this.#clock() - lastAttemptAt < this.#minRefreshIntervalMs;
  }
}
