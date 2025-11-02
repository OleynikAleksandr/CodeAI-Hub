import { homedir } from "node:os";
import path from "node:path";
import { SDKAuthManager } from "../auth/sdk-auth-manager";
import { SDKInstaller } from "../installer/sdk-installer";
import { SDKMessageProcessor } from "../messaging/message-processor";
import { ClaudeSDKManager } from "../sdk/claude-sdk-manager";
import { SDKSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type { ClaudeModuleOptions } from "../types";

export type SessionListener = (payload: unknown) => void;

export class ClaudeProviderAdapter {
  private readonly sdkManager: ClaudeSDKManager;
  private readonly listeners = new Map<string, Set<SessionListener>>();
  private readonly pendingEvents = new Map<string, unknown[]>();
  private readonly sessionIdAliases = new Map<string, string>();

  constructor(options: ClaudeModuleOptions) {
    const reporter = options.reporter;
    const projectPath = this.resolveProjectPath(
      options.workspace.claudeProjectSlug
    );
    const installer = new SDKInstaller(options.installerPaths, {
      logger: reporter,
    });
    const authManager = new SDKAuthManager();
    const sessionManager = new SDKSessionManager();
    const messageProcessor = new SDKMessageProcessor(sessionManager, {
      projectPath,
      reporter,
    });
    this.sdkManager = new ClaudeSDKManager({
      installer,
      authManager,
      sessions: sessionManager,
      processor: messageProcessor,
      workspace: options.workspace,
      reporter,
      enableDebugStreams: options.enableDebugStreams,
    });
  }

  async initialize(): Promise<void> {
    await this.sdkManager.initialize();
  }

  async createSession(): Promise<string> {
    const sessionId = await this.sdkManager.createSession();
    const session = this.sdkManager.getSession(sessionId);
    if (session) {
      this.bindSessionEvents(session);
      await this.sendBootstrapCommand(session.sessionId);
    }
    return sessionId;
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.sdkManager.closeSession(sessionId);
    this.listeners.delete(sessionId);
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    await this.sdkManager.sendMessage(sessionId, content);
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
      const target = this.listeners.get(resolvedId);
      if (!target) {
        return;
      }
      target.delete(listener);
      if (target.size === 0) {
        this.listeners.delete(resolvedId);
      }
    };
  }

  private bindSessionEvents(session: ActiveSession): void {
    session.eventEmitter.on("message", (payload: unknown) => {
      this.dispatchMessage(session.sessionId, payload);
    });
    session.eventEmitter.on("sessionIdChanged", (payload) => {
      if (payload?.oldId && payload?.newId) {
        this.reassignListeners(payload.oldId, payload.newId);
        this.sessionIdAliases.set(payload.oldId, payload.newId);
      }
      const targetId = payload?.newId ?? session.sessionId;
      this.dispatchMessage(targetId, {
        type: "sessionIdChanged",
        payload,
      });
    });
  }

  private dispatchMessage(sessionId: string, payload: unknown): void {
    const target = this.listeners.get(sessionId);
    if (!target) {
      const queue = this.pendingEvents.get(sessionId) ?? [];
      queue.push(payload);
      this.pendingEvents.set(sessionId, queue);
      return;
    }
    for (const listener of target) {
      listener(payload);
    }
  }

  private reassignListeners(oldId: string, newId: string): void {
    if (oldId === newId) {
      return;
    }
    const set = this.listeners.get(oldId);
    if (set) {
      this.listeners.delete(oldId);
      const destination =
        this.listeners.get(newId) ?? new Set<SessionListener>();
      for (const listener of set) {
        destination.add(listener);
      }
      this.listeners.set(newId, destination);
    }
    this.flushPendingEvents(newId);
  }

  private async sendBootstrapCommand(sessionId: string): Promise<void> {
    await this.sdkManager.sendMessage(sessionId, "/context");
  }

  private resolveProjectPath(slug: string): string {
    return path.join(homedir(), ".claude", "projects", slug);
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
