import type { CoreConfig } from "../../config";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session, SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";

export type ProviderSessionBinding = {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
};

export type ProviderEventEnvelope = {
  readonly type?: string;
  readonly payload?: unknown;
};

export type DialogMessagePayload = {
  readonly role?: string;
  readonly content?: unknown;
  readonly timestamp?: string;
};

type SessionIdChangedPayload = {
  readonly newId?: string;
};

export type SessionRequestHandlerOptions = {
  readonly config: CoreConfig;
  readonly sessionManager: SessionManager;
  readonly providerRegistry: ProviderRegistry;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly logger: Logger;
  readonly broadcaster: (event: unknown) => void;
  readonly stateBroadcaster: () => void;
};

export class SessionRequestHandler {
  private readonly providerSessions = new Map<string, ProviderSessionBinding>();
  private readonly config: CoreConfig;
  private readonly sessionManager: SessionManager;
  private readonly providerRegistry: ProviderRegistry;
  private readonly sessionStorage: UnifiedSessionStorage;
  private readonly logger: Logger;
  private readonly broadcaster: (event: unknown) => void;
  private readonly stateBroadcaster: () => void;

  constructor(options: SessionRequestHandlerOptions) {
    this.config = options.config;
    this.sessionManager = options.sessionManager;
    this.providerRegistry = options.providerRegistry;
    this.sessionStorage = options.sessionStorage;
    this.logger = options.logger;
    this.broadcaster = options.broadcaster;
    this.stateBroadcaster = options.stateBroadcaster;
  }

  async handleCreate(
    providerId?: string,
    workspacePath?: string
  ): Promise<void> {
    const actualProviderId = providerId ?? this.getDefaultProviderId();
    const actualWorkspacePath =
      workspacePath ?? this.config.claudeWorkspacePath ?? process.cwd();
    const adapter = this.providerRegistry.getAdapter(actualProviderId);

    if (!adapter) {
      this.broadcaster({
        type: "session:error",
        payload: { message: `Provider ${actualProviderId} unavailable` },
      });
      return;
    }

    try {
      const providerSessionId =
        await adapter.createSession(actualWorkspacePath);
      const supportsImmediateBinding =
        typeof providerSessionId === "string" &&
        providerSessionId.length > 0 &&
        actualProviderId === "geminiCli";

      const session = this.sessionManager.createSession(
        actualProviderId,
        actualWorkspacePath,
        supportsImmediateBinding ? providerSessionId : undefined
      );

      this.sessionStorage.register(session);

      const unsubscribe = adapter.subscribe(
        providerSessionId,
        (event: unknown) => {
          this.handleProviderEvent(session.id, event);
        }
      );

      this.providerSessions.set(session.id, {
        providerId: actualProviderId,
        providerSessionId,
        unsubscribe,
      });

      if (supportsImmediateBinding) {
        this.updateProviderBinding(session.id, providerSessionId);
      }

      this.broadcaster({
        type: "session:created",
        payload: this.serializeSession(session),
      });
      this.broadcastSessionBinding(session.id);
    } catch (error) {
      this.handleProviderFailure(actualProviderId, error);
    }
  }

  async handleMessage(sessionId: string, content: string): Promise<void> {
    const userMessage = this.sessionManager.appendMessage(
      sessionId,
      "user",
      content
    );
    if (!userMessage) {
      this.broadcaster({
        type: "session:error",
        payload: { sessionId, message: "Session not found" },
      });
      return;
    }

    this.sessionStorage.appendMessage(sessionId, userMessage);
    this.broadcaster({ type: "session:message", payload: userMessage });

    const binding = this.providerSessions.get(sessionId);
    const adapter = binding
      ? this.providerRegistry.getAdapter(binding.providerId)
      : null;

    if (!(binding && adapter)) {
      this.logger.warn("Provider binding or adapter missing for session", {
        sessionId,
      });
      return;
    }

    try {
      await adapter.sendMessage(binding.providerSessionId, content);
    } catch (error) {
      this.handleProviderFailure(binding.providerId, error, sessionId);
    }
  }

  async handleDelete(sessionId: string): Promise<void> {
    const binding = this.providerSessions.get(sessionId);
    if (binding) {
      const adapter = this.providerRegistry.getAdapter(binding.providerId);
      binding.unsubscribe();
      this.providerSessions.delete(sessionId);
      try {
        await adapter?.closeSession(binding.providerSessionId);
      } catch (error) {
        this.handleProviderFailure(binding.providerId, error, sessionId);
      }
    }

    const deleted = this.sessionManager.deleteSession(sessionId);
    if (!deleted) {
      this.broadcaster({
        type: "session:error",
        payload: { sessionId, message: "Session not found" },
      });
      return;
    }

    this.sessionStorage.close(sessionId, "session-deleted");
    this.broadcaster({ type: "session:deleted", payload: { sessionId } });
  }

  private handleProviderEvent(sessionId: string, event: unknown): void {
    if (typeof event === "string") {
      this.updateBindingWithResolvedId(sessionId, event);
      return;
    }
    if (!event || typeof event !== "object") {
      return;
    }
    this.handleTypedProviderEvent(sessionId, event as ProviderEventEnvelope);
  }

