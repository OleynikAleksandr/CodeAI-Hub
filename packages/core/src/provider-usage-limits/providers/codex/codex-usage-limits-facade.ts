import { buildProviderUsageLimitScopeKey } from "../../provider-usage-limits-scope-key";
import type {
  ProviderUsageLimitsSnapshot,
  ReadProviderUsageLimitsParams,
} from "../../provider-usage-limits-types";
import {
  CodexRolloutUsageLimitsReader,
  type CodexRolloutUsageLimitsReaderOptions,
} from "./codex-rollout-usage-limits-reader";
import {
  CodexRpcUsageLimitsReader,
  type CodexRpcUsageLimitsReaderOptions,
} from "./codex-rpc-usage-limits-reader";
import { CodexUsageLimitsNormalizer } from "./codex-usage-limits-normalizer";

export type CodexUsageLimitsFacadeOptions =
  CodexRolloutUsageLimitsReaderOptions &
    CodexRpcUsageLimitsReaderOptions & {
      readonly normalizer?: CodexUsageLimitsNormalizer;
      readonly rpcReader?: CodexRpcUsageLimitsReader;
      readonly rolloutReader?: CodexRolloutUsageLimitsReader;
    };

export class CodexUsageLimitsFacade {
  readonly #normalizer: CodexUsageLimitsNormalizer;
  readonly #rpcReader: CodexRpcUsageLimitsReader;
  readonly #rolloutReader: CodexRolloutUsageLimitsReader;

  constructor(options: CodexUsageLimitsFacadeOptions = {}) {
    this.#normalizer = options.normalizer ?? new CodexUsageLimitsNormalizer();
    this.#rpcReader =
      options.rpcReader ??
      new CodexRpcUsageLimitsReader({
        envKey: options.envKey,
        normalizer: this.#normalizer,
      });
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

    const runtimeSnapshot = await this.#rpcReader.read(params);
    if (runtimeSnapshot) {
      return runtimeSnapshot;
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
