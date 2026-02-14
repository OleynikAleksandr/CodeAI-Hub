import { homedir } from "node:os";
import path from "node:path";
import {
  sanitizeWorkspaceSlug,
  UnifiedSessionWriter,
} from "@codeai-hub/unified-session";

const DEFAULT_SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");

export type DialogHistoryAppendRecord = {
  readonly messageId: string;
  readonly role: "system" | "user" | "assistant" | "thinking";
  readonly content: string;
  readonly timestamp: string;
};

const buildWriterKey = (options: {
  readonly rootDirectory: string;
  readonly workspaceKey: string;
  readonly providerId: string;
  readonly dialogId: string;
}): string =>
  [
    options.rootDirectory,
    options.workspaceKey,
    options.providerId,
    options.dialogId,
  ].join("|");

/**
 * Core-only writer for stable dialog history files:
 * `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`.
 */
export class DialogHistoryWriter {
  private readonly rootDirectory: string;
  private readonly writers = new Map<string, UnifiedSessionWriter>();

  constructor(options?: { readonly rootDirectory?: string }) {
    this.rootDirectory = options?.rootDirectory ?? DEFAULT_SESSION_ROOT;
  }

  append(options: {
    readonly workspaceKey: string;
    readonly providerId: string;
    readonly dialogId: string;
    readonly record: DialogHistoryAppendRecord;
  }): Promise<void> {
    const workspaceKey = sanitizeWorkspaceSlug(options.workspaceKey);
    const providerId = options.providerId.trim();
    const dialogId = sanitizeWorkspaceSlug(options.dialogId);
    if (
      workspaceKey.length === 0 ||
      providerId.length === 0 ||
      dialogId.length === 0
    ) {
      return Promise.resolve();
    }

    const key = buildWriterKey({
      rootDirectory: this.rootDirectory,
      workspaceKey,
      providerId,
      dialogId,
    });

    let writer = this.writers.get(key);
    if (!writer) {
      writer = new UnifiedSessionWriter({
        rootDirectory: this.rootDirectory,
        workspaceSlug: workspaceKey,
        provider: providerId,
        sessionId: dialogId,
      });
      this.writers.set(key, writer);
    }

    return writer.appendMessage({
      messageId: options.record.messageId,
      role: options.record.role,
      content: options.record.content,
      timestamp: options.record.timestamp,
    });
  }

  async closeAll(reason?: string): Promise<void> {
    const writers = Array.from(this.writers.values());
    this.writers.clear();
    await Promise.allSettled(writers.map((writer) => writer.close({ reason })));
  }
}
