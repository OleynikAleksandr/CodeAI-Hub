import { CodexAuthManager } from "../auth/sdk-auth-manager";
import { CodexInstaller } from "../installer/codex-installer";
import { CodexMessageProcessor } from "../messaging/message-processor";
import { CodexSDKManager } from "../sdk/codex-sdk-manager";
import { CodexSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type { CodexModuleOptions } from "../types";

export type SessionListener = (payload: unknown) => void;

export class CodexProviderAdapter {
  private readonly sdkManager: CodexSDKManager;
  private readonly listeners = new Map<string, Set<SessionListener>>();
  private readonly options: CodexModuleOptions;

  constructor(options: CodexModuleOptions) {
    this.options = options;
    const installer = new CodexInstaller(options.installerPaths, {
      logger: options.reporter,
    });
    const authManager = new CodexAuthManager();
    const sessionManager = new CodexSessionManager();
    const messageProcessor = new CodexMessageProcessor(sessionManager, {
      reporter: options.reporter,
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

  async createSession(): Promise<string> {
    const sessionId = await this.sdkManager.createSession();
    const session = this.sdkManager.getSession(sessionId);
    if (session) {
      this.bindSessionEvents(session);
      this.sendBootstrapCommand(session.sessionId).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.options.reporter?.warn?.(
          `Codex bootstrap command failed: ${message}`
        );
      });
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
    const bucket = this.listeners.get(sessionId) ?? new Set<SessionListener>();
    bucket.add(listener);
    this.listeners.set(sessionId, bucket);
    return () => {
      const current = this.listeners.get(sessionId);
      if (!current) {
        return;
      }
      current.delete(listener);
      if (current.size === 0) {
        this.listeners.delete(sessionId);
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
  }

  private async sendBootstrapCommand(sessionId: string): Promise<void> {
    await this.sdkManager.sendMessage(sessionId, "/status", {
      internal: true,
    });
  }
}
