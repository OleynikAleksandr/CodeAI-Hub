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

  public async initialize(): Promise<void> {
    await this.sdkManager.initialize();
  }

  public async createSession(): Promise<string> {
    const sessionId = await this.sdkManager.createSession();
    const session = this.sdkManager.getSession(sessionId);
    if (session) {
      this.bindSessionEvents(session);
      await this.sendBootstrapCommand(session.sessionId);
    }
    return sessionId;
  }

  public async closeSession(sessionId: string): Promise<void> {
    await this.sdkManager.closeSession(sessionId);
    this.listeners.delete(sessionId);
  }

  public async sendMessage(sessionId: string, content: string): Promise<void> {
    await this.sdkManager.sendMessage(sessionId, content);
  }

  public subscribe(sessionId: string, listener: SessionListener): () => void {
    const existing =
      this.listeners.get(sessionId) ?? new Set<SessionListener>();
    existing.add(listener);
    this.listeners.set(sessionId, existing);
    return () => {
      const target = this.listeners.get(sessionId);
      if (!target) {
        return;
      }
      target.delete(listener);
      if (target.size === 0) {
        this.listeners.delete(sessionId);
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
      }
      this.dispatchMessage(payload?.newId ?? session.sessionId, {
        type: "sessionIdChanged",
        payload,
      });
    });
  }

  private dispatchMessage(sessionId: string, payload: unknown): void {
    const target = this.listeners.get(sessionId);
    if (!target) {
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
    if (!set) {
      return;
    }
    this.listeners.delete(oldId);
    const destination = this.listeners.get(newId) ?? new Set<SessionListener>();
    for (const listener of set) {
      destination.add(listener);
    }
    this.listeners.set(newId, destination);
  }

  private async sendBootstrapCommand(sessionId: string): Promise<void> {
    await this.sdkManager.sendMessage(sessionId, "/context");
  }

  private resolveProjectPath(slug: string): string {
    return path.join(homedir(), ".claude", "projects", slug);
  }
}
