const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

interface KimiReconfigureAdapter {
  reconfigureThinking?(enabled: boolean): Promise<boolean>;
}

export interface KimiReconfigureRegistry {
  getAdapter(providerId: string): unknown;
}

export interface KimiReconfigureSessionManager {
  invalidateProviderBinding(sessionId: string): void;
  listSessions(): ReadonlyArray<{
    readonly id: string;
    readonly providerId: string;
  }>;
}

export const reconcileKimiThinkingEnabled = async (
  settings: unknown,
  providerRegistry: KimiReconfigureRegistry | undefined,
  sessionManager: KimiReconfigureSessionManager | undefined
): Promise<void> => {
  if (!providerRegistry) {
    return;
  }
  if (!sessionManager) {
    return;
  }
  const adapter = providerRegistry.getAdapter("kimiCode") as
    | KimiReconfigureAdapter
    | undefined;
  const reconfigure = adapter?.reconfigureThinking;
  if (typeof reconfigure !== "function") {
    return;
  }
  const providers =
    isRecord(settings) && isRecord(settings.providers)
      ? settings.providers
      : null;
  const kimi = providers && isRecord(providers.kimi) ? providers.kimi : null;
  if (!kimi) {
    return;
  }
  const nextEnabled = kimi.thinkingEnabled !== false;
  const kimiSessions = sessionManager
    .listSessions()
    .filter((session) => session.providerId === "kimiCode");
  if (kimiSessions.length === 0) {
    return;
  }
  const restarted = await reconfigure.call(adapter, nextEnabled);
  if (!restarted) {
    return;
  }
  for (const session of kimiSessions) {
    sessionManager.invalidateProviderBinding(session.id);
  }
};
