import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  readSessionEvents,
  sanitizeWorkspaceSlug,
  UnifiedSessionWriter,
} from "@codeai-hub/unified-session";
import type { Session, SessionMessage } from "../session-manager";
import type { Logger } from "../telemetry/logger";
import { getWorkspaceKeyFromPath } from "../workspaces/workspace-key";
import {
  backfillUnifiedSessionHistory,
  tryPromoteSessionFile,
} from "./unified-session-backfill";
import { listUnifiedSessionWorkspaceSlugs } from "./workspace-slugs";

const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");
const sanitizeSessionId = (value: string): string =>
  sanitizeWorkspaceSlug(value);

interface PendingSession {
  historySessionId: string;
  readonly historySessionIdLocked: boolean;
  readonly providerId: string;
  providerSessionId?: string;
  readonly queue: SessionMessage[];
  readonly workspaceSlug: string;
  writer?: UnifiedSessionWriter;
  writerSessionId?: string;
}

export class UnifiedSessionStorage {
  private readonly logger: Logger;
  private readonly defaultWorkspaceSlug: string;
  private readonly rootDirectory: string;
  private readonly sessions = new Map<string, PendingSession>();

  constructor(options: {
    readonly workspaceSlug?: string;
    readonly rootDirectory?: string;
    readonly logger: Logger;
  }) {
    this.logger = options.logger;
    this.defaultWorkspaceSlug = options.workspaceSlug
      ? sanitizeWorkspaceSlug(options.workspaceSlug)
      : "default-workspace";
    this.rootDirectory = options.rootDirectory ?? SESSION_ROOT;
  }

