import {
  type AppendMessageTranslationOptions,
  buildSessionFilePath,
  buildSessionTranslationFilePath,
} from "@codeai-hub/unified-session";
import type { SessionMessage } from "../session-manager";
import type { Logger } from "../telemetry/logger";

const STORAGE_PREVIEW_LENGTH = 160;

const isThinkingDisplayMessage = (message: SessionMessage): boolean =>
  message.role === "thinking" ||
  (message.role === "assistant" && message.tag === "thinking");

const buildMessagePreview = (content: string): string => {
  const normalized = content.replace(/\s+/gu, " ").trim();
  if (normalized.length <= STORAGE_PREVIEW_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, STORAGE_PREVIEW_LENGTH)}...`;
};

interface UnifiedSessionStorageMessageLogOptions {
  readonly historySessionId: string;
  readonly message: SessionMessage;
  readonly providerId: string;
  readonly workspaceSlug: string;
}

interface UnifiedSessionStorageTranslationLogOptions {
  readonly historySessionId: string;
  readonly providerId: string;
  readonly sessionId: string;
  readonly translation: AppendMessageTranslationOptions;
  readonly workspaceSlug: string;
}

export class UnifiedSessionStorageDiagnostics {
  private readonly logger: Logger;
  private readonly rootDirectory: string;

  constructor(options: {
    readonly logger: Logger;
    readonly rootDirectory: string;
  }) {
    this.logger = options.logger;
    this.rootDirectory = options.rootDirectory;
  }

  logThinkingMessageAppended(
    options: UnifiedSessionStorageMessageLogOptions
  ): void {
    if (!isThinkingDisplayMessage(options.message)) {
      return;
    }
    this.logger.info("Unified session thinking message appended", {
      sessionId: options.message.sessionId,
      providerId: options.providerId,
      workspaceSlug: options.workspaceSlug,
      historySessionId: options.historySessionId,
      messageId: options.message.id,
      role: options.message.role,
      tag: options.message.tag,
      contentLength: options.message.content.length,
      preview: buildMessagePreview(options.message.content),
      timestamp: options.message.timestamp,
      filePath: buildSessionFilePath({
        rootDirectory: this.rootDirectory,
        workspaceSlug: options.workspaceSlug,
        provider: options.providerId,
        sessionId: options.historySessionId,
      }),
    });
  }

  logTranslationOverlayAppended(
    options: UnifiedSessionStorageTranslationLogOptions
  ): void {
    this.logger.info("Unified session translation overlay appended", {
      sessionId: options.sessionId,
      providerId: options.providerId,
      workspaceSlug: options.workspaceSlug,
      historySessionId: options.historySessionId,
      messageId: options.translation.messageId,
      sourceHash: options.translation.sourceHash,
      targetLanguage: options.translation.targetLanguage,
      translatedLength: options.translation.translatedContent.length,
      filePath: buildSessionTranslationFilePath({
        rootDirectory: this.rootDirectory,
        workspaceSlug: options.workspaceSlug,
        provider: options.providerId,
        sessionId: options.historySessionId,
      }),
    });
  }
}
