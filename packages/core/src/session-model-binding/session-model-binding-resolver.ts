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
  readonly settingsPathResolver?: (
    key: SessionModelBindingKey
  ) => string | null | undefined;
}

export class SessionModelBindingResolver {
  readonly #facade: SessionModelBindingFacade;
  readonly #providerTurnConfig: ProviderTurnConfigResolverOptions;
  readonly #settingsPathResolver:
    | ((key: SessionModelBindingKey) => string | null | undefined)
    | undefined;

  constructor(options: SessionModelBindingResolverOptions) {
    this.#facade = options.facade;
    this.#providerTurnConfig = options.providerTurnConfig;
    this.#settingsPathResolver = options.settingsPathResolver;
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

  inheritBinding(
    options: SessionModelBindingKey & {
      readonly sourceBinding: SessionModelBinding;
    }
  ): SessionModelBinding {
    const binding = this.#facade.updateBinding({
      providerId: options.providerId,
      sessionId: options.sessionId,
      continuityRootId: options.continuityRootId,
      dialogId: options.dialogId,
      workspacePath: options.workspacePath,
      workspaceSlug: options.workspaceSlug,
      initiativeSlug: options.initiativeSlug,
      stage: options.stage,
      runSlug: options.runSlug,
      baseModelId: options.sourceBinding.baseModelId,
      modelId: options.sourceBinding.modelId,
      reasoningEffort: options.sourceBinding.reasoningEffort,
      thinkingEnabled: options.sourceBinding.thinkingEnabled,
      thinkingLevel: options.sourceBinding.thinkingLevel,
      source: "continuity_inherited",
    });
    return this.attachSettingsPath(binding, options.sourceBinding.settingsPath);
  }

  private resolveAndStore(options: {
    readonly key: SessionModelBindingKey;
    readonly source: SessionModelBindingSource;
    readonly targetModelId?: string;
  }): SessionModelBinding | null {
    const settingsPath = this.resolveSettingsPath(options.key);
    const identity = this.resolveIdentity({
      providerId: options.key.providerId,
      settingsPath,
      targetModelId: options.targetModelId,
    });
    if (!identity) {
      return null;
    }

    return this.attachSettingsPath(
      this.#facade.updateBinding({
        ...options.key,
        ...identity,
        source: options.source,
      }),
      settingsPath
    );
  }

  private resolveIdentity(options: {
    readonly providerId: string;
    readonly settingsPath: string;
    readonly targetModelId?: string;
  }): ResolvedProviderEffectiveModelIdentity | null {
    const resolved = resolveProviderTurnConfigEntry({
      ...this.#providerTurnConfig,
      providerId: options.providerId,
      settingsPath: options.settingsPath,
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

  private resolveSettingsPath(key: SessionModelBindingKey): string {
    return (
      this.#settingsPathResolver?.(key) ?? this.#providerTurnConfig.settingsPath
    );
  }

  private attachSettingsPath(
    binding: SessionModelBinding,
    settingsPath: string | null | undefined
  ): SessionModelBinding {
    return settingsPath ? { ...binding, settingsPath } : binding;
  }
}
