import { ProviderUsageLimitsCache } from "./provider-usage-limits-cache";
import { ProviderUsageLimitsChangeDetector } from "./provider-usage-limits-change-detector";
import { ProviderUsageLimitsCompatAdapter } from "./provider-usage-limits-compat-adapter";
import {
  buildProviderUsageLimitsDiagnostics,
  readProviderUsageLimitsSnapshot,
} from "./provider-usage-limits-read-helpers";
import { buildProviderUsageLimitScopeKey } from "./provider-usage-limits-scope-key";
import { buildProviderUsageLimitsStreamPayload } from "./provider-usage-limits-stream-event";
import type {
  CompatibleSessionUsageLimits,
  ProviderUsageLimitProviderId,
  ProviderUsageLimitsAdapter,
  ProviderUsageLimitsDiagnostics,
  ProviderUsageLimitsReadResult,
  ProviderUsageLimitsSnapshot,
  ProviderUsageLimitsStreamPayload,
  ReadProviderUsageLimitsParams,
} from "./provider-usage-limits-types";

const DEFAULT_MIN_REFRESH_INTERVAL_MS = 1500;

interface ProviderUsageLimitsReader {
  read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null>;
}

interface ProviderUsageLimitsReporter {
  readonly info?: (message: string) => void;
  readonly warn?: (message: string) => void;
}

export interface ProviderUsageLimitsFacadeOptions {
  readonly adapter?: ProviderUsageLimitsAdapter;
  readonly cache?: ProviderUsageLimitsCache;
  readonly changeDetector?: ProviderUsageLimitsChangeDetector;
  readonly clock?: () => number;
  readonly minRefreshIntervalMs?: number;
  readonly readers?: Partial<
    Record<ProviderUsageLimitProviderId, ProviderUsageLimitsReader>
  >;
  readonly reporter?: ProviderUsageLimitsReporter;
}

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
    const scopeKey = this.getScopeKey({
      providerId: params.providerId,
      providerSessionId: params.providerSessionId,
    });
    const cached = this.#cache.get(scopeKey);
    if (!params.force && cached && this.#shouldUseCachedResult(scopeKey)) {
      const diagnostics = buildProviderUsageLimitsDiagnostics({
        result: "cache_hit",
        fallbackReason: "min_refresh_interval",
        source: cached.snapshot.source,
        fromCache: true,
        readerRegistered: Boolean(this.#readers[params.providerId]),
        force: false,
      });
      this.#reporter?.info?.(
        `Provider usage limits cache hit for ${params.providerId} (${scopeKey})`
      );
      return {
        snapshot: cached.snapshot,
        compat: cached.compat,
        diagnostics,
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

  getScopeKey(params: {
    readonly providerId: ProviderUsageLimitProviderId;
    readonly providerSessionId: string | null;
  }): string {
    return buildProviderUsageLimitScopeKey(params);
  }

  getCached(params: {
    readonly providerId: ProviderUsageLimitProviderId;
    readonly providerSessionId: string | null;
  }): CompatibleSessionUsageLimits {
    const scopeKey = this.getScopeKey(params);
    return this.#cache.get(scopeKey)?.compat ?? null;
  }

  getCachedSnapshot(params: {
    readonly providerId: ProviderUsageLimitProviderId;
    readonly providerSessionId: string | null;
  }): ProviderUsageLimitsSnapshot | null {
    const scopeKey = this.getScopeKey(params);
    return this.#cache.get(scopeKey)?.snapshot ?? null;
  }

  getCachedStreamPayload(params: {
    readonly providerId: ProviderUsageLimitProviderId;
    readonly providerSessionId: string | null;
  }): ProviderUsageLimitsStreamPayload | null {
    const scopeKey = this.getScopeKey(params);
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
    const scopeKey = this.getScopeKey({
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

    const cached = this.#cache.get(scopeKey);
    const reader = this.#readers[params.providerId];
    if (!reader) {
      return this.#buildFallbackResult({
        cached,
        fallbackReason: "reader_missing",
        force: Boolean(params.force),
        providerId: params.providerId,
        readerRegistered: false,
        scopeKey,
      });
    }

    const { snapshot, readFailed } = await readProviderUsageLimitsSnapshot({
      reader,
      readParams: params,
      onReadFailed: (message) =>
        this.#reporter?.warn?.(
          `Provider usage limits read failed for ${params.providerId}: ${message}`
        ),
    });
    if (!snapshot) {
      return this.#buildFallbackResult({
        cached,
        fallbackReason: readFailed ? "read_failed" : "snapshot_unavailable",
        force: Boolean(params.force),
        providerId: params.providerId,
        readerRegistered: true,
        scopeKey,
      });
    }

    return this.#buildFreshReadResult(scopeKey, cached, snapshot, params);
  }

  #buildFreshReadResult(
    scopeKey: string,
    cached: ReturnType<ProviderUsageLimitsCache["get"]>,
    snapshot: ProviderUsageLimitsSnapshot,
    params: ReadProviderUsageLimitsParams
  ): ProviderUsageLimitsReadResult {
    const compat = this.#adapter.toCompat(snapshot);
    const changed =
      !cached || this.#changeDetector.hasChanged(cached.snapshot, snapshot);
    if (changed) {
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
      diagnostics: buildProviderUsageLimitsDiagnostics({
        result: "fresh_read",
        source: snapshot.source,
        fromCache: false,
        readerRegistered: true,
        force: Boolean(params.force),
        changed,
      }),
    };
  }

  #buildFallbackResult(params: {
    readonly cached: ReturnType<ProviderUsageLimitsCache["get"]>;
    readonly fallbackReason: NonNullable<
      ProviderUsageLimitsDiagnostics["fallbackReason"]
    >;
    readonly force: boolean;
    readonly providerId: ProviderUsageLimitProviderId;
    readonly readerRegistered: boolean;
    readonly scopeKey: string;
  }): ProviderUsageLimitsReadResult {
    if (params.readerRegistered) {
      this.#reporter?.info?.(
        `Provider usage limits fallback for ${params.providerId} (${params.scopeKey})`
      );
    } else {
      this.#reporter?.warn?.(
        `Provider usage limits reader is not registered for ${params.providerId}`
      );
    }

    return {
      snapshot: params.cached?.snapshot ?? null,
      compat: params.cached?.compat ?? null,
      diagnostics: buildProviderUsageLimitsDiagnostics({
        result: params.cached ? "fallback_cached" : "unavailable",
        fallbackReason: params.fallbackReason,
        source: params.cached?.snapshot.source ?? null,
        fromCache: Boolean(params.cached),
        readerRegistered: params.readerRegistered,
        force: params.force,
      }),
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