  private handleTypedProviderEvent(
    sessionId: string,
    event: ProviderEventEnvelope
  ): void {
    switch (event.type) {
      case "sessionIdChanged":
        this.handleSessionIdChangedEvent(sessionId, event.payload);
        break;
      case "realSessionId":
        this.handleRealSessionIdEvent(sessionId, event.payload);
        break;
      case "stream_event":
        this.broadcaster({
          type: "session:stream",
          payload: { sessionId, event },
        });
        break;
      case "assistant":
        this.appendProviderMessage(sessionId, "assistant", event);
        break;
      case "thinking":
        this.appendProviderMessage(sessionId, "thinking", event);
        break;
      case "dialog_message":
        this.appendDialogMessage(sessionId, event as DialogMessagePayload);
        break;
      default:
        break;
    }
  }

  private handleProviderFailure(
    providerId: string,
    error: unknown,
    sessionId?: string
  ): void {
    this.logger.error(
      "Provider operation failed",
      error instanceof Error ? error : new Error(String(error)),
      { providerId }
    );
    this.providerRegistry.handleRuntimeFailure(providerId, error);

    if (sessionId) {
      const binding = this.providerSessions.get(sessionId);
      if (binding) {
        binding.unsubscribe();
        this.providerSessions.delete(sessionId);
      }
      this.sessionManager.markProviderSessionFailed(sessionId);
      this.sessionStorage.close(sessionId, "provider-failure");
      this.broadcastSessionBinding(sessionId);
    }

    this.broadcaster({
      type: "session:error",
      payload: {
        sessionId: sessionId ?? null,
        providerId,
        message:
          error instanceof Error ? error.message : "Provider unavailable",
      },
    });

    if (!sessionId) {
      this.stateBroadcaster();
    }
  }

  private appendProviderMessage(
    sessionId: string,
    role: "assistant" | "system" | "thinking",
    event: unknown
  ): void {
    const content = this.extractMessageContent(event);
    if (!content) {
      return;
    }
    const message = this.sessionManager.appendMessage(sessionId, role, content);
    if (message) {
      this.sessionStorage.appendMessage(sessionId, message);
      this.broadcaster({ type: "session:message", payload: message });
    }
  }

  private appendDialogMessage(
    sessionId: string,
    payload: DialogMessagePayload
  ): void {
    if (!payload?.content || typeof payload.content !== "string") {
      return;
    }
    const role =
      payload.role === "user" ||
      payload.role === "assistant" ||
      payload.role === "thinking"
        ? payload.role
        : "assistant";
    const message = this.sessionManager.appendMessage(
      sessionId,
      role,
      payload.content,
      payload.timestamp
    );
    if (message) {
      this.sessionStorage.appendMessage(sessionId, message);
      this.broadcaster({ type: "session:message", payload: message });
    }
  }

  private extractMessageContent(event: unknown): string | null {
    if (!event || typeof event !== "object") {
      return null;
    }
    const typed = event as {
      readonly content?: unknown;
      readonly data?: unknown;
    };
    if (typeof typed.content === "string") {
      return typed.content;
    }
    if (typed.content && typeof typed.content === "object") {
      return JSON.stringify(typed.content);
    }
    if (typed.data) {
      return JSON.stringify(typed.data);
    }
    return null;
  }

  private updateProviderBinding(
    sessionId: string,
    providerSessionId?: string
  ): void {
    if (!providerSessionId) {
      return;
    }
    const binding = this.providerSessions.get(sessionId);
    if (binding) {
      binding.providerSessionId = providerSessionId;
    }
  }

  private updateBindingWithResolvedId(
    sessionId: string,
    providerSessionId: string
  ): void {
    const session = this.sessionManager.getSession(sessionId);
    if (
      !session ||
      (session.providerSessionStatus === "ready" &&
        session.providerSessionId === providerSessionId)
    ) {
      return;
    }
    this.sessionManager.updateProviderSessionId(sessionId, providerSessionId);
    this.sessionStorage.promote(sessionId, providerSessionId);
    this.updateProviderBinding(sessionId, providerSessionId);
    this.broadcastSessionBinding(sessionId);
  }

  private broadcastSessionBinding(sessionId: string): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }
    this.broadcaster({
      type: "session:binding",
      payload: {
        sessionId,
        providerSessionId: session.providerSessionId ?? null,
        status: session.providerSessionStatus,
      },
    });
    this.stateBroadcaster();
  }

  private handleSessionIdChangedEvent(
    sessionId: string,
    payload: unknown
  ): void {
    const typed = payload as SessionIdChangedPayload;
    if (typed?.newId) {
      this.updateBindingWithResolvedId(sessionId, typed.newId);
    }
  }

  private handleRealSessionIdEvent(sessionId: string, payload: unknown): void {
    const typed = payload as { readonly sessionId?: unknown };
    if (typeof typed?.sessionId === "string") {
      this.updateBindingWithResolvedId(sessionId, typed.sessionId);
    }
  }

  private getDefaultProviderId(): string {
    return this.providerRegistry.listProviders()[0]?.id ?? "claudeCodeCli";
  }

  private serializeSession(session: Session) {
    return {
      id: session.id,
      providerId: session.providerId,
      workspacePath: session.workspacePath,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      providerSessionId: session.providerSessionId ?? null,
      providerSessionStatus: session.providerSessionStatus,
    };
  }
}
