import { homedir } from "node:os";
import path from "node:path";
import {
  type AppendMessageTranslationOptions,
  buildSessionFilePath,
  buildSessionTranslationFilePath,
  readSessionEvents,
  readSessionTranslationOverlayMap,
  type SessionMessageRecord,
  SessionTranslationOverlayWriter,
  sanitizeWorkspaceSlug,
  UnifiedSessionWriter,
} from "@codeai-hub/unified-session";
import type { Session, SessionMessage } from "../session-manager";
import { SessionMessageLocalizationProjector } from "../session-translation/session-message-localization-projector";
import type { Logger } from "../telemetry/logger";
import { resolveWorkspaceRuntimeCapsule } from "../workflow/runtime/workspace-runtime-capsule";
import { getWorkspaceKeyFromPath } from "../workspaces/workspace-key";
import { coalesceLiveAssistantMessageRecords } from "./live-message-coalescer";
import {
  listStandaloneWorkspaceChats,
  resolveStandaloneWorkspaceSessionRoot,
  STANDALONE_WORKSPACE_SESSION_SLUG,
  type StandaloneWorkspaceChatSummary,
} from "./standalone-workspace-chat-list";
import {
  backfillUnifiedSessionHistory,
  tryPromoteSessionFile,
} from "./unified-session-backfill";
import { UnifiedSessionStorageDiagnostics } from "./unified-session-storage-diagnostics";
import { listUnifiedSessionWorkspaceSlugs } from "./workspace-slugs";

const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");
export const WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG = "unified";
const sanitizeSessionId = (value: string): string =>
  sanitizeWorkspaceSlug(value);

interface PendingSession {
  historySessionId: string;
  readonly historySessionIdLocked: boolean;
  readonly providerId: string;
  providerSessionId?: string;
  readonly rootDirectory: string;
  translationWriter?: SessionTranslationOverlayWriter;
  readonly workspaceSlug: string;
  writer?: UnifiedSessionWriter;
  writerSessionId?: string;
}

interface SessionHistoryTarget {
  readonly rootDirectory: string;
  readonly workspaceSlug: string;
}

export class UnifiedSessionStorage {
  private readonly logger: Logger;
  private readonly diagnostics: UnifiedSessionStorageDiagnostics;
  private readonly defaultWorkspaceSlug: string;
  private readonly localizationProjector =
    new SessionMessageLocalizationProjector();
  private readonly rootDirectory: string;
  private readonly sessions = new Map<string, PendingSession>();

  constructor(options: {
    readonly workspaceSlug?: string;
    readonly rootDirectory?: string;
    readonly logger: Logger;
  }) {
    this.logger = options.logger;
    this.diagnostics = new UnifiedSessionStorageDiagnostics({
      logger: options.logger,
      rootDirectory: options.rootDirectory ?? SESSION_ROOT,
    });
    this.defaultWorkspaceSlug = options.workspaceSlug
      ? sanitizeWorkspaceSlug(options.workspaceSlug)
      : "default-workspace";
    this.rootDirectory = options.rootDirectory ?? SESSION_ROOT;
  }

  private resolveSessionHistoryTarget(session: Session): SessionHistoryTarget {
    if (session.initiativeSlug && session.stage && session.workspacePath) {
      const capsule = resolveWorkspaceRuntimeCapsule({
        workspaceRoot: session.workspacePath,
        workspaceSlug: session.initiativeSlug,
      });
      return {
        rootDirectory: capsule.sessionsRoot.absolutePath,
        workspaceSlug: WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
      };
    }
    if (session.workspacePath && session.stage === null) {
      return {
        rootDirectory: resolveStandaloneWorkspaceSessionRoot(
          session.workspacePath
        ),
        workspaceSlug: STANDALONE_WORKSPACE_SESSION_SLUG,
      };
    }
    return {
      rootDirectory: this.rootDirectory,
      workspaceSlug: getWorkspaceKeyFromPath(
        session.workspacePath,
        this.defaultWorkspaceSlug
      ),
    };
  }

  register(
    session: Session,
    options?: { readonly historySessionId?: string | null }
  ): void {
    const historyTarget = this.resolveSessionHistoryTarget(session);
    const overrideHistorySessionId =
      options?.historySessionId && options.historySessionId.trim().length > 0
        ? options.historySessionId.trim()
        : null;
    const initialHistorySessionId = sanitizeSessionId(
      overrideHistorySessionId ?? session.providerSessionId ?? session.id
    );
    const entry: PendingSession = {
      providerId: session.providerId,
      rootDirectory: historyTarget.rootDirectory,
      workspaceSlug: historyTarget.workspaceSlug,
      providerSessionId: session.providerSessionId,
      historySessionId: initialHistorySessionId,
      historySessionIdLocked: Boolean(overrideHistorySessionId),
    };
    this.sessions.set(session.id, entry);
  }

