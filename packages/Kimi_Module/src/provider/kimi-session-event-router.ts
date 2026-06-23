import {
  KimiWireEventNormalizer,
  normalizeKimiWireEvent,
} from "../messaging/kimi-event-normalizer";
import type { KimiSessionEvent } from "./kimi-provider-adapter";

const KIMI_RUNTIME_SESSION_PREFIX = "kimi:";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeProviderSessionId = (sessionId: string): string =>
  sessionId.startsWith(KIMI_RUNTIME_SESSION_PREFIX)
    ? sessionId.slice(KIMI_RUNTIME_SESSION_PREFIX.length)
    : sessionId;

export const readKimiRuntimeSessionId = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const direct =
    typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
  const params = isRecord(payload.params) ? payload.params : null;
  const nested =
    typeof params?.sessionId === "string" ? params.sessionId.trim() : "";
  const providerSessionId = direct || nested;
  return providerSessionId
    ? `${KIMI_RUNTIME_SESSION_PREFIX}${normalizeProviderSessionId(providerSessionId)}`
    : null;
};

export class KimiSessionEventRouter {
  private readonly fallbackNormalizer = new KimiWireEventNormalizer(
    normalizeKimiWireEvent
  );
  private readonly normalizersBySessionId = new Map<
    string,
    KimiWireEventNormalizer
  >();

  close(sessionId: string): void {
    this.normalizersBySessionId.delete(sessionId);
  }

  flush(sessionId: string): readonly KimiSessionEvent[] {
    return this.getNormalizer(sessionId).flushPendingMessages();
  }

  normalize(
    sessionId: string | null,
    params: unknown
  ): readonly KimiSessionEvent[] {
    return (
      sessionId ? this.getNormalizer(sessionId) : this.fallbackNormalizer
    ).normalize(params);
  }

  private getNormalizer(sessionId: string): KimiWireEventNormalizer {
    const existing = this.normalizersBySessionId.get(sessionId);
    if (existing) {
      return existing;
    }
    const normalizer = new KimiWireEventNormalizer(normalizeKimiWireEvent);
    this.normalizersBySessionId.set(sessionId, normalizer);
    return normalizer;
  }
}
