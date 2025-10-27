import type { ActiveSession } from "./types";

export class CodexSessionRegistry {
  private readonly sessions = new Map<string, ActiveSession>();

  add(session: ActiveSession): void {
    this.sessions.set(session.sessionId, session);
  }

  get(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  updateSessionId(oldId: string, newId: string): void {
    if (oldId === newId) {
      return;
    }
    const snapshot = this.sessions.get(oldId);
    if (!snapshot) {
      return;
    }
    this.sessions.delete(oldId);
    snapshot.sessionId = newId;
    this.sessions.set(newId, snapshot);
  }

  listSessions(): readonly ActiveSession[] {
    return [...this.sessions.values()];
  }
}
