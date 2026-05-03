import { randomUUID } from "node:crypto";
import type { SessionModelBinding } from "../session-model-binding";

export type SessionRole = "user" | "assistant" | "system" | "thinking";

export type SessionMessageEmissionVisibility = "visible" | "hidden";

export interface SessionMessage {
  readonly content: string;
  readonly id: string;
  readonly localizedContent?: string;
  readonly role: SessionRole;
  readonly sessionId: string;
  readonly tag?: string;
  readonly timestamp: string;
  readonly visibilityAtEmission?: SessionMessageEmissionVisibility;
}

export interface Session {
  readonly continuationIndex: number;
  readonly continuationParentId: string | null;
  readonly createdAt: string;
  readonly id: string;
  readonly initiativeSlug: string | null;
  messages: SessionMessage[];
  modelBinding?: SessionModelBinding;
  pendingModelSwitchInjection?: boolean;
  readonly providerId: string;
  providerSessionId?: string;
  providerSessionStatus: "pending" | "ready" | "failed";
  readonly runSlug: string | null;
  readonly stage: string | null;
  readonly title: string;
  updatedAt: string;
  readonly workspacePath: string;
}

export interface SessionInitiativeContext {
  readonly continuationParentId?: string | null;
  readonly initiativeSlug?: string | null;
  readonly runSlug?: string | null;
  readonly stage?: string | null;
}

const SESSION_TITLE_PREFIX_LENGTH = 4;

export class SessionManager {
  private readonly sessions: Map<string, Session> = new Map();
  private readonly stopInvalidatedBindingSessionIds = new Set<string>();

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

  registerSessionWithId(options: {
    readonly sessionId: string;
    readonly providerId: string;
    readonly workspacePath: string;
    readonly providerSessionId: string;
    readonly stage?: string | null;
    readonly initiativeSlug?: string | null;
    readonly runSlug?: string | null;
    readonly continuationParentId?: string | null;
  }): Session {
    const existing = this.sessions.get(options.sessionId);
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const continuationParentId = options.continuationParentId ?? null;
    const session: Session = {
      id: options.sessionId,
      providerId: options.providerId,
      workspacePath: options.workspacePath,
      initiativeSlug: options.initiativeSlug ?? null,
      stage: options.stage ?? null,
      runSlug: options.runSlug ?? null,
      continuationParentId,
      continuationIndex: this.computeContinuationIndex(continuationParentId),
      title: `Restored session ${options.sessionId.slice(0, SESSION_TITLE_PREFIX_LENGTH)}`,
      createdAt: now,
      updatedAt: now,
      messages: [],
      providerSessionId: options.providerSessionId,
      providerSessionStatus: "ready",
    };
    this.sessions.set(options.sessionId, session);
    return session;
  }

  appendMessage(
    sessionId: string,
    role: SessionRole,
    content: string,
    options?: {
      readonly messageId?: string;
      readonly timestamp?: string;
      readonly tag?: string;
      readonly visibilityAtEmission?: SessionMessageEmissionVisibility;
    }
  ): SessionMessage | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const message: SessionMessage = {
      id: options?.messageId ?? randomUUID(),
      role,
      content,
      sessionId,
      timestamp: options?.timestamp ?? new Date().toISOString(),
      ...(options?.tag ? { tag: options.tag } : {}),
      ...(options?.visibilityAtEmission
        ? { visibilityAtEmission: options.visibilityAtEmission }
        : {}),
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
    this.stopInvalidatedBindingSessionIds.delete(sessionId);
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
    this.stopInvalidatedBindingSessionIds.delete(sessionId);
    session.providerSessionId = providerSessionId;
    session.updatedAt = new Date().toISOString();
  }

  markProviderSessionFailed(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    this.stopInvalidatedBindingSessionIds.delete(sessionId);
    session.providerSessionStatus = "failed";
    session.updatedAt = new Date().toISOString();
  }

  setModelBinding(sessionId: string, modelBinding: SessionModelBinding): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.modelBinding = modelBinding;
    session.updatedAt = new Date().toISOString();
  }

  hydrateSessionContext(
    sessionId: string,
    context: SessionInitiativeContext
  ): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    const nextInitiativeSlug =
      session.initiativeSlug ?? context.initiativeSlug ?? null;
    const nextStage = session.stage ?? context.stage ?? null;
    const nextRunSlug = session.runSlug ?? context.runSlug ?? null;
    if (
      session.initiativeSlug === nextInitiativeSlug &&
      session.stage === nextStage &&
      session.runSlug === nextRunSlug
    ) {
      return session;
    }
    const next: Session = {
      ...session,
      initiativeSlug: nextInitiativeSlug,
      stage: nextStage,
      runSlug: nextRunSlug,
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, next);
    return next;
  }

  clearPendingModelSwitchInjection(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.pendingModelSwitchInjection = false;
    session.updatedAt = new Date().toISOString();
  }

  invalidateProviderBinding(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    this.stopInvalidatedBindingSessionIds.add(sessionId);
    session.providerSessionId = undefined;
    session.providerSessionStatus = "pending";
    session.updatedAt = new Date().toISOString();
  }

  hasStopInvalidatedBinding(sessionId: string): boolean {
    return this.stopInvalidatedBindingSessionIds.has(sessionId);
  }

  deleteSession(sessionId: string): boolean {
    this.stopInvalidatedBindingSessionIds.delete(sessionId);
    return this.sessions.delete(sessionId);
  }
}
