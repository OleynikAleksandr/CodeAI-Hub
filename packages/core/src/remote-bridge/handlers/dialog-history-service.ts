import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  readSessionEvents,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import type { Logger } from "../../telemetry/logger";
import { DialogOpenService } from "./dialog-open-service";

const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");

export type DialogHistoryMessage = {
  readonly messageId: string;
  readonly role: "system" | "user" | "assistant" | "thinking";
  readonly content: string;
  readonly timestamp: string;
  readonly tag?: string;
};

export type DialogHistoryResult = {
  readonly messages: readonly DialogHistoryMessage[];
  readonly lastCursor: number;
};

type SessionRecord = Awaited<ReturnType<typeof readSessionEvents>>[number];
type SessionMessageRecord = Extract<
  SessionRecord,
  { readonly type: "message" }
>;

export class DialogHistoryService {
  private readonly logger: Logger;
  private readonly openService: DialogOpenService;

  constructor(options: { readonly logger: Logger }) {
    this.logger = options.logger;
    this.openService = new DialogOpenService(options);
  }

  private appendMessageRecord(
    byId: Map<string, DialogHistoryMessage>,
    record: SessionRecord
  ): void {
    if (record.type !== "message") {
      return;
    }
    const messageRecord = record as SessionMessageRecord;
    if (byId.has(messageRecord.messageId)) {
      return;
    }
    byId.set(messageRecord.messageId, {
      messageId: messageRecord.messageId,
      role: messageRecord.role,
      content: messageRecord.content,
      timestamp: messageRecord.timestamp,
      ...(messageRecord.tag ? { tag: messageRecord.tag } : {}),
    });
  }

  private normalizeCursor(options: {
    readonly cursor?: number | null;
    readonly lastCursor: number;
  }): number {
    const cursor =
      typeof options.cursor === "number" && Number.isFinite(options.cursor)
        ? Math.trunc(options.cursor)
        : 0;
    return Math.max(0, Math.min(cursor, options.lastCursor));
  }

  private buildMessagesFromRecords(
    records: readonly SessionRecord[],
    cursor?: number | null
  ): DialogHistoryResult {
    const lastCursor = records.length;
    const requestedCursor = this.normalizeCursor({ cursor, lastCursor });
    const slice =
      requestedCursor > 0 ? records.slice(requestedCursor) : records;

    const byId = new Map<string, DialogHistoryMessage>();
    for (const record of slice) {
      this.appendMessageRecord(byId, record);
    }

    const messages = Array.from(byId.values());
    messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return { messages, lastCursor };
  }

  private async readHistoryFromFile(options: {
    readonly filePath: string;
    readonly cursor?: number | null;
  }): Promise<DialogHistoryResult> {
    const records = await readSessionEvents(options.filePath);
    return this.buildMessagesFromRecords(records, options.cursor);
  }

  private async resolveProviderIds(options: {
    readonly workspaceKey: string;
    readonly preferredProviderId: string | null;
  }): Promise<readonly string[]> {
    const providerIds: string[] = [];
    if (options.preferredProviderId) {
      providerIds.push(options.preferredProviderId);
    }

    try {
      const workspaceDir = path.join(SESSION_ROOT, options.workspaceKey);
      const entries = await readdir(workspaceDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        if (entry.name === options.preferredProviderId) {
          continue;
        }
        providerIds.push(entry.name);
      }
    } catch {
      // ignore: cold start может быть раньше, чем появится sessions/<workspaceKey>
    }

    return providerIds;
  }

  async readHistory(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly dialogId: string;
    readonly cursor?: number | null;
  }): Promise<DialogHistoryResult> {
    const dialog = await this.openService.openDialog({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
      dialogId: options.dialogId,
    });
    const workspaceKey = sanitizeWorkspaceSlug(options.workspaceRoot);
    const sessionId = sanitizeWorkspaceSlug(options.dialogId);
    const providerIds = await this.resolveProviderIds({
      workspaceKey,
      preferredProviderId: dialog?.providerId ?? null,
    });

    if (providerIds.length === 0) {
      return { messages: [], lastCursor: 0 };
    }

    let lastError: unknown = null;
    for (const providerId of providerIds) {
      const filePath = buildSessionFilePath({
        rootDirectory: SESSION_ROOT,
        workspaceSlug: workspaceKey,
        provider: providerId,
        sessionId,
      });

      try {
        return await this.readHistoryFromFile({
          filePath,
          cursor: options.cursor,
        });
      } catch (error: unknown) {
        lastError = error;
      }
    }

    this.logger.warn("Failed to read dialog history", {
      workspaceSlug: options.workspaceSlug,
      dialogId: options.dialogId,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    });
    return { messages: [], lastCursor: 0 };
  }
}
