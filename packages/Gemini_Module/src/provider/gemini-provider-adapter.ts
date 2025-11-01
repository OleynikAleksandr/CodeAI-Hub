import { GeminiInstaller } from "../installer/gemini-installer";
import { GeminiSessionLogger } from "../logging/session-logger";
import type { GeminiCliBridge } from "../runtime/cli-types";
import { GeminiSessionManager } from "../session/gemini-session-manager";
import type { GeminiModuleOptions } from "../types";

export type SessionListener = (payload: unknown) => void;

export class GeminiProviderAdapter {
  private readonly installer: GeminiInstaller;

  private sessionManager: GeminiSessionManager | null = null;

  private cliBridge: GeminiCliBridge | null = null;

  private readonly listeners = new Map<string, Set<SessionListener>>();

  private readonly options: GeminiModuleOptions;

  constructor(options: GeminiModuleOptions) {
    this.options = options;
    this.installer = new GeminiInstaller(options.installerPaths, {
      reporter: options.reporter,
    });
  }

  async initialize(): Promise<void> {
    this.cliBridge = await this.installer.ensureCliBridge();
    this.sessionManager = new GeminiSessionManager(this.cliBridge.modules);
    this.options.reporter?.info?.("Gemini provider initialized", {
      cliVersion: this.cliBridge.metadata.version,
      preparedAt: this.cliBridge.metadata.preparedAt,
    });
  }

  async createSession(): Promise<string> {
    const manager = this.requireSessionManager();
    const logger = new GeminiSessionLogger(this.options.reporter);
    const { sessionId, session } = await manager.createSession({
      workspacePath: this.options.workspace.workspacePath,
      defaultModel: this.options.workspace.defaultModel,
      reporter: this.options.reporter,
      logger,
    });
    let currentSessionId = sessionId;
    const forwardMessage = (payload: unknown): void => {
      this.dispatchMessage(currentSessionId, payload);
    };
    const forwardError = (payload: unknown): void => {
      this.dispatchMessage(currentSessionId, payload);
    };
    session.eventEmitter.on("message", forwardMessage);
    session.eventEmitter.on("error", forwardError);
    session.eventEmitter.on("realSessionId", forwardMessage);
    session.eventEmitter.on("sessionIdChanged", (payload) => {
      const candidate = payload as {
        readonly oldId?: string;
        readonly newId?: string;
      };
      if (candidate?.oldId && candidate?.newId) {
        this.reassignListeners(candidate.oldId, candidate.newId);
        currentSessionId = candidate.newId;
        this.dispatchMessage(candidate.newId, {
          type: "sessionIdChanged",
          payload: candidate,
        });
      }
    });
    return sessionId;
  }

  async closeSession(sessionId: string): Promise<void> {
    const manager = this.requireSessionManager();
    await manager.closeSession(sessionId);
    this.listeners.delete(sessionId);
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const manager = this.requireSessionManager();
    try {
      await manager.sendMessage(sessionId, content);
    } catch (error) {
      this.options.reporter?.error?.(
        "Failed to send message to Gemini provider",
        error,
        {
          sessionId,
        }
      );
      throw error;
    }
  }

  subscribe(sessionId: string, listener: SessionListener): () => void {
    const bucket = this.listeners.get(sessionId) ?? new Set<SessionListener>();
    bucket.add(listener);
    this.listeners.set(sessionId, bucket);
    return () => {
      const listeners = this.listeners.get(sessionId);
      if (!listeners) {
        return;
      }
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(sessionId);
      }
    };
  }

  private dispatchMessage(sessionId: string, payload: unknown): void {
    const listeners = this.listeners.get(sessionId);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
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
    const target = this.listeners.get(newId) ?? new Set<SessionListener>();
    for (const listener of listeners) {
      target.add(listener);
    }
    this.listeners.set(newId, target);
  }

  private requireSessionManager(): GeminiSessionManager {
    if (!this.sessionManager) {
      throw new Error("Gemini provider not initialized");
    }
    return this.sessionManager;
  }
}
