import { CodexAuthManager } from "../auth/sdk-auth-manager";
import { CodexInstaller } from "../installer/codex-installer";
import { CodexMessageProcessor } from "../messaging/message-processor";
import { CodexSDKManager } from "../sdk/codex-sdk-manager";
import { CodexSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type { CodexModuleOptions, CodexTurnOptions } from "../types";

export type SessionListener = (payload: unknown) => void;

export class CodexProviderAdapter {
  private readonly sdkManager: CodexSDKManager;
  private readonly listeners = new Map<string, Set<SessionListener>>();
  private readonly pendingEvents = new Map<string, unknown[]>();
  private readonly sessionIdAliases = new Map<string, string>();

  constructor(options: CodexModuleOptions) {
    const installer = new CodexInstaller(options.installerPaths, {
      logger: options.reporter,
    });
    const authManager = new CodexAuthManager();
    const sessionManager = new CodexSessionManager();
    const messageProcessor = new CodexMessageProcessor(sessionManager, {
      reporter: options.reporter,
      usageLimitsFacade: options.usageLimitsFacade,
    });
    this.sdkManager = new CodexSDKManager({
      installer,
      authManager,
      sessions: sessionManager,
      processor: messageProcessor,
      workspace: options.workspace,
      reporter: options.reporter,
    });
  }

  async initialize(): Promise<void> {
    await this.sdkManager.initialize();
  }

  async createSession(workspacePath?: string): Promise<string> {
    const sessionId = await this.sdkManager.createSession(workspacePath);
    const session = this.sdkManager.getSession(sessionId);
    if (session) {
      this.bindSessionEvents(session);
    }
    return sessionId;
  }

  async resumeSession(
    sessionId: string,
    workspacePath?: string
  ): Promise<string> {
    const resumedId = await this.sdkManager.resumeSession(
      sessionId,
      workspacePath
    );
    const session = this.sdkManager.getSession(resumedId);
    if (session) {
      this.bindSessionEvents(session);
    }
    return resumedId;
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.sdkManager.closeSession(sessionId);
    this.listeners.delete(sessionId);
  }

  async sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: CodexTurnOptions
  ): Promise<void> {
    await this.sdkManager.sendMessage(sessionId, content, turnOptions);
  }

  subscribe(sessionId: string, listener: SessionListener): () => void {
    const resolvedId = this.resolveSessionAlias(sessionId);
    const bucket = this.listeners.get(resolvedId) ?? new Set<SessionListener>();
    bucket.add(listener);
    this.listeners.set(resolvedId, bucket);
    this.flushPendingEvents(resolvedId);
    if (resolvedId !== sessionId) {
      this.sessionIdAliases.set(sessionId, resolvedId);
      this.flushPendingEvents(sessionId);
    }
    return () => {
      const current = this.listeners.get(resolvedId);
      if (!current) {
        return;
      }
      current.delete(listener);
      if (current.size === 0) {
        this.listeners.delete(resolvedId);
      }
    };
  }

  private bindSessionEvents(session: ActiveSession): void {
    session.eventEmitter.on("message", (payload) => {
      this.dispatchMessage(session.sessionId, payload);
    });
    session.eventEmitter.on("error", (payload) => {
      this.dispatchMessage(session.sessionId, {
        type: "error",
        provider: "codex",
        payload,
      });
    });
    session.eventEmitter.on("sessionIdChanged", (payload) => {
      const candidate = payload as {
        readonly oldId?: string;
        readonly newId?: string;
      };
      if (candidate?.oldId && candidate?.newId) {
        this.reassignListeners(candidate.oldId, candidate.newId);
        this.sessionIdAliases.set(candidate.oldId, candidate.newId);
        this.flushPendingEvents(candidate.newId);
        this.dispatchMessage(candidate.newId, {
          type: "sessionIdChanged",
          payload: candidate,
        });
      }
    });
  }

  private dispatchMessage(sessionId: string, payload: unknown): void {
    const bucket = this.listeners.get(sessionId);
    if (!bucket) {
      const queue = this.pendingEvents.get(sessionId) ?? [];
      queue.push(payload);
      this.pendingEvents.set(sessionId, queue);
      return;
    }
    for (const listener of bucket) {
      listener(payload);
    }
  }

  private reassignListeners(oldId: string, newId: string): void {
    if (oldId === newId) {
      return;
    }
    const listeners = this.listeners.get(oldId);
    if (!listeners) {
      return;
    }
    this.listeners.delete(oldId);
    const destination = this.listeners.get(newId) ?? new Set<SessionListener>();
    for (const listener of listeners) {
      destination.add(listener);
    }
    this.listeners.set(newId, destination);
    this.flushPendingEvents(newId);
  }

  private resolveSessionAlias(sessionId: string): string {
    let current = sessionId;
    const visited = new Set<string>();
    while (this.sessionIdAliases.has(current) && !visited.has(current)) {
      visited.add(current);
      const next = this.sessionIdAliases.get(current);
      if (!next) {
        break;
      }
      current = next;
    }
    return current;
  }

  private flushPendingEvents(sessionId: string): void {
    const events = this.pendingEvents.get(sessionId);
    if (!events || events.length === 0) {
      return;
    }
    const listeners = this.listeners.get(sessionId);
    if (!listeners || listeners.size === 0) {
      return;
    }
    this.pendingEvents.delete(sessionId);
    for (const event of events) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }
}
