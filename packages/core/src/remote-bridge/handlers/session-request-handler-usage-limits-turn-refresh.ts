// Refresh provider usage limits after every completed turn. The only production
// refresh trigger is binding_ready, which can race provider runtime startup (and
// the warmup tracker dedups it after the first "unavailable" broadcast). The
// turn_completed trigger fires once the runtime is ready and is never suppressed
// by warmup, so it is the reliable trigger for providers like Kimi. Provider and
// session ids resolve inside handleRefreshUsageLimitsFlow from the session manager.

interface UsageRefreshTurnHost {
  handleRefreshUsageLimits(params: {
    readonly lifecycleTrigger?: "turn_completed";
    readonly providerId: string;
    readonly providerSessionId: string | null;
    readonly sessionId: string;
  }): Promise<void>;
}

export const createUsageRefreshTurnHook =
  (
    host: UsageRefreshTurnHost,
    forward: ((sessionId: string) => void) | undefined
  ): ((sessionId: string) => void) =>
  (sessionId) => {
    forward?.(sessionId);
    host
      .handleRefreshUsageLimits({
        lifecycleTrigger: "turn_completed",
        providerId: "",
        providerSessionId: null,
        sessionId,
      })
      .catch(() => {
        // Best-effort: handleRefreshUsageLimitsFlow logs its own diagnostics; a
        // rejected turn_completed refresh must not become an unhandled rejection.
      });
  };
