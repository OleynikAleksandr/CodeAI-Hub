import type { SessionManager, SessionRole } from "../../session-manager";
import type {
  SessionTranslationFacade,
  SessionTranslationProviderId,
} from "../../session-translation/session-translation-facade";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { BridgeEvent } from "../types";

const resolveTranslationProviderId = (
  providerId: string | undefined
): SessionTranslationProviderId | undefined => {
  if (
    providerId === "claude" ||
    providerId === "codex" ||
    providerId === "gemini"
  ) {
    return providerId;
  }
  return undefined;
};

const MESSAGE_PREVIEW_LENGTH = 160;

export interface DialogMessagePayload {
  readonly content?: unknown;
  readonly role?: string;
  readonly tag?: string;
  readonly timestamp?: string;
  readonly uuid?: string;
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
  readonly sessionTranslation: SessionTranslationFacade;
}

type PersistedSessionMessage = Exclude<
  ReturnType<SessionManager["appendMessage"]>,
  null
>;

const isThinkingDisplayMessage = (
  message: Pick<PersistedSessionMessage, "role" | "tag">
): boolean =>
  message.role === "thinking" ||
  (message.role === "assistant" && message.tag === "thinking");

const buildMessagePreview = (content: string): string => {
  const normalized = content.replace(/\s+/gu, " ").trim();
  if (normalized.length <= MESSAGE_PREVIEW_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, MESSAGE_PREVIEW_LENGTH)}...`;
};

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
      messageId:
        typeof payload.uuid === "string" && payload.uuid.trim().length > 0
          ? payload.uuid.trim()
          : undefined,
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
    readonly messageId?: string;
    readonly timestamp?: string;
    readonly tag?: string;
  }): void {
    const emissionThinking = isThinkingDisplayMessage(options);
    const session = this.deps.sessionManager.getSession(options.sessionId);
    const providerId = resolveTranslationProviderId(session?.providerId);
    let visibilityAtEmission: "visible" | "hidden" | undefined;
    if (emissionThinking && providerId) {
      visibilityAtEmission =
        this.deps.sessionTranslation.resolveThinkingVisibilityForProvider(
          providerId
        )
          ? "visible"
          : "hidden";
    }
    const message = this.deps.sessionManager.appendMessage(
      options.sessionId,
      options.role,
      options.content,
      {
        ...(options.messageId ? { messageId: options.messageId } : {}),
        ...(options.timestamp ? { timestamp: options.timestamp } : {}),
        ...(options.tag ? { tag: options.tag } : {}),
        ...(visibilityAtEmission ? { visibilityAtEmission } : {}),
      }
    );
    if (!message) {
      return;
    }
    const thinkingMessage = isThinkingDisplayMessage(message);

    this.deps.sessionStorage
      .appendMessage(options.sessionId, message)
      .then(() => {
        if (thinkingMessage) {
          this.deps.logger.info(
            "Thinking dialog message persisted and ready for broadcast",
            {
              sessionId: options.sessionId,
              messageId: message.id,
              role: message.role,
              tag: message.tag,
              contentLength: message.content.length,
              preview: buildMessagePreview(message.content),
              timestamp: message.timestamp,
            }
          );
        }
        this.deps.broadcaster({ type: "session:message", payload: message });
        this.broadcastDialogMessage(options.sessionId, message);
        if (thinkingMessage) {
          this.deps.logger.info(
            "Thinking dialog message broadcast dispatched",
            {
              sessionId: options.sessionId,
              messageId: message.id,
              role: message.role,
              tag: message.tag,
              contentLength: message.content.length,
            }
          );
        }
        this.maybeTranslateDialogMessage(options.sessionId, message).catch(
          (error: unknown) => {
            this.deps.logger.warn("Failed to translate dialog message", {
              sessionId: options.sessionId,
              messageId: message.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        );
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
    message: PersistedSessionMessage
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

  private async maybeTranslateDialogMessage(
    sessionId: string,
    message: PersistedSessionMessage
  ): Promise<void> {
    if (isThinkingDisplayMessage(message)) {
      this.deps.logger.info(
        "Thinking dialog message entered translation pipeline",
        {
          sessionId,
          messageId: message.id,
          role: message.role,
          tag: message.tag,
          contentLength: message.content.length,
          preview: buildMessagePreview(message.content),
        }
      );
    }
    const session = this.deps.sessionManager.getSession(sessionId);
    const providerId = resolveTranslationProviderId(session?.providerId);
    const translated =
      await this.deps.sessionTranslation.translateDialogMessage({
        sessionId,
        messageId: message.id,
        role: message.role,
        tag: message.tag,
        content: message.content,
        ...(providerId ? { providerId } : {}),
      });
    if (!translated) {
      return;
    }

    this.deps.logger.info("Persisting session translation overlay", {
      sessionId,
      messageId: translated.messageId,
      sourceHash: translated.sourceHash,
      targetLanguage: translated.targetLanguage,
      translatedLength: translated.translatedContent.length,
    });
    await this.deps.sessionStorage.appendMessageTranslation(sessionId, {
      messageId: translated.messageId,
      sourceHash: translated.sourceHash,
      targetLanguage: translated.targetLanguage,
      translatedContent: translated.translatedContent,
    });
    this.deps.logger.info("Persisted session translation overlay", {
      sessionId,
      messageId: translated.messageId,
      sourceHash: translated.sourceHash,
      targetLanguage: translated.targetLanguage,
      translatedLength: translated.translatedContent.length,
    });
    const translationPayload = {
      sessionId: translated.sessionId,
      messageId: translated.messageId,
      sourceHash: translated.sourceHash,
      targetLanguage: translated.targetLanguage,
      localizedContent: translated.translatedContent,
    } as const;
    this.deps.broadcaster({
      type: "session:message_translation",
      payload: translationPayload,
    });
    const dialogId = this.deps.continuityRootBySessionId.get(sessionId) ?? null;
    this.deps.logger.info("Broadcasted session translation patch", {
      sessionId,
      dialogId,
      messageId: translated.messageId,
      sourceHash: translated.sourceHash,
      targetLanguage: translated.targetLanguage,
      translatedLength: translated.translatedContent.length,
    });
    if (!dialogId) {
      return;
    }
    this.deps.broadcaster({
      type: "dialog:message_translation",
      payload: {
        dialogId,
        sessionId,
        translation: translationPayload,
      },
    });
    this.deps.logger.info("Broadcasted dialog translation patch", {
      sessionId,
      dialogId,
      messageId: translated.messageId,
      sourceHash: translated.sourceHash,
      targetLanguage: translated.targetLanguage,
      translatedLength: translated.translatedContent.length,
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
