import type { ActiveSession } from "./types";

interface TrackedSession {
  readonly resolvedSessionId: string;
  readonly session: ActiveSession;
}

export class GeminiSessionStore {
  private readonly sessionAliases = new Map<string, string>();
  private readonly sessions = new Map<string, ActiveSession>();

  getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): readonly ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  promoteSessionId(
    previousId: string,
    nextId: string,
    session: ActiveSession
  ): string {
    if (nextId === previousId) {
      session.sessionId = nextId;
      session.logger?.renameSession?.(previousId, nextId);
      return nextId;
    }
    this.sessionAliases.set(previousId, nextId);
    this.sessions.delete(previousId);
    session.sessionId = nextId;
    this.sessions.set(nextId, session);
    session.logger?.renameSession?.(previousId, nextId);
    return nextId;
  }

  registerSession(sessionId: string, session: ActiveSession): void {
    this.sessions.set(sessionId, session);
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.pruneAliasesForSession(sessionId);
  }

  requireSession(sessionId: string): ActiveSession {
    const session = this.findTrackedSession(sessionId)?.session;
    if (session) {
      return session;
    }

    for (const candidate of this.sessions.values()) {
      if (candidate.sessionId === sessionId) {
        return candidate;
      }
    }

    const availableIds = Array.from(this.sessions.keys()).join(", ");
    const aliasIds = Array.from(this.sessionAliases.keys()).join(", ");
    throw new Error(
      `Gemini session ${sessionId} not found. Available: [${availableIds}] Aliases: [${aliasIds}]`
    );
  }

  findTrackedSession(sessionId: string): TrackedSession | null {
    const resolvedSessionId = this.sessionAliases.get(sessionId) ?? sessionId;
    const session = this.sessions.get(resolvedSessionId);
    if (session) {
      return { resolvedSessionId, session };
    }
    if (resolvedSessionId !== sessionId) {
      this.sessionAliases.delete(sessionId);
    }
    return null;
  }

  private pruneAliasesForSession(sessionId: string): void {
    for (const [alias, canonical] of this.sessionAliases.entries()) {
      if (alias === sessionId || canonical === sessionId) {
        this.sessionAliases.delete(alias);
      }
    }
  }
}
