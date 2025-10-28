import { GeminiInstaller } from "../installer/gemini-installer";
import { GeminiSessionLogger } from "../logging/session-logger";
import { GeminiMessageProcessor } from "../messaging/message-processor";
import { GeminiSessionManager } from "../session/gemini-session-manager";
import type { GeminiModuleOptions } from "../types";

export type SessionListener = (payload: unknown) => void;

export class GeminiProviderAdapter {
  private readonly installer: GeminiInstaller;

  private readonly sessionManager: GeminiSessionManager;

  private readonly messageProcessor: GeminiMessageProcessor;

  private readonly listeners = new Map<string, Set<SessionListener>>();

  private readonly options: GeminiModuleOptions;

  constructor(options: GeminiModuleOptions) {
    this.options = options;
    this.installer = new GeminiInstaller(options.installerPaths, {
      reporter: options.reporter,
      binaryPathOverride: options.workspace.binaryPathOverride,
      minimumVersion: options.minimumVersion,
      credentialsDirectory: options.credentials?.directory,
    });
    this.sessionManager = new GeminiSessionManager();
    this.messageProcessor = new GeminiMessageProcessor({
      reporter: options.reporter,
    });
    this.sessionManager.setMessageProcessor(this.messageProcessor);
  }

  async initialize(): Promise<void> {
    await this.installer.ensureInstalled();
    const binaryPath = this.installer.getBinaryPath();
    this.options.reporter?.info?.("Gemini provider initialized", {
      binaryPath,
      version: this.installer.getDetectedVersion(),
    });
  }

  createSession(): Promise<string> {
    const logger = new GeminiSessionLogger(this.options.reporter);
    const { sessionId, session } = this.sessionManager.createSession({
      binaryPath: this.installer.getBinaryPath(),
      model: this.options.workspace.defaultModel,
      cwd: this.options.workspace.workspacePath,
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
    session.eventEmitter.emit("message", {
      type: "system",
      provider: "gemini",
      content: `Gemini CLI session started (model: ${session.model ?? "default"})`,
    });
    return Promise.resolve(sessionId);
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
        "Failed to send message to Gemini CLI",
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
