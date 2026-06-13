import type { ProviderRegistry } from "../../provider-registry";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";
import {
  normalizeUsageLimitsStreamEvent,
  resolveCachedUsageLimitsStreamEvent,
  resolveRuntimeTurnState,
  shouldDispatchUsageLimitsRefresh,
  type UsageTelemetryLifecycleTrigger,
} from "./session-provider-binding-service";
import type { ProviderSessionBinding } from "./session-request-handler";
import {
  logUsageLimitsRefreshReceived,
  logUsageLimitsRefreshSkipped,
  type UsageLimitsWarmupTracker,
} from "./session-request-handler-usage-limits-warmup";

// handleRefreshUsageLimits flow extracted from SessionRequestHandler so the
// main handler stays under the 500-line architecture limit. Behavior matches
// the original dispatch method 1:1 — replay cached payload when available,
// dedup binding_ready through warmup tracker, dispatch once per provider,
// emit diagnostic logs.

type WorkspaceRuntimeLike = Parameters<
  typeof resolveRuntimeTurnState
>[0]["workspaceRuntime"];

export interface RefreshUsageLimitsDeps {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly logger: Logger;
  readonly providerRegistry: ProviderRegistry;
  readonly providerSessions: Map<string, ProviderSessionBinding>;
  readonly sessionManager: SessionManager;
  readonly usageLimitsWarmup: UsageLimitsWarmupTracker;
  readonly workspaceRuntime?: WorkspaceRuntimeLike;
}

export const handleRefreshUsageLimitsFlow = async (params: {
  readonly deps: RefreshUsageLimitsDeps;
  readonly lifecycleTrigger?: UsageTelemetryLifecycleTrigger | null;
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly sessionId: string;
}): Promise<void> => {
  const { deps } = params;
  const session = deps.sessionManager.getSession(params.sessionId);
  const resolvedProviderId = session?.providerId ?? params.providerId;
  const adapter = deps.providerRegistry.getAdapter(resolvedProviderId);
  const boundProviderSessionId =
    params.providerSessionId?.trim() ||
    deps.providerSessions.get(params.sessionId)?.providerSessionId ||
    session?.providerSessionId ||
    null;
  const lifecycleTrigger = params.lifecycleTrigger ?? null;
  const runtimeTurnState = session
    ? resolveRuntimeTurnState({
        session,
        workspaceRuntime: deps.workspaceRuntime,
      })
    : null;
  const cachedReplayEvent = boundProviderSessionId
    ? resolveCachedUsageLimitsStreamEvent({
        adapter,
        providerSessionId: boundProviderSessionId,
      })
    : null;
  const canDispatchProviderRefresh = lifecycleTrigger !== "dialog_opened";
  const shouldDispatchRefresh =
    canDispatchProviderRefresh &&
    shouldDispatchUsageLimitsRefresh({
      cachedReplayAvailable: Boolean(cachedReplayEvent),
      lifecycleTrigger,
      runtimeTurnState,
    });
  logUsageLimitsRefreshReceived({
    adapterAvailable: typeof adapter?.refreshUsageLimits === "function",
    boundProviderSessionId,
    cachedReplayAvailable: Boolean(cachedReplayEvent),
    lifecycleTrigger,
    logger: deps.logger,
    requestedProviderId: params.providerId,
    requestedProviderSessionId: params.providerSessionId,
    resolvedProviderId,
    runtimeSessionFound: Boolean(session),
    runtimeTurnState,
    sessionId: params.sessionId,
    workspacePath: session?.workspacePath ?? null,
  });
  if (session && cachedReplayEvent) {
    deps.broadcaster({
      type: "session:stream",
      payload: { sessionId: params.sessionId, event: cachedReplayEvent },
    });
    if (!shouldDispatchRefresh) {
      deps.logger.info("Usage limits replayed from cached snapshot", {
        boundProviderSessionId,
        lifecycleTrigger,
        resolvedProviderId,
        runtimeTurnState,
        sessionId: params.sessionId,
        workspacePath: session.workspacePath,
      });
      return;
    }
  }
  if (
    session &&
    boundProviderSessionId &&
    typeof adapter?.refreshUsageLimits === "function" &&
    shouldDispatchRefresh
  ) {
    if (
      deps.usageLimitsWarmup.shouldSkipDispatch({
        boundProviderSessionId,
        lifecycleTrigger,
        logger: deps.logger,
        providerId: resolvedProviderId,
        sessionId: params.sessionId,
      })
    ) {
      return;
    }
    let didBroadcastUsageLimits = false;
    const broadcast = (event: unknown): void => {
      const normalizedEvent = normalizeUsageLimitsStreamEvent({
        event,
        providerSessionId: boundProviderSessionId,
      });
      if (!normalizedEvent) {
        return;
      }
      didBroadcastUsageLimits = true;
      deps.broadcaster({
        type: "session:stream",
        payload: { sessionId: params.sessionId, event: normalizedEvent },
      });
    };
    await adapter.refreshUsageLimits({
      broadcast,
      providerSessionId: boundProviderSessionId,
      runtimeSessionId: params.sessionId,
      workspacePath: session.workspacePath,
    });
    if (didBroadcastUsageLimits) {
      deps.usageLimitsWarmup.markWarmed(resolvedProviderId);
    }
    deps.logger.info("Usage limits refresh dispatched to adapter", {
      didBroadcastUsageLimits,
      providerSessionId: boundProviderSessionId,
      lifecycleTrigger,
      resolvedProviderId,
      sessionId: params.sessionId,
      workspacePath: session.workspacePath,
    });
    return;
  }
  logUsageLimitsRefreshSkipped({
    adapterAvailable: typeof adapter?.refreshUsageLimits === "function",
    boundProviderSessionId,
    cachedReplayAvailable: Boolean(cachedReplayEvent),
    lifecycleTrigger,
    logger: deps.logger,
    requestedProviderId: params.providerId,
    requestedProviderSessionId: params.providerSessionId,
    resolvedProviderId,
    runtimeSessionFound: Boolean(session),
    runtimeTurnState,
    sessionId: params.sessionId,
  });
};
