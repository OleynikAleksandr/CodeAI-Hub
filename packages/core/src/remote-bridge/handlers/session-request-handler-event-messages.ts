import type { SessionManager, SessionRole } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { BridgeEvent } from "../types";

export interface DialogMessagePayload {
  readonly content?: unknown;
  readonly role?: string;
  readonly tag?: string;
  readonly timestamp?: string;
}

export type MessageContentPayload =
  | string
  | {
      readonly text?: unknown;
      readonly content?: unknown;
      readonly turnOptions?: unknown;
    };

export interface MessageContentExtraction {
  readonly content: string;
  readonly turnOptions?: Record<string, unknown>;
}

interface SessionRequestHandlerEventMessagesDependencies {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly continuityRootBySessionId: Map<string, string>;
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
}

export class SessionRequestHandlerEventMessages {
  private readonly deps: SessionRequestHandlerEventMessagesDependencies;

  constructor(deps: SessionRequestHandlerEventMessagesDependencies) {
    this.deps = deps;
  }

  appendProviderMessage(
    sessionId: string,
    role: "assistant" | "system" | "thinking",
    event: unknown
  ): void {
    const content = this.extractProviderMessageContent(event);
    if (!content) {
      return;
    }
    const timestamp = this.extractEventTimestamp(event);
    this.appendAndBroadcastMessage({
      sessionId,
      role,
      content,
      timestamp,
    });
  }

  appendDialogMessage(sessionId: string, payload: DialogMessagePayload): void {
    if (!payload?.content || typeof payload.content !== "string") {
      return;
    }
    const role = this.normalizeDialogRole(payload.role);
    const tag =
      payload.tag && typeof payload.tag === "string" ? payload.tag : undefined;
    this.appendAndBroadcastMessage({
      sessionId,
      role,
      content: payload.content,
      timestamp: payload.timestamp,
      tag,
    });
  }

  extractMessageContentAndTurnOptions(
    payload: MessageContentPayload
  ): MessageContentExtraction | null {
    if (typeof payload === "string") {
      return { content: payload };
    }
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const typed = payload as {
      readonly text?: unknown;
      readonly content?: unknown;
      readonly turnOptions?: unknown;
    };
    let content: string | null = null;
    if (typeof typed.text === "string") {
      content = typed.text;
    } else if (typeof typed.content === "string") {
      content = typed.content;
    }

    if (!content) {
      return null;
    }

    const turnOptions =
      typed.turnOptions &&
      typeof typed.turnOptions === "object" &&
      !Array.isArray(typed.turnOptions)
        ? (typed.turnOptions as Record<string, unknown>)
        : undefined;

    return { content, turnOptions };
  }

  private appendAndBroadcastMessage(options: {
    readonly sessionId: string;
    readonly role: SessionRole;
    readonly content: string;
    readonly timestamp?: string;
    readonly tag?: string;
  }): void {
    const message = this.deps.sessionManager.appendMessage(
      options.sessionId,
      options.role,
      options.content,
      {
        ...(options.timestamp ? { timestamp: options.timestamp } : {}),
        ...(options.tag ? { tag: options.tag } : {}),
      }
    );
    if (!message) {
      return;
    }

    this.deps.sessionStorage
      .appendMessage(options.sessionId, message)
      .then(() => {
        this.deps.broadcaster({ type: "session:message", payload: message });
        this.broadcastDialogMessage(options.sessionId, message);
      })
      .catch((error: unknown) => {
        this.deps.logger.error(
          "Failed to append unified session record",
          error as Error,
          { sessionId: options.sessionId }
        );
      });
  }

  private broadcastDialogMessage(
    sessionId: string,
    message: ReturnType<SessionManager["appendMessage"]> extends infer T
      ? Exclude<T, null>
      : never
  ): void {
    const dialogId = this.deps.continuityRootBySessionId.get(sessionId) ?? null;
    if (!dialogId) {
      return;
    }
    this.deps.broadcaster({
      type: "dialog:message",
      payload: {
        dialogId,
        sessionId,
        message,
      },
    });
  }

  private normalizeDialogRole(role: string | undefined): SessionRole {
    if (role === "user" || role === "assistant" || role === "thinking") {
      return role;
    }
    return "assistant";
  }

  private extractProviderMessageContent(event: unknown): string | null {
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

  private extractEventTimestamp(event: unknown): string | undefined {
    if (!event || typeof event !== "object") {
      return undefined;
    }
    const typed = event as { readonly timestamp?: unknown };
    if (typeof typed.timestamp !== "string") {
      return undefined;
    }
    const normalized = typed.timestamp.trim();
    return Number.isNaN(Date.parse(normalized)) ? undefined : normalized;
  }
}
