import type {
  ProviderUsageLimitsSnapshot,
  ReadProviderUsageLimitsParams,
} from "../../provider-usage-limits-types";
import {
  GeminiQuotaApiUsageLimitsReader,
  type GeminiQuotaApiUsageLimitsReaderOptions,
} from "./gemini-quota-api-reader";
import { GeminiUsageLimitsNormalizer } from "./gemini-usage-limits-normalizer";

export type GeminiUsageLimitsFacadeOptions =
  GeminiQuotaApiUsageLimitsReaderOptions & {
    readonly normalizer?: GeminiUsageLimitsNormalizer;
    readonly quotaApiReader?: GeminiQuotaApiUsageLimitsReader;
  };

export class GeminiUsageLimitsFacade {
  readonly #quotaApiReader: GeminiQuotaApiUsageLimitsReader;

  constructor(options: GeminiUsageLimitsFacadeOptions = {}) {
    const normalizer = options.normalizer ?? new GeminiUsageLimitsNormalizer();
    this.#quotaApiReader =
      options.quotaApiReader ??
      new GeminiQuotaApiUsageLimitsReader({
        normalizer,
      });
  }

  async read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null> {
    if (params.providerId !== "gemini") {
      return null;
    }

    return await this.#quotaApiReader.read(params);
  }
}

export const createGeminiUsageLimitsReader = (
  facade: GeminiUsageLimitsFacade = new GeminiUsageLimitsFacade()
): {
  read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null>;
} => ({
  read: async (params) => await facade.read(params),
});
