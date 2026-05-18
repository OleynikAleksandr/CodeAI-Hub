import crypto from "node:crypto";
import type { KimiWireProcessBridge } from "../wire/kimi-wire-process";
import type { KimiWireRouter } from "../wire/kimi-wire-router";

export const KIMI_SESSION_STALE_BINDING_ERROR_CODE =
  "KIMI_SESSION_STALE_BINDING" as const;

export interface KimiSessionLifecycleOptions {
  readonly processBridge: KimiWireProcessBridge;
  readonly router: KimiWireRouter;
}

interface ActiveKimiSession {
  readonly providerSessionId: string | null;
  readonly runtimeSessionId: string;
}

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

  async cancel(sessionId: string): Promise<void> {
    this.requireSession(sessionId);
    await this.options.router.request("cancel");
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
    const runtimeSessionId = `kimi:${crypto.randomUUID()}`;
    this.activeSessions.set(runtimeSessionId, {
      providerSessionId: null,
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
    const runtimeSessionId = `kimi:${normalizedProviderSessionId}`;
    this.activeSessions.set(runtimeSessionId, {
      providerSessionId: normalizedProviderSessionId,
      runtimeSessionId,
    });
    return runtimeSessionId;
  }

  async send(sessionId: string, content: string): Promise<void> {
    this.requireSession(sessionId);
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Cannot send an empty Kimi message.");
    }
    await this.options.router.request("prompt", {
      user_input: trimmedContent,
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.options.processBridge.start();
    await this.options.router.request("initialize", {
      capabilities: {
        supports_question: true,
      },
      client: {
        name: "codeai-hub",
        version: "0.1.0",
      },
      protocol_version: "1.10",
    });
    this.initialized = true;
  }

  private requireSession(sessionId: string): ActiveKimiSession {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new KimiSessionStaleBindingError(sessionId);
    }
    return session;
  }
}
