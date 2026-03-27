import type {
  CompatibleSessionUsageLimits,
  ProviderUsageLimitsSnapshot,
} from "./provider-usage-limits-types";

export interface ProviderUsageLimitsCacheEntry {
  readonly cachedAt: number;
  readonly compat: CompatibleSessionUsageLimits;
  readonly snapshot: ProviderUsageLimitsSnapshot;
}

export class ProviderUsageLimitsCache {
  readonly #entries = new Map<string, ProviderUsageLimitsCacheEntry>();

  get(scopeKey: string): ProviderUsageLimitsCacheEntry | null {
    return this.#entries.get(scopeKey) ?? null;
  }

  set(scopeKey: string, entry: ProviderUsageLimitsCacheEntry): void {
    this.#entries.set(scopeKey, entry);
  }

  delete(scopeKey: string): void {
    this.#entries.delete(scopeKey);
  }

  clear(): void {
    this.#entries.clear();
  }
}
