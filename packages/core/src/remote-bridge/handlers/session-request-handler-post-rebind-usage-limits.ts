import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";
import { normalizeUsageLimitsStreamEvent } from "./session-provider-binding-service";

// After a successful stale-binding rebind (invalidate → ensureSessionReady →
// resend) the provider adapter now holds a freshly hydrated session, but PM
// will not emit a second binding_ready usage_limits refresh for the same
// logical session — the one it emitted before the rebind raced against the
// paper-binding and its payload was dropped. Trigger one refresh directly
// so the usage_limits widget catches up for Claude / Codex / Kimi. Best-
// effort: adapter without refreshUsageLimits (or a null payload) is OK.

export interface PostRebindUsageLimitsAdapter {
  readonly refreshUsageLimits?: (params: {
    readonly broadcast: (event: unknown) => void;
    readonly providerSessionId: string;
    readonly runtimeSessionId: string;
    readonly workspacePath: string;
  }) => unknown;
}

export const triggerPostRebindUsageLimitsRefresh = (params: {
  readonly adapter: PostRebindUsageLimitsAdapter;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly logger: Logger;
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly session: Session;
  readonly sessionId: string;
}): void => {
  const refresh = params.adapter.refreshUsageLimits;
  if (typeof refresh !== "function") {
    return;
  }
  const broadcast = (event: unknown): void => {
    const normalizedEvent = normalizeUsageLimitsStreamEvent({
      event,
      providerSessionId: params.providerSessionId,
    });
    if (!normalizedEvent) {
      return;
    }
    params.broadcaster({
      type: "session:stream",
      payload: { sessionId: params.sessionId, event: normalizedEvent },
    });
  };
  try {
    refresh.call(params.adapter, {
      broadcast,
      providerSessionId: params.providerSessionId,
      runtimeSessionId: params.sessionId,
      workspacePath: params.session.workspacePath,
    });
    params.logger.info("Post-rebind usage limits refresh dispatched", {
      sessionId: params.sessionId,
      providerId: params.providerId,
      providerSessionId: params.providerSessionId,
    });
  } catch (error) {
    params.logger.warn("Post-rebind usage limits refresh failed to start", {
      sessionId: params.sessionId,
      providerId: params.providerId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
