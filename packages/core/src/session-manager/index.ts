import { randomUUID } from "node:crypto";

export type SessionRole = "user" | "assistant" | "system" | "thinking";

export type SessionMessage = {
  readonly id: string;
  readonly sessionId: string;
  readonly role: SessionRole;
  readonly content: string;
  readonly timestamp: string;
};

export type Session = {
  readonly id: string;
  readonly providerId: string;
  readonly workspacePath: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly runSlug: string | null;
  readonly continuationParentId: string | null;
  readonly continuationIndex: number;
  readonly title: string;
  readonly createdAt: string;
  updatedAt: string;
  messages: SessionMessage[];
  providerSessionId?: string;
  providerSessionStatus: "pending" | "ready" | "failed";
};

export type SessionInitiativeContext = {
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
  readonly runSlug?: string | null;
  readonly continuationParentId?: string | null;
};

const SESSION_TITLE_PREFIX_LENGTH = 4;

export class SessionManager {
  private readonly sessions: Map<string, Session> = new Map();

  private computeContinuationIndex(
    continuationParentId: string | null | undefined
  ): number {
    if (!continuationParentId) {
      return 1;
    }
    const visited = new Set<string>();
    let index = 2;
    let cursorId: string | null | undefined = continuationParentId;

    while (cursorId) {
      if (visited.has(cursorId)) {
        break;
      }
      visited.add(cursorId);

      const parent = this.sessions.get(cursorId);
      const nextId = parent?.continuationParentId ?? null;
      if (!nextId) {
        break;
      }
      index += 1;
      cursorId = nextId;
    }

    return index;
  }

  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getSessionsByWorkspacePath(workspacePath: string): Session[] {
    return this.listSessions().filter(
      (session) => session.workspacePath === workspacePath
    );
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  createSession(
    providerId: string,
    workspacePath: string,
    providerSessionId?: string,
    context?: SessionInitiativeContext
  ): Session {
    const id = randomUUID();
    const now = new Date().toISOString();
    const continuationParentId = context?.continuationParentId ?? null;
    const session: Session = {
      id,
      providerId,
      workspacePath,
      initiativeSlug: context?.initiativeSlug ?? null,
      stage: context?.stage ?? null,
      runSlug: context?.runSlug ?? null,
      continuationParentId,
      continuationIndex: this.computeContinuationIndex(continuationParentId),
      title: `Mock session ${id.slice(0, SESSION_TITLE_PREFIX_LENGTH)}`,
      createdAt: now,
      updatedAt: now,
      messages: [],
      providerSessionId,
      providerSessionStatus: providerSessionId ? "ready" : "pending",
    };

    this.sessions.set(id, session);
    return session;
  }

  appendMessage(
    sessionId: string,
    role: SessionRole,
    content: string,
    timestamp?: string
  ): SessionMessage | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const message: SessionMessage = {
      id: randomUUID(),
      role,
      content,
      sessionId,
      timestamp: timestamp ?? new Date().toISOString(),
    };

    session.messages.push(message);
    session.updatedAt = message.timestamp;
    return message;
  }

  updateProviderSessionId(sessionId: string, providerSessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.providerSessionId = providerSessionId;
    session.providerSessionStatus = "ready";
    session.updatedAt = new Date().toISOString();
  }

  seedProviderSessionId(sessionId: string, providerSessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    if (session.providerSessionId === providerSessionId) {
      return;
    }
    session.providerSessionId = providerSessionId;
    session.updatedAt = new Date().toISOString();
  }

  markProviderSessionFailed(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.providerSessionStatus = "failed";
    session.updatedAt = new Date().toISOString();
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}
