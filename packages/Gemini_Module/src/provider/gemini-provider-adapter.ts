import { GeminiInstaller } from "../installer/gemini-installer.js";
import { GeminiSessionLogger } from "../logging/session-logger.js";
import { GeminiSessionManager } from "../session/gemini-session-manager.js";
import type { GeminiModuleOptions } from "../types/index.js";

export type SessionListener = (payload: unknown) => void;

export class GeminiProviderAdapter {
  private readonly installer: GeminiInstaller;

  private readonly sessionManager: GeminiSessionManager;

  private readonly listeners = new Map<string, Set<SessionListener>>();

  private readonly options: GeminiModuleOptions;

  constructor(options: GeminiModuleOptions) {
    this.options = options;
    this.installer = new GeminiInstaller(options.installerPaths, {
      reporter: options.reporter,
      binaryPathOverride: options.workspace.binaryPathOverride,
      minimumVersion: options.minimumVersion,
      credentialsDirectory: options.credentials?.directory,
      requiredCredentialFiles: options.credentials?.requiredFiles,
    });
    this.sessionManager = new GeminiSessionManager();
  }

  async initialize(): Promise<void> {
    await this.installer.ensureInstalled();
    this.options.reporter?.info?.("Gemini provider initialized", {
      version: this.installer.getDetectedVersion(),
    });
  }

  async createSession(): Promise<string> {
    const logger = new GeminiSessionLogger(this.options.reporter);
    const { sessionId, session } = await this.sessionManager.createSession({
      workspacePath: this.options.workspace.workspacePath,
      defaultModel: this.options.workspace.defaultModel,
      reporter: this.options.reporter,
      logger,
    });
    const forwardMessage = (payload: unknown): void => {
      this.dispatchMessage(sessionId, payload);
    };
    const forwardError = (payload: unknown): void => {
      this.dispatchMessage(sessionId, payload);
    };
    session.eventEmitter.on("message", forwardMessage);
    session.eventEmitter.on("error", forwardError);
    session.eventEmitter.on("realSessionId", forwardMessage);
    return sessionId;
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.sessionManager.closeSession(sessionId);
    this.listeners.delete(sessionId);
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    try {
      await this.sessionManager.sendMessage(sessionId, content);
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
}