  register(
    session: Session,
    options?: { readonly historySessionId?: string | null }
  ): void {
    const workspaceSlug = getWorkspaceKeyFromPath(
      session.workspacePath,
      this.defaultWorkspaceSlug
    );
    const overrideHistorySessionId =
      options?.historySessionId && options.historySessionId.trim().length > 0
        ? options.historySessionId.trim()
        : null;
    const initialHistorySessionId = sanitizeSessionId(
      overrideHistorySessionId ?? session.providerSessionId ?? session.id
    );
    const entry: PendingSession = {
      providerId: session.providerId,
      workspaceSlug,
      providerSessionId: session.providerSessionId,
      historySessionId: initialHistorySessionId,
      historySessionIdLocked: Boolean(overrideHistorySessionId),
      queue: [],
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
    // A writer is initialized lazily (on first message) unless we already have a
    // writer handle or queued messages that need flushing.
    if (entry.writer || entry.queue.length > 0) {
      this.initializeWriter(
        sessionId,
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
    // Codex/SDK sometimes emits placeholder thinking markers (e.g. `<!-- -->`)
    // that are not user-visible and only add noise to the UI transcript.
    if (
      message.role === "thinking" &&
      (message.content.trim().length === 0 ||
        message.content.trim() === "<!-- -->")
    ) {
      return;
    }
    if (!entry.writer) {
      this.initializeWriter(
        sessionId,
        entry,
        entry.workspaceSlug,
        entry.historySessionId
      );
      if (!entry.writer) {
        throw new Error(
          `Unified session writer missing for ${entry.providerId} session ${sessionId}`
        );
      }
    }
    await this.writeMessage(entry, message);
  }

  close(sessionId: string, reason?: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return;
    }
    this.sessions.delete(sessionId);
    const writer = entry.writer;
    if (writer) {
      writer.close({ reason }).catch((error: unknown) => {
        this.logger.error(
          "Failed to close unified session writer",
          error as Error,
          {
            sessionId,
            providerId: entry.providerId,
          }
        );
      });
    }
  }

  async readMessages(session: Session): Promise<SessionMessage[]> {
    const entry = this.sessions.get(session.id);
    const historySessionId = sanitizeSessionId(
      entry?.historySessionId ?? session.providerSessionId ?? session.id
    );
    if (!historySessionId) {
      return [];
    }

    if (entry?.writer) {
      await this.flushQueue(entry).catch((error: unknown) => {
        this.logger.error(
          "Failed to flush unified session record",
          error as Error,
          {
            sessionId: session.id,
            providerId: entry.providerId,
          }
        );
      });
    }

    const preferredWorkspaceSlug =
      entry?.workspaceSlug ||
      getWorkspaceKeyFromPath(session.workspacePath, this.defaultWorkspaceSlug);
    const workspaceSlugs = await listUnifiedSessionWorkspaceSlugs({
      rootDirectory: this.rootDirectory,
      logger: this.logger,
    });
    const candidates = new Set<string>([
      preferredWorkspaceSlug,
      ...workspaceSlugs,
    ]);

    const messagesById = new Map<string, SessionMessage>();
    for (const workspaceSlug of candidates) {
      const filePath = buildSessionFilePath({
        rootDirectory: this.rootDirectory,
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
        messagesById.set(record.messageId, {
          id: record.messageId,
          role: record.role,
          content: record.content,
          sessionId: session.id,
          timestamp: record.timestamp,
        });
      }
    }

    const messages = Array.from(messagesById.values());
    messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return messages;
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
      toSessionId,
    });
  }

  private initializeWriter(
    sessionId: string,
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
      this.flushQueue(entry).catch((error: unknown) => {
        this.logger.error(
          "Failed to flush unified session record",
          error as Error,
          {
            sessionId,
            providerId: entry.providerId,
          }
        );
      });
      return;
    }

    if (entry.writer && entry.writerSessionId !== sanitizedHistorySessionId) {
      // Codex/Claude sessions may start with a provisional id and later "promote"
      // to the real provider session id. Keep a single history file by renaming
      // the existing JSONL instead of creating a second one.
      if (entry.writerSessionId && !entry.historySessionIdLocked) {
        this.callPromoteSessionFile({
          workspaceSlug,
          providerId: entry.providerId,
          fromSessionId: entry.writerSessionId,
          toSessionId: sanitizedHistorySessionId,
        });
      }

      // Keep using the existing writer handle; only update our bookkeeping so
      // reads and future flushes target the promoted session id.
      entry.writerSessionId = sanitizedHistorySessionId;

      this.flushQueue(entry).catch((error: unknown) => {
        this.logger.error(
          "Failed to flush unified session record",
          error as Error,
          {
            sessionId,
            providerId: entry.providerId,
          }
        );
      });
      return;
    }

    entry.writer = new UnifiedSessionWriter({
      rootDirectory: this.rootDirectory,
      workspaceSlug,
      provider: entry.providerId,
      sessionId: sanitizedHistorySessionId,
    });
    entry.writerSessionId = sanitizedHistorySessionId;
    this.flushQueue(entry).catch((error: unknown) => {
      this.logger.error(
        "Failed to flush unified session record",
        error as Error,
        {
          sessionId,
          providerId: entry.providerId,
        }
      );
    });
  }

  private callPromoteSessionFile(options: {
    readonly workspaceSlug: string;
    readonly providerId: string;
    readonly fromSessionId: string;
    readonly toSessionId: string;
  }): void {
    tryPromoteSessionFile({
      ...options,
      rootDirectory: this.rootDirectory,
      logger: this.logger,
    });
  }

  private async flushQueue(entry: PendingSession): Promise<void> {
    if (!entry.writer || entry.queue.length === 0) {
      return;
    }
    const queue = entry.queue.splice(0, entry.queue.length);
    for (const message of queue) {
      try {
        await this.writeMessage(entry, message);
      } catch (error) {
        this.logger.error(
          "Failed to flush unified session record",
          error as Error,
          {
            sessionId: message.sessionId,
            providerId: entry.providerId,
          }
        );
      }
    }
  }

  private async writeMessage(
    entry: PendingSession,
    message: SessionMessage
  ): Promise<void> {
    if (!entry.writer) {
      throw new Error(
        `Unified session writer missing for ${entry.providerId} session ${message.sessionId}`
      );
    }
    await entry.writer.appendMessage({
      messageId: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      ...(message.tag ? { tag: message.tag } : {}),
    });
  }
}
