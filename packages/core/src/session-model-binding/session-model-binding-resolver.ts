import type {
  ProviderTurnConfigResolverOptions,
  ResolvedProviderEffectiveModelIdentity,
} from "../config/provider-turn-config-resolver";
import {
  resolveProviderEffectiveModelIdentity,
  resolveProviderTurnConfigEntry,
} from "../config/provider-turn-config-resolver";
import type { SessionModelBindingFacade } from "./session-model-binding-facade";
import type {
  SessionModelBinding,
  SessionModelBindingKey,
  SessionModelBindingSource,
} from "./session-model-binding-types";

export interface SessionModelBindingResolverOptions {
  readonly facade: SessionModelBindingFacade;
  readonly providerTurnConfig: ProviderTurnConfigResolverOptions;
}

export class SessionModelBindingResolver {
  readonly #facade: SessionModelBindingFacade;
  readonly #providerTurnConfig: ProviderTurnConfigResolverOptions;

  constructor(options: SessionModelBindingResolverOptions) {
    this.#facade = options.facade;
    this.#providerTurnConfig = options.providerTurnConfig;
  }

  bindFromExplicitSelection(
    options: SessionModelBindingKey & {
      readonly source?: Extract<
        SessionModelBindingSource,
        "start_step_selection" | "switch_request"
      >;
      readonly targetModelId: string;
    }
  ): SessionModelBinding | null {
    return this.resolveAndStore({
      key: options,
      source: options.source ?? "start_step_selection",
      targetModelId: options.targetModelId,
    });
  }

  bindFromSettingsDefault(
    options: SessionModelBindingKey
  ): SessionModelBinding | null {
    return this.resolveAndStore({
      key: options,
      source: "settings_default",
    });
  }

  backfillFromSettingsDefault(
    options: SessionModelBindingKey
  ): SessionModelBinding | null {
    return this.resolveAndStore({
      key: options,
      source: "legacy_backfill",
    });
  }

  private resolveAndStore(options: {
    readonly key: SessionModelBindingKey;
    readonly source: SessionModelBindingSource;
    readonly targetModelId?: string;
  }): SessionModelBinding | null {
    const identity = this.resolveIdentity({
      providerId: options.key.providerId,
      targetModelId: options.targetModelId,
    });
    if (!identity) {
      return null;
    }

    return this.#facade.updateBinding({
      ...options.key,
      ...identity,
      source: options.source,
    });
  }

  private resolveIdentity(options: {
    readonly providerId: string;
    readonly targetModelId?: string;
  }): ResolvedProviderEffectiveModelIdentity | null {
    const resolved = resolveProviderTurnConfigEntry({
      ...this.#providerTurnConfig,
      providerId: options.providerId,
    });
    if (!resolved) {
      return null;
    }

    return resolveProviderEffectiveModelIdentity({
      providerId: options.providerId,
      resolved,
      targetModelId: options.targetModelId,
    });
  }
}
