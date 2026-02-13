import { existsSync, renameSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
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
import { listUnifiedSessionWorkspaceSlugs } from "./workspace-slugs";

const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");
const sanitizeSessionId = (value: string): string =>
  sanitizeWorkspaceSlug(value);

type PendingSession = {
  readonly providerId: string;
  readonly workspaceSlug: string;
  providerSessionId?: string;
  historySessionId: string;
  readonly historySessionIdLocked: boolean;
  writer?: UnifiedSessionWriter;
  writerSessionId?: string;
  readonly queue: SessionMessage[];
};

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
    const workspaceSlug =
      sanitizeWorkspaceSlug(session.workspacePath) || this.defaultWorkspaceSlug;
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
    if (session.providerSessionId) {
      this.initializeWriter(
        session.id,
        entry,
        workspaceSlug,
        entry.historySessionId
      );
    }
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
    this.initializeWriter(
      sessionId,
      entry,
      entry.workspaceSlug,
      desiredHistorySessionId
    );
  }

  appendMessage(sessionId: string, message: SessionMessage): void {
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
      entry.queue.push(message);
      return;
    }
    this.writeMessage(entry, message).catch((error: unknown) => {
      this.logger.error(
        "Failed to append unified session record",
        error as Error,
        {
          sessionId,
          providerId: entry.providerId,
        }
      );
    });
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
      sanitizeWorkspaceSlug(session.workspacePath) ||
      this.defaultWorkspaceSlug;
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
    const workspaceSlug = sanitizeWorkspaceSlug(options.workspaceSlug);
    const providerId = options.providerId;
    const historySessionId = sanitizeSessionId(options.historySessionId);
    const sourceSessionIds = Array.from(
      new Set(
        options.sourceSessionIds
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
          .map(sanitizeSessionId)
      )
    );

    if (historySessionId.length === 0 || sourceSessionIds.length === 0) {
      return;
    }

    // Avoid rewriting a file that a live writer is actively appending to.
    const sanitizedWriterId = sanitizeSessionId(historySessionId);
    const inUse = Array.from(this.sessions.values()).some(
      (entry) =>
        entry.workspaceSlug === workspaceSlug &&
        entry.providerId === providerId &&
        entry.writer &&
        entry.writerSessionId === sanitizedWriterId
    );
    if (inUse) {
      this.logger.warn("Skipping unified-session backfill (writer in use)", {
        providerId,
        workspaceSlug,
        historySessionId,
      });
      return;
    }

    const messageById = new Map<
      string,
      {
        readonly messageId: string;
        readonly role: SessionMessage["role"];
        readonly content: string;
        readonly timestamp: string;
      }
    >();

    for (const sessionId of sourceSessionIds) {
      const filePath = buildSessionFilePath({
        rootDirectory: this.rootDirectory,
        workspaceSlug,
        provider: providerId,
        sessionId,
      });
      const records = await readSessionEvents(filePath);
      for (const record of records) {
        if (record.type !== "message") {
          continue;
        }
        if (messageById.has(record.messageId)) {
          continue;
        }
        messageById.set(record.messageId, {
          messageId: record.messageId,
          role: record.role,
          content: record.content,
          timestamp: record.timestamp,
        });
      }
    }

    if (messageById.size === 0) {
      return;
    }

    const merged = Array.from(messageById.values());
    merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const targetPath = buildSessionFilePath({
      rootDirectory: this.rootDirectory,
      workspaceSlug,
      provider: providerId,
      sessionId: historySessionId,
    });
    const tmpPath = `${targetPath}.tmp-${Date.now()}`;

    const openRecord = JSON.stringify({
      type: "session-open",
      timestamp: new Date().toISOString(),
      provider: providerId,
      sessionId: historySessionId,
    });
    const lines = [
      openRecord,
      ...merged.map((message) =>
        JSON.stringify({
          type: "message",
          timestamp: message.timestamp,
          provider: providerId,
          messageId: message.messageId,
          role: message.role,
          content: message.content,
        })
      ),
    ];

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(tmpPath, `${lines.join("\n")}\n`, "utf8");
    await rename(tmpPath, targetPath);
  }

  promoteHistoryFile(options: {
    readonly workspaceSlug: string;
    readonly providerId: string;
    readonly fromHistorySessionId: string;
    readonly toHistorySessionId: string;
  }): void {
    const workspaceSlug = sanitizeWorkspaceSlug(options.workspaceSlug);
    const providerId = options.providerId;
    const fromSessionId = sanitizeSessionId(options.fromHistorySessionId);
    const toSessionId = sanitizeSessionId(options.toHistorySessionId);
    if (fromSessionId.length === 0 || toSessionId.length === 0) {
      return;
    }
    if (fromSessionId === toSessionId) {
      return;
    }
    this.tryPromoteSessionFile({
      workspaceSlug,
      providerId,
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
        this.tryPromoteSessionFile({
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

  private tryPromoteSessionFile(options: {
    readonly workspaceSlug: string;
    readonly providerId: string;
    readonly fromSessionId: string;
    readonly toSessionId: string;
  }): void {
    const fromPath = buildSessionFilePath({
      rootDirectory: this.rootDirectory,
      workspaceSlug: options.workspaceSlug,
      provider: options.providerId,
      sessionId: options.fromSessionId,
    });
    const toPath = buildSessionFilePath({
      rootDirectory: this.rootDirectory,
      workspaceSlug: options.workspaceSlug,
      provider: options.providerId,
      sessionId: options.toSessionId,
    });

    if (!existsSync(fromPath) || existsSync(toPath)) {
      return;
    }

    try {
      renameSync(fromPath, toPath);
    } catch (error) {
      this.logger.warn("Failed to promote unified session log file", {
        providerId: options.providerId,
        workspaceSlug: options.workspaceSlug,
        fromPath,
        toPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
      entry.queue.push(message);
      return;
    }
    await entry.writer.appendMessage({
      messageId: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    });
  }
}
