export const KIMI_PROVIDER_ID = "kimiCode" as const;

export type SessionListener = (payload: KimiSessionEvent) => void;

export interface ModuleReporter {
  readonly error?: (
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>
  ) => void;
  readonly info?: (message: string, metadata?: Record<string, unknown>) => void;
  readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
}

export interface KimiWorkspaceOptions {
  readonly configPath?: string;
  readonly defaultModel?: string;
  readonly providerHomePath?: string;
  readonly workspacePath?: string;
}

export interface KimiModuleOptions {
  readonly reporter?: ModuleReporter;
  readonly workspace: KimiWorkspaceOptions;
}

export interface KimiSessionEvent {
  readonly payload?: unknown;
  readonly type: string;
}

export class KimiProviderAdapter {
  private readonly listeners = new Map<string, Set<SessionListener>>();
  private readonly options: KimiModuleOptions;
  private initialized = false;

  constructor(options: KimiModuleOptions) {
    this.options = options;
  }

  initialize(): Promise<void> {
    this.initialized = true;
    this.options.reporter?.info?.("Kimi provider scaffold initialized", {
      providerId: KIMI_PROVIDER_ID,
      providerHomePath: this.options.workspace.providerHomePath,
      configPath: this.options.workspace.configPath,
    });
    return Promise.resolve();
  }

  createSession(workspacePath?: string): Promise<string> {
    this.assertInitialized();
    return Promise.resolve(this.createScaffoldSessionId(workspacePath));
  }

  resumeSession(sessionId: string): Promise<string> {
    this.assertInitialized();
    const normalizedSessionId = sessionId.trim();
    if (normalizedSessionId.length === 0) {
      throw new Error("Cannot resume Kimi session with an empty session id.");
    }
    return Promise.resolve(normalizedSessionId);
  }

  onSessionEvent(sessionId: string, listener: SessionListener): () => void {
    const listeners = this.listeners.get(sessionId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(sessionId, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(sessionId);
      }
    };
  }

  sendMessage(sessionId: string, content: string): Promise<void> {
    this.assertInitialized();
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Cannot send an empty Kimi message.");
    }
    this.dispatchMessage(sessionId, {
      type: "kimi_scaffold_message_rejected",
      payload: {
        reason: "wire_transport_not_implemented",
      },
    });
    return Promise.resolve();
  }

  cancel(sessionId: string): Promise<void> {
    this.assertInitialized();
    this.dispatchMessage(sessionId, {
      type: "kimi_scaffold_cancelled",
    });
    return Promise.resolve();
  }

  closeSession(sessionId: string): Promise<void> {
    this.listeners.delete(sessionId);
    return Promise.resolve();
  }

  private createScaffoldSessionId(workspacePath?: string): string {
    const resolvedWorkspacePath =
      workspacePath ?? this.options.workspace.workspacePath ?? "workspace";
    return `kimi-scaffold:${Buffer.from(resolvedWorkspacePath).toString(
      "base64url"
    )}`;
  }

  private dispatchMessage(sessionId: string, payload: KimiSessionEvent): void {
    const listeners = this.listeners.get(sessionId);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener(payload);
    }
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error("Kimi provider adapter must be initialized before use.");
    }
  }
}
