/**
 * Recovery Target Resolver — determines the best recovery target
 * (provider + model) based on current failure context and stage.
 *
 * MVP uses a hardcoded fallback matrix. Future versions will use
 * a configurable routing engine from MultiProvider Orchestration.
 */

export interface RecoveryTarget {
  readonly mode: "retry_in_place" | "switch_model" | "switch_provider";
  readonly modelId: string | null;
  readonly providerId: string;
}

export interface RecoveryContext {
  readonly adapterAvailable: boolean;
  readonly canRetryInPlace: boolean;
  readonly currentProviderId: string;
  readonly providerSessionIdKnown: boolean;
  readonly stage: string | null;
}

type ProviderHealthCheck = (providerId: string) => boolean;

// MVP fallback matrix per architecture doc section 6.2
const STAGE_CROSS_PROVIDER_FALLBACK: Record<string, Record<string, string>> = {
  geminiCli: {
    description: "claudeCodeCli",
    virtual_simulation: "codexCli",
    diagram_modules: "claudeCodeCli",
  },
  claudeCodeCli: {
    description: "codexCli",
    virtual_simulation: "codexCli",
    diagram_modules: "codexCli",
  },
  codexCli: {
    description: "claudeCodeCli",
    virtual_simulation: "claudeCodeCli",
    diagram_modules: "claudeCodeCli",
  },
};

export function resolveRecoveryTargets(
  context: RecoveryContext,
  isProviderHealthy: ProviderHealthCheck
): RecoveryTarget[] {
  const targets: RecoveryTarget[] = [];

  // Priority 1: retry in place (same provider, same model)
  if (
    context.canRetryInPlace &&
    context.adapterAvailable &&
    context.providerSessionIdKnown
  ) {
    targets.push({
      providerId: context.currentProviderId,
      modelId: null,
      mode: "retry_in_place",
    });
  }

  // Priority 2: same provider, fallback model (Gemini only for MVP)
  if (context.currentProviderId === "geminiCli" && context.adapterAvailable) {
    targets.push({
      providerId: "geminiCli",
      modelId: "gemini-3-flash-preview",
      mode: "switch_model",
    });
  }

  // Priority 3: cross-provider fallback by stage
  const stageMap = STAGE_CROSS_PROVIDER_FALLBACK[context.currentProviderId];
  const stage = context.stage ?? "description";
  const fallbackProviderId = stageMap?.[stage] ?? null;

  if (fallbackProviderId && isProviderHealthy(fallbackProviderId)) {
    targets.push({
      providerId: fallbackProviderId,
      modelId: null,
      mode: "switch_provider",
    });
  }

  // Add remaining providers as last resort
  const allProviders = ["claudeCodeCli", "codexCli", "geminiCli"];
  for (const pid of allProviders) {
    if (
      pid !== context.currentProviderId &&
      pid !== fallbackProviderId &&
      isProviderHealthy(pid)
    ) {
      targets.push({
        providerId: pid,
        modelId: null,
        mode: "switch_provider",
      });
    }
  }

  return targets;
}