  promote(sessionId: string, providerSessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return;
    }
    if (entry.providerSessionId === providerSessionId && entry.writer) {
      return;
    }
    entry.providerSessionId = providerSessionId;
    const desiredHistorySessionId = entry.historySessionIdLocked
      ? entry.historySessionId
      : sanitizeSessionId(providerSessionId);
    entry.historySessionId = desiredHistorySessionId;
    // Avoid creating empty JSONL files that only contain the session-open marker.
    // A writer is initialized lazily on first message unless a writer already
    // exists and must follow the promoted history id.
    if (entry.writer) {
      this.initializeWriter(
        entry,
        entry.workspaceSlug,
        desiredHistorySessionId
      );
    }
  }

  async appendMessage(
    sessionId: string,
    message: SessionMessage
  ): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return;
    }
    if (
      message.role === "thinking" &&
      (message.content.trim().length === 0 ||
        message.content.trim() === "<!-- -->")
    ) {
      return;
    }
    if (!entry.writer) {
      this.initializeWriter(entry, entry.workspaceSlug, entry.historySessionId);
      if (!entry.writer) {
        throw new Error(
          `Unified session writer missing for ${entry.providerId} session ${sessionId}`
        );
      }
    }
    await this.writeMessage(entry, message);
  }

  async appendMessageTranslation(
    sessionId: string,
    translation: AppendMessageTranslationOptions
  ): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return;
    }
    if (!entry.translationWriter) {
      entry.translationWriter = new SessionTranslationOverlayWriter({
        rootDirectory: entry.rootDirectory,
        workspaceSlug: entry.workspaceSlug,
        provider: entry.providerId,
        sessionId: entry.historySessionId,
      });
    }
    await entry.translationWriter.appendTranslation(translation);
    this.diagnostics.logTranslationOverlayAppended({
      sessionId,
      providerId: entry.providerId,
      workspaceSlug: entry.workspaceSlug,
      historySessionId: entry.historySessionId,
      translation,
    });
  }

  async readMessageTranslationMap(
    session: Session
  ): Promise<Map<string, AppendMessageTranslationOptions>> {
    const entry = this.sessions.get(session.id);
    const historySessionId = sanitizeSessionId(
      entry?.historySessionId ?? session.providerSessionId ?? session.id
    );
    if (!historySessionId) {
      return new Map();
    }

    const preferredWorkspaceSlug =
      entry?.workspaceSlug ||
      getWorkspaceKeyFromPath(session.workspacePath, this.defaultWorkspaceSlug);
    const rootDirectory = entry?.rootDirectory ?? this.rootDirectory;
    const workspaceSlugs = await listUnifiedSessionWorkspaceSlugs({
      rootDirectory,
      logger: this.logger,
    });
    const candidates = new Set<string>([
      preferredWorkspaceSlug,
      ...workspaceSlugs,
    ]);

    const translations = new Map<string, AppendMessageTranslationOptions>();
    for (const workspaceSlug of candidates) {
      const filePath = buildSessionTranslationFilePath({
        rootDirectory,
        workspaceSlug,
        provider: session.providerId,
        sessionId: historySessionId,
      });
      const records = await readSessionTranslationOverlayMap(filePath);
      for (const [messageId, record] of records) {
        translations.set(messageId, {
          messageId: record.messageId,
          sourceHash: record.sourceHash,
          targetLanguage: record.targetLanguage,
          timestamp: record.timestamp,
          translatedContent: record.translatedContent,
        });
      }
    }
    return translations;
  }

  close(sessionId: string, reason?: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return;
    }
    const closeTasks: Promise<void>[] = [];
    const writer = entry.writer;
    if (writer) {
      closeTasks.push(
        writer.close({ reason }).catch((error: unknown) => {
          this.logger.error(
            "Failed to close unified session writer",
            error as Error,
            {
              sessionId,
              providerId: entry.providerId,
            }
          );
        })
      );
    }
    if (entry.translationWriter) {
      closeTasks.push(
        entry.translationWriter.close().catch((error: unknown) => {
          this.logger.error(
            "Failed to close unified session translation overlay writer",
            error as Error,
            {
              sessionId,
              providerId: entry.providerId,
            }
          );
        })
      );
    }
    if (closeTasks.length === 0) {
      this.sessions.delete(sessionId);
      return;
    }
    Promise.all(closeTasks).finally(() => {
      if (this.sessions.get(sessionId) === entry) {
        this.sessions.delete(sessionId);
      }
    });
  }

  async readMessages(session: Session): Promise<SessionMessage[]> {
    const entry = this.sessions.get(session.id);
    const historySessionId = sanitizeSessionId(
      entry?.historySessionId ?? session.providerSessionId ?? session.id
    );
    if (!historySessionId) {
      return [];
    }

    const preferredWorkspaceSlug =
      entry?.workspaceSlug ||
      getWorkspaceKeyFromPath(session.workspacePath, this.defaultWorkspaceSlug);
    const rootDirectory = entry?.rootDirectory ?? this.rootDirectory;
    const workspaceSlugs = await listUnifiedSessionWorkspaceSlugs({
      rootDirectory,
      logger: this.logger,
    });
    const candidates = new Set<string>([
      preferredWorkspaceSlug,
      ...workspaceSlugs,
    ]);

    const messagesById = new Map<string, SessionMessageRecord>();
    for (const workspaceSlug of candidates) {
      const filePath = buildSessionFilePath({
        rootDirectory,
        workspaceSlug,
        provider: session.providerId,
        sessionId: historySessionId,
      });
      const records = await readSessionEvents(filePath);
      for (const record of records) {
        if (record.type !== "message") {
          continue;
        }
        if (messagesById.has(record.messageId)) {
          continue;
        }
        messagesById.set(record.messageId, record);
      }
    }

    const records = Array.from(messagesById.values());
    records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const messages = coalesceLiveAssistantMessageRecords(records).map(
      (record) => ({
        id: record.messageId,
        role: record.role,
        content: record.content,
        sessionId: session.id,
        timestamp: record.timestamp,
      })
    );

    const translations = await this.readMessageTranslationMap(session);
    return messages.map((message) => {
      const localizedContent =
        this.localizationProjector.resolveLocalizedContent({
          message,
          translations,
        });
      return localizedContent
        ? {
            ...message,
            localizedContent,
          }
        : message;
    });
  }

  async listStandaloneWorkspaceChats(options: {
    readonly liveSessions: readonly Session[];
    readonly workspacePath: string;
  }): Promise<StandaloneWorkspaceChatSummary[]> {
    return await listStandaloneWorkspaceChats(options);
  }

  async backfillHistory(options: {
    readonly workspaceSlug: string;
    readonly providerId: string;
    readonly historySessionId: string;
    readonly sourceSessionIds: readonly string[];
  }): Promise<void> {
    await backfillUnifiedSessionHistory(
      {
        ...options,
        rootDirectory: this.rootDirectory,
        logger: this.logger,
      },
      (ws, pid, wid) =>
        Array.from(this.sessions.values()).some(
          (entry) =>
            entry.workspaceSlug === ws &&
            entry.providerId === pid &&
            entry.writer &&
            entry.writerSessionId === wid
        )
    );
  }

  promoteHistoryFile(options: {
    readonly rootDirectory?: string;
    readonly workspaceSlug: string;
    readonly providerId: string;
    readonly fromHistorySessionId: string;
    readonly toHistorySessionId: string;
  }): void {
    const fromSessionId = sanitizeSessionId(options.fromHistorySessionId);
    const toSessionId = sanitizeSessionId(options.toHistorySessionId);
    if (fromSessionId.length === 0 || toSessionId.length === 0) {
      return;
    }
    if (fromSessionId === toSessionId) {
      return;
    }
    this.callPromoteSessionFile({
      workspaceSlug: sanitizeWorkspaceSlug(options.workspaceSlug),
      providerId: options.providerId,
      fromSessionId,
      rootDirectory: options.rootDirectory ?? this.rootDirectory,
      toSessionId,
    });
  }

  private initializeWriter(
    entry: PendingSession,
    workspaceSlug: string,
    historySessionId: string
  ): void {
    const sanitizedHistorySessionId = sanitizeSessionId(historySessionId);
    if (
      entry.writer &&
      entry.writerSessionId === sanitizedHistorySessionId &&
      entry.historySessionId === historySessionId
    ) {
      return;
    }

    if (entry.writer && entry.writerSessionId !== sanitizedHistorySessionId) {
      if (entry.writerSessionId && !entry.historySessionIdLocked) {
        this.callPromoteSessionFile({
          workspaceSlug,
          providerId: entry.providerId,
          fromSessionId: entry.writerSessionId,
          rootDirectory: entry.rootDirectory,
          toSessionId: sanitizedHistorySessionId,
        });
      }
      entry.writerSessionId = sanitizedHistorySessionId;

      return;
    }

    entry.writer = new UnifiedSessionWriter({
      rootDirectory: entry.rootDirectory,
      workspaceSlug,
      provider: entry.providerId,
      sessionId: sanitizedHistorySessionId,
    });
    entry.writerSessionId = sanitizedHistorySessionId;
  }

  private callPromoteSessionFile(options: {
    readonly rootDirectory: string;
    readonly workspaceSlug: string;
    readonly providerId: string;
    readonly fromSessionId: string;
    readonly toSessionId: string;
  }): void {
    tryPromoteSessionFile({
      ...options,
      logger: this.logger,
    });
  }

  private async writeMessage(entry: PendingSession, message: SessionMessage) {
    if (!entry.writer) {
      throw new Error(
        `Unified session writer missing for ${entry.providerId} session ${message.sessionId}`
      );
    }
    const translationState = (
      message as { readonly translationState?: "pending" }
    ).translationState;
    await entry.writer.appendMessage({
      messageId: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      ...(message.tag ? { tag: message.tag } : {}),
      ...(translationState ? { translationState } : {}),
    });
    this.diagnostics.logThinkingMessageAppended({
      providerId: entry.providerId,
      workspaceSlug: entry.workspaceSlug,
      historySessionId: entry.historySessionId,
      message,
    });
  }
}
