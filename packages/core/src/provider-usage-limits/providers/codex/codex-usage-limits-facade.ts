import { buildProviderUsageLimitScopeKey } from "../../provider-usage-limits-scope-key";
import type {
  ProviderUsageLimitsSnapshot,
  ReadProviderUsageLimitsParams,
} from "../../provider-usage-limits-types";
import {
  CodexRolloutUsageLimitsReader,
  type CodexRolloutUsageLimitsReaderOptions,
} from "./codex-rollout-usage-limits-reader";
import { CodexUsageLimitsNormalizer } from "./codex-usage-limits-normalizer";

export type CodexUsageLimitsFacadeOptions =
  CodexRolloutUsageLimitsReaderOptions & {
    readonly normalizer?: CodexUsageLimitsNormalizer;
    readonly rolloutReader?: CodexRolloutUsageLimitsReader;
  };

export class CodexUsageLimitsFacade {
  readonly #normalizer: CodexUsageLimitsNormalizer;
  readonly #rolloutReader: CodexRolloutUsageLimitsReader;

  constructor(options: CodexUsageLimitsFacadeOptions = {}) {
    this.#normalizer = options.normalizer ?? new CodexUsageLimitsNormalizer();
    this.#rolloutReader =
      options.rolloutReader ??
      new CodexRolloutUsageLimitsReader({
        codexHome: options.codexHome,
      });
  }

  async read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null> {
    if (params.providerId !== "codex" || !params.providerSessionId?.trim()) {
      return null;
    }

    const snapshot = await this.#rolloutReader.read(params.providerSessionId);
    if (!snapshot) {
      return null;
    }

    return this.#normalizer.normalize({
      providerScopeKey: this.#buildScopeKey(params.providerSessionId),
      snapshot,
      source: "codex_rollout_fallback",
    });
  }

  #buildScopeKey(providerSessionId: string): string {
    return buildProviderUsageLimitScopeKey({
      providerId: "codex",
      providerSessionId,
    });
  }
}

export const createCodexUsageLimitsReader = (
  facade: CodexUsageLimitsFacade = new CodexUsageLimitsFacade()
): {
  read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null>;
} => ({
  read: async (params) => await facade.read(params),
});
