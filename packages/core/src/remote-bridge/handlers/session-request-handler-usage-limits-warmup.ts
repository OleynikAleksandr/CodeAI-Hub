import type { Logger } from "../../telemetry/logger";
import type { UsageTelemetryLifecycleTrigger } from "./session-provider-binding-service";

// Providers for which a usage-limits warmup probe has already been
// dispatched during this Core process lifetime. Kept account-wide (by
// providerId) because rate limits are account-wide for all three
// providers, so one successful probe naturally populates the shared
// cache (providerScopeKey = `${providerId}:global`). Subsequent
// binding_ready triggers for the same provider skip the dispatch and
// rely on cached replay — this avoids the previous "one HTTP probe per
// reopened dialog" storm and the race between paper-binding and
// provider hydration. Reset is implicit: the Set lives with the
// SessionRequestHandler instance and vanishes on Core restart.

export class UsageLimitsWarmupTracker {
  private readonly warmedProviders = new Set<string>();

  shouldSkipDispatch(params: {
    readonly boundProviderSessionId: string | null;
    readonly lifecycleTrigger: UsageTelemetryLifecycleTrigger | null;
    readonly logger: Logger;
    readonly providerId: string;
    readonly sessionId: string;
  }): boolean {
    // Only the binding_ready trigger is deduplicated. Other triggers
    // (turn_completed, reconnect, manual, provider_session_rebound,
    // dialog_opened, session_opened) represent real state changes or
    // explicit intent and must pass through even when the provider
    // is already warmed.
    if (
      params.lifecycleTrigger === "binding_ready" &&
      this.warmedProviders.has(params.providerId)
    ) {
      params.logger.info(
        "Usage limits refresh skipped: provider already warmed",
        {
          boundProviderSessionId: params.boundProviderSessionId,
          lifecycleTrigger: params.lifecycleTrigger,
          resolvedProviderId: params.providerId,
          sessionId: params.sessionId,
        }
      );
      return true;
    }
    return false;
  }

  markWarmed(providerId: string): void {
    this.warmedProviders.add(providerId);
  }
}

// Diagnostic logs for handleRefreshUsageLimits. Kept in the helper so
// the main dispatch method stays under the 500-line architecture limit.

interface UsageLimitsRefreshDiagnosticFields {
  readonly adapterAvailable: boolean;
  readonly boundProviderSessionId: string | null;
  readonly cachedReplayAvailable: boolean;
  readonly lifecycleTrigger: UsageTelemetryLifecycleTrigger | null;
  readonly logger: Logger;
  readonly requestedProviderId: string;
  readonly requestedProviderSessionId: string | null;
  readonly resolvedProviderId: string;
  readonly runtimeSessionFound: boolean;
  readonly runtimeTurnState: string | null;
  readonly sessionId: string;
  readonly workspacePath: string | null;
}

export const logUsageLimitsRefreshReceived = (
  params: UsageLimitsRefreshDiagnosticFields
): void => {
  const { logger, ...rest } = params;
  logger.info("Usage limits refresh request received", rest);
};

export const logUsageLimitsRefreshSkipped = (params: {
  readonly adapterAvailable: boolean;
  readonly boundProviderSessionId: string | null;
  readonly cachedReplayAvailable: boolean;
  readonly lifecycleTrigger: UsageTelemetryLifecycleTrigger | null;
  readonly logger: Logger;
  readonly requestedProviderId: string;
  readonly requestedProviderSessionId: string | null;
  readonly resolvedProviderId: string;
  readonly runtimeSessionFound: boolean;
  readonly runtimeTurnState: string | null;
  readonly sessionId: string;
}): void => {
  params.logger.warn("Usage limits refresh skipped", {
    adapterAvailable: params.adapterAvailable,
    boundProviderSessionId: params.boundProviderSessionId,
    cachedReplayAvailable: params.cachedReplayAvailable,
    lifecycleTrigger: params.lifecycleTrigger,
    requestedProviderId: params.requestedProviderId,
    requestedProviderSessionId: params.requestedProviderSessionId,
    resolvedProviderId: params.resolvedProviderId,
    runtimeTurnState: params.runtimeTurnState,
    runtimeSessionFound: params.runtimeSessionFound,
    sessionId: params.sessionId,
  });
};
