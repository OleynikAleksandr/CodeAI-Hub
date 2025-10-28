import { GeminiInstaller } from "../installer/gemini-installer";
import { GeminiSessionLogger } from "../logging/session-logger";
import { GeminiMessageProcessor } from "../messaging/message-processor";
import { GeminiSessionManager } from "../session/gemini-session-manager";
import type { GeminiModuleOptions, GeminiSessionEvent } from "../types";

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
    this.messageProcessor = new GeminiMessageProcessor(this.sessionManager);
  }

  async initialize(): Promise<void> {
    await this.installer.ensureInstalled();
    const binaryPath = this.installer.getBinaryPath();
    this.options.reporter?.info?.("Gemini provider initialized", {
      binaryPath,
      version: this.installer.getDetectedVersion(),
    });
  }

  async createSession(): Promise<string> {
    await Promise.resolve();
    const { sessionId, session } = this.sessionManager.createSession();
    session.logger = new GeminiSessionLogger(this.options.reporter);
    session.logger.start(sessionId);
    const dispatch = (payload: unknown): void => {
      this.dispatchMessage(sessionId, payload);
    };
    session.eventEmitter.on("message", dispatch);
    return sessionId;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (session) {
      session.logger?.end();
      session.eventEmitter.removeAllListeners();
    }
    await this.sessionManager.closeSession(sessionId);
    this.listeners.delete(sessionId);
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    await Promise.resolve();
    const event: GeminiSessionEvent = {
      type: "user_input",
      payload: { content },
    };
    this.messageProcessor.handleEvent(sessionId, event);
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
