import type { UsageMetadata } from "@google/genai";
import type { GeminiSessionEvent } from "../types";
import type { GeminiSessionStore } from "./gemini-session-store";
import type { ActiveSession } from "./types";

export class GeminiSessionLifecycle {
  private static readonly ALLOWED_EVENT_TYPES = new Set<
    GeminiSessionEvent["type"]
  >(["assistant"]);

  applyPendingRuntimeOverrides(
    owner: Record<string, unknown>,
    session: {
      config: { setModel: (model: string) => void };
      runtimeTurnConfig: { modelId?: string; thinkingLevel?: string };
    }
  ): void {
    const pendingModel = owner.pendingModelOverride as string | undefined;
    const pendingThinkingLevel = owner.pendingThinkingLevelOverride as
      | string
      | undefined;
    if (!(pendingModel || pendingThinkingLevel)) {
      owner.pendingModelOverride = undefined;
      owner.pendingThinkingLevelOverride = undefined;
      return;
    }

    if (pendingModel) {
      try {
        session.config.setModel(pendingModel);
      } catch {
        // Model override failed, so continue with the active model.
      }
      session.runtimeTurnConfig.modelId = pendingModel;
    }

    if (pendingThinkingLevel) {
      session.runtimeTurnConfig.thinkingLevel = pendingThinkingLevel;
    }

    owner.pendingModelOverride = undefined;
    owner.pendingThinkingLevelOverride = undefined;
  }

  async closeSession(
    sessionStore: GeminiSessionStore,
    sessionId: string
  ): Promise<void> {
    const trackedSession = sessionStore.findTrackedSession(sessionId);
    if (!trackedSession) {
      return;
    }

    const { resolvedSessionId, session } = trackedSession;
    session.status = "closing";
    session.abortController?.abort();

    try {
      await session.client.resetChat();
    } catch (error) {
      session.reporter?.warn?.("Failed to reset Gemini chat", {
        message: error instanceof Error ? error.message : String(error),
      });
    }

    session.logger?.end();
    session.status = "closed";
    sessionStore.removeSession(resolvedSessionId);
    this.emitEvents(session, [
      {
        type: "system",
        provider: "gemini",
        content: "Gemini session closed.",
      },
    ]);
  }

  createIdleWatchdog(abortController: AbortController): {
    clear: () => void;
    reset: () => void;
  } {
    const IDLE_MS = 180_000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reset = (): void => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        if (!abortController.signal.aborted) {
          abortController.abort();
        }
      }, IDLE_MS);
    };
    const clear = (): void => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    return { reset, clear };
  }

  emitEvents(
    session: ActiveSession,
    events: readonly GeminiSessionEvent[]
  ): void {
    if (events.length === 0) {
      return;
    }
    for (const event of events) {
      if (GeminiSessionLifecycle.ALLOWED_EVENT_TYPES.has(event.type)) {
        session.eventEmitter.emit("message", event);
      }
    }
  }

  extractTokenUsageUsed(usage?: UsageMetadata): number | null {
    const numeric = Number(usage?.totalTokenCount);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return null;
    }
    return Math.floor(numeric);
  }
}
