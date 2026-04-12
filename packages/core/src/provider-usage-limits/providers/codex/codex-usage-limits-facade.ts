import { buildProviderUsageLimitScopeKey } from "../../provider-usage-limits-scope-key";
import type {
  ProviderUsageLimitsSnapshot,
  ReadProviderUsageLimitsParams,
} from "../../provider-usage-limits-types";
import {
  CodexLiveUsageReader,
  type CodexLiveUsageReaderOptions,
} from "./codex-live-usage-reader";
import {
  CodexRolloutUsageLimitsReader,
  type CodexRolloutUsageLimitsReaderOptions,
} from "./codex-rollout-usage-limits-reader";
import { CodexUsageLimitsNormalizer } from "./codex-usage-limits-normalizer";

export type CodexUsageLimitsFacadeOptions =
  CodexRolloutUsageLimitsReaderOptions &
    CodexLiveUsageReaderOptions & {
      readonly normalizer?: CodexUsageLimitsNormalizer;
      readonly liveReader?: CodexLiveUsageReader;
      readonly rolloutReader?: CodexRolloutUsageLimitsReader;
    };

export class CodexUsageLimitsFacade {
  readonly #normalizer: CodexUsageLimitsNormalizer;
  readonly #liveReader: CodexLiveUsageReader;
  readonly #rolloutReader: CodexRolloutUsageLimitsReader;

  constructor(options: CodexUsageLimitsFacadeOptions = {}) {
    this.#normalizer = options.normalizer ?? new CodexUsageLimitsNormalizer();
    this.#liveReader =
      options.liveReader ??
      new CodexLiveUsageReader({ normalizer: this.#normalizer });
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

    const liveSnapshot = await this.#liveReader.read(params);
    if (liveSnapshot) {
      return liveSnapshot;
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
