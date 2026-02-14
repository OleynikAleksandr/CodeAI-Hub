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
};

export class DialogHistoryService {
  private readonly logger: Logger;
  private readonly openService: DialogOpenService;

  constructor(options: { readonly logger: Logger }) {
    this.logger = options.logger;
    this.openService = new DialogOpenService(options);
  }

  async readHistory(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly dialogId: string;
  }): Promise<readonly DialogHistoryMessage[]> {
    const dialog = await this.openService.openDialog({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
      dialogId: options.dialogId,
    });
    const providerId = dialog?.providerId ?? null;
    if (!providerId) {
      return [];
    }

    const workspaceKey = sanitizeWorkspaceSlug(options.workspaceRoot);
    const filePath = buildSessionFilePath({
      rootDirectory: SESSION_ROOT,
      workspaceSlug: workspaceKey,
      provider: providerId,
      sessionId: sanitizeWorkspaceSlug(options.dialogId),
    });

    try {
      const records = await readSessionEvents(filePath);
      const byId = new Map<string, DialogHistoryMessage>();
      for (const record of records) {
        if (record.type !== "message") {
          continue;
        }
        if (byId.has(record.messageId)) {
          continue;
        }
        byId.set(record.messageId, {
          messageId: record.messageId,
          role: record.role,
          content: record.content,
          timestamp: record.timestamp,
        });
      }
      const messages = Array.from(byId.values());
      messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      return messages;
    } catch (error: unknown) {
      this.logger.warn("Failed to read dialog history", {
        workspaceSlug: options.workspaceSlug,
        dialogId: options.dialogId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
