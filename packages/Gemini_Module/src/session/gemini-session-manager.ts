import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { ActiveSession, SessionCreationResult } from "./types";

export class GeminiSessionManager {
  private readonly sessions = new Map<string, ActiveSession>();

  createSession(): SessionCreationResult {
    const sessionId = randomUUID();
    const session: ActiveSession = {
      sessionId,
      createdAt: Date.now(),
      eventEmitter: new EventEmitter(),
    };
    this.sessions.set(sessionId, session);
    session.eventEmitter.emit("session:created", { sessionId });
    return { sessionId, session };
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): readonly ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  async closeSession(sessionId: string): Promise<void> {
    await Promise.resolve();
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.eventEmitter.removeAllListeners();
    this.sessions.delete(sessionId);
  }
}
