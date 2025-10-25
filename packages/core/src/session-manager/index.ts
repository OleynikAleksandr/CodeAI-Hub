import { randomUUID } from "node:crypto";

export type SessionRole = "user" | "assistant" | "system";

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
  readonly title: string;
  readonly createdAt: string;
  updatedAt: string;
  messages: SessionMessage[];
};

const SESSION_TITLE_PREFIX_LENGTH = 4;

export class SessionManager {
  private readonly sessions: Map<string, Session> = new Map();

  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  createSession(providerId: string): Session {
    const id = randomUUID();
    const now = new Date().toISOString();
    const session: Session = {
      id,
      providerId,
      title: `Mock session ${id.slice(0, SESSION_TITLE_PREFIX_LENGTH)}`,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    this.sessions.set(id, session);
    return session;
  }

  appendMessage(
    sessionId: string,
    role: SessionRole,
    content: string
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
      timestamp: new Date().toISOString(),
    };

    session.messages.push(message);
    session.updatedAt = message.timestamp;
    return message;
  }
}
