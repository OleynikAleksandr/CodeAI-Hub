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

  register(session: Session): void {
    const workspaceSlug =
      sanitizeWorkspaceSlug(session.workspacePath) || this.defaultWorkspaceSlug;
    const entry: PendingSession = {
      providerId: session.providerId,
      workspaceSlug,
      providerSessionId: session.providerSessionId,
      queue: [],
    };
    this.sessions.set(session.id, entry);
    if (session.providerSessionId) {
      this.initializeWriter(
        session.id,
        entry,
        workspaceSlug,
        session.providerSessionId
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
    this.initializeWriter(
      sessionId,
      entry,
      entry.workspaceSlug,
      providerSessionId
    );
  }

  appendMessage(sessionId: string, message: SessionMessage): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
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
    const providerSessionId =
      entry?.providerSessionId ?? session.providerSessionId;
    if (!providerSessionId) {
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

    const sanitizedProviderSessionId = sanitizeSessionId(providerSessionId);
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
        sessionId: sanitizedProviderSessionId,
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

  private initializeWriter(
    sessionId: string,
    entry: PendingSession,
    workspaceSlug: string,
    providerSessionId: string
  ): void {
    const sanitizedProviderSessionId = sanitizeSessionId(providerSessionId);
    if (
      entry.writer &&
      entry.writerSessionId === sanitizedProviderSessionId &&
      entry.providerSessionId === providerSessionId
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

    if (entry.writer && entry.writerSessionId !== sanitizedProviderSessionId) {
      entry.writer
        .close({ reason: "session-renamed" })
        .catch((error: unknown) => {
          this.logger.error(
            "Failed to close previous unified session writer",
            error as Error,
            {
              sessionId,
              providerId: entry.providerId,
            }
          );
        });
      entry.writer = undefined;
      entry.writerSessionId = undefined;
    }

    entry.writer = new UnifiedSessionWriter({
      rootDirectory: this.rootDirectory,
      workspaceSlug,
      provider: entry.providerId,
      sessionId: sanitizedProviderSessionId,
    });
    entry.writerSessionId = sanitizedProviderSessionId;
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
