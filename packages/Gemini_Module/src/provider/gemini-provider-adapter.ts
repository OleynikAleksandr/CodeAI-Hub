import path from "node:path";
import { GeminiInstaller } from "../installer/gemini-installer";
import { GeminiSessionLogger } from "../logging/session-logger";
import { isGeminiCliCompatibilityError } from "../runtime/cli-bridge";
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
    try {
      this.cliBridge = await this.installer.ensureCliBridge();
      this.sessionManager = new GeminiSessionManager(
        this.cliBridge.modules,
        this.options.reporter
      );
      this.options.reporter?.info?.("Gemini provider initialized", {
        cliVersion: this.cliBridge.metadata.version,
        preparedAt: this.cliBridge.metadata.preparedAt,
      });
    } catch (error) {
      if (isGeminiCliCompatibilityError(error)) {
        this.options.reporter?.error?.(
          "Gemini provider initialization failed due to CLI runtime module compatibility mismatch",
          error,
          { reason: "module_compatibility" }
        );
      }
      throw error;
    }
  }

  createSession(workspacePath?: string): Promise<string> {
    return this.startManagedSession({ workspacePath });
  }

  resumeSession(sessionId: string, workspacePath?: string): Promise<string> {
    const normalizedSessionId = sessionId.trim();
    if (normalizedSessionId.length === 0) {
      throw new Error("Cannot resume Gemini session with an empty session id.");
    }
    return this.startManagedSession({
      workspacePath,
      resumeSessionId: normalizedSessionId,
    });
  }

  private async startManagedSession(options: {
    readonly workspacePath?: string;
    readonly resumeSessionId?: string;
  }): Promise<string> {
    const manager = this.requireSessionManager();
    const logger = new GeminiSessionLogger(this.options.reporter);
    const defaultModel = this.options.workspace.defaultModel;
    const thinkingLevel = defaultModel
      ? this.options.workspace.thinkingLevelByModel?.[defaultModel]
      : undefined;

    const resolvedWorkspacePath = this.resolveWorkspacePath(
      options.workspacePath
    );
    const sessionResult = options.resumeSessionId
      ? await manager.resumeSession(options.resumeSessionId, {
          workspacePath: resolvedWorkspacePath,
          defaultModel,
          thinkingLevel,
          settingsPath: this.options.workspace.settingsPath,
          reporter: this.options.reporter,
          logger,
        })
      : await manager.createSession({
          workspacePath: resolvedWorkspacePath,
          defaultModel,
          thinkingLevel,
          settingsPath: this.options.workspace.settingsPath,
          reporter: this.options.reporter,
          logger,
        });
    const { sessionId, session } = sessionResult;
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

  private resolveWorkspacePath(workspacePath?: string): string {
    const fallback = this.options.workspace.workspacePath;
    if (
      typeof workspacePath !== "string" ||
      workspacePath.trim().length === 0
    ) {
      return fallback;
    }

    const normalized = path.resolve(workspacePath.trim()).replace(/\\/g, "/");
    const looksLikeCoreInstall =
      normalized.includes("/.codeai-hub/core/") && normalized.includes("/app");

    if (looksLikeCoreInstall) {
      this.options.reporter?.warn?.(
        "Gemini workspacePath points to core runtime; falling back to configured workspace path",
        { workspacePath: normalized, fallback }
      );
      return fallback;
    }

    return normalized;
  }
}
