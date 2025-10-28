import type { GeminiSessionManager } from "../session/gemini-session-manager";
import type { GeminiSessionEvent } from "../types";

export class GeminiMessageProcessor {
  private readonly sessionManager: GeminiSessionManager;

  constructor(sessionManager: GeminiSessionManager) {
    this.sessionManager = sessionManager;
  }

  handleEvent(sessionId: string, event: GeminiSessionEvent): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    session.eventEmitter.emit("message", event);
    session.logger?.logEvent({
      type: event.type,
      payload: event.payload ?? null,
    });
  }
}
