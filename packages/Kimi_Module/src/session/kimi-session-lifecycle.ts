import type { KimiWireProcessBridge } from "../wire/kimi-wire-process";
import type { KimiWireRouter } from "../wire/kimi-wire-router";

export const KIMI_SESSION_STALE_BINDING_ERROR_CODE =
  "KIMI_SESSION_STALE_BINDING" as const;

export interface KimiSessionLifecycleOptions {
  readonly cwd: string;
  readonly defaultModel?: string;
  readonly processBridge: KimiWireProcessBridge;
  readonly router: KimiWireRouter;
}

interface ActiveKimiSession {
  readonly providerSessionId: string;
  readonly runtimeSessionId: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export class KimiSessionStaleBindingError extends Error {
  readonly code = KIMI_SESSION_STALE_BINDING_ERROR_CODE;
  readonly providerSessionId: string;

  constructor(providerSessionId: string) {
    super(`Kimi session binding is stale: ${providerSessionId}`);
    this.name = "KimiSessionStaleBindingError";
    this.providerSessionId = providerSessionId;
  }
}

export class KimiSessionLifecycle {
  private readonly activeSessions = new Map<string, ActiveKimiSession>();
  private initialized = false;
  private readonly options: KimiSessionLifecycleOptions;

  constructor(options: KimiSessionLifecycleOptions) {
    this.options = options;
  }

  cancel(sessionId: string): Promise<void> {
    const session = this.requireSession(sessionId);
    this.options.router.notify("session/cancel", {
      sessionId: session.providerSessionId,
    });
    return Promise.resolve();
  }

  async close(sessionId: string): Promise<void> {
    this.activeSessions.delete(sessionId);
    if (this.activeSessions.size === 0) {
      await this.options.processBridge.stop();
      this.initialized = false;
    }
  }

  async create(): Promise<string> {
    await this.ensureInitialized();
    const response = await this.options.router.request("session/new", {
      cwd: this.options.cwd,
      mcpServers: [],
    });
    const providerSessionId = readProviderSessionId(response);
    await this.applyDefaultModel(providerSessionId);
    await this.applyThinkingConfig(providerSessionId);
    const runtimeSessionId = this.toRuntimeSessionId(providerSessionId);
    this.activeSessions.set(runtimeSessionId, {
      providerSessionId,
      runtimeSessionId,
    });
    return runtimeSessionId;
  }

  async resume(providerSessionId: string): Promise<string> {
    const normalizedProviderSessionId = providerSessionId.trim();
    if (normalizedProviderSessionId.length === 0) {
      throw new Error("Cannot resume Kimi session with an empty provider id.");
    }

    await this.ensureInitialized();
    await this.options.router.request("session/resume", {
      cwd: this.options.cwd,
      mcpServers: [],
      sessionId: normalizedProviderSessionId,
    });
    await this.applyDefaultModel(normalizedProviderSessionId);
    await this.applyThinkingConfig(normalizedProviderSessionId);
    const runtimeSessionId = this.toRuntimeSessionId(
      normalizedProviderSessionId
    );
    this.activeSessions.set(runtimeSessionId, {
      providerSessionId: normalizedProviderSessionId,
      runtimeSessionId,
    });
    return runtimeSessionId;
  }

  async send(sessionId: string, content: string): Promise<void> {
    const session = this.requireSession(sessionId);
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Cannot send an empty Kimi message.");
    }
    await this.options.router.request("session/prompt", {
      prompt: [
        {
          text: trimmedContent,
          type: "text",
        },
      ],
      sessionId: session.providerSessionId,
    });
  }

  private async applyDefaultModel(providerSessionId: string): Promise<void> {
    const defaultModel = this.options.defaultModel?.trim();
    if (!defaultModel) {
      return;
    }
    await this.options.router.request("session/set_config_option", {
      configId: "model",
      sessionId: providerSessionId,
      value: defaultModel,
    });
  }

  private async applyThinkingConfig(providerSessionId: string): Promise<void> {
    await this.options.router.request("session/set_config_option", {
      configId: "thinking",
      sessionId: providerSessionId,
      value: "on",
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.options.processBridge.start();
    await this.options.router.request("initialize", {
      clientCapabilities: {
        fs: {
          readTextFile: false,
          writeTextFile: false,
        },
        terminal: false,
      },
      clientInfo: {
        name: "codeai-hub",
        version: "0.1.0",
      },
      protocolVersion: 1,
    });
    this.initialized = true;
  }

  private toRuntimeSessionId(providerSessionId: string): string {
    return `kimi:${providerSessionId}`;
  }

  private requireSession(sessionId: string): ActiveKimiSession {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new KimiSessionStaleBindingError(sessionId);
    }
    return session;
  }
}

const readProviderSessionId = (response: unknown): string => {
  if (isRecord(response) && typeof response.sessionId === "string") {
    return response.sessionId;
  }
  throw new Error("Kimi ACP session/new did not return a session id.");
};
