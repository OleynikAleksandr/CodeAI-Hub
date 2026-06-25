import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  buildSessionTranslationFilePath,
  readSessionEvents,
  readSessionTranslationOverlayMap,
  type SessionMessageTranslationRecord,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import { SessionMessageLocalizationProjector } from "../../session-translation/session-message-localization-projector";
import type { Logger } from "../../telemetry/logger";
import { WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG } from "../../unified-session/storage";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { DialogOpenService } from "./dialog-open-service";

const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");

export interface DialogHistoryMessage {
  readonly content: string;
  readonly localizedContent?: string;
  readonly messageId: string;
  readonly role: "system" | "user" | "assistant" | "thinking";
  readonly tag?: string;
  readonly timestamp: string;
  readonly translationState?: "pending";
}

export interface DialogHistoryResult {
  readonly lastCursor: number;
  readonly messages: readonly DialogHistoryMessage[];
}

type SessionRecord = Awaited<ReturnType<typeof readSessionEvents>>[number];
type SessionMessageRecord = Extract<
  SessionRecord,
  { readonly type: "message" }
>;

const readNonEmptyString = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveDialogHistoryLocations = (options: {
  readonly worktreePath?: string | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): readonly {
  readonly rootDirectory: string;
  readonly workspaceSlug: string;
}[] => {
  const locations = [
    {
      rootDirectory:
        resolveWorkspaceRuntimeCapsule(options).sessionsRoot.absolutePath,
      workspaceSlug: WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
    },
    {
      rootDirectory: SESSION_ROOT,
      workspaceSlug: sanitizeWorkspaceSlug(options.workspaceRoot),
    },
  ];
  const worktreePath = readNonEmptyString(options.worktreePath ?? null);
  if (!worktreePath) {
    return locations;
  }
  return [
    {
      rootDirectory: resolveWorkspaceRuntimeCapsule({
        workspaceRoot: worktreePath,
        workspaceSlug: options.workspaceSlug,
      }).sessionsRoot.absolutePath,
      workspaceSlug: WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
    },
    ...locations,
  ];
};

const readDialogWorktreePath = (dialog: unknown): string | null =>
  isRecord(dialog) && typeof dialog.worktreePath === "string"
    ? readNonEmptyString(dialog.worktreePath)
    : null;

const readTranslationState = (value: unknown): "pending" | undefined =>
  value === "pending" ? value : undefined;

export class DialogHistoryService {
  private readonly logger: Logger;
  private readonly localizationProjector =
    new SessionMessageLocalizationProjector();
  private readonly openService: DialogOpenService;

  constructor(options: { readonly logger: Logger }) {
    this.logger = options.logger;
    this.openService = new DialogOpenService(options);
  }

  private appendMessageRecord(
    byId: Map<string, DialogHistoryMessage>,
    record: SessionRecord,
    translations: ReadonlyMap<string, SessionMessageTranslationRecord>
  ): void {
    if (record.type !== "message") {
      return;
    }
    const messageRecord = record as SessionMessageRecord;
    if (byId.has(messageRecord.messageId)) {
      return;
    }
    const localizedContent = this.localizationProjector.resolveLocalizedContent(
      {
        message: {
          id: messageRecord.messageId,
          content: messageRecord.content,
        },
        translations,
      }
    );
    const translationState = readTranslationState(
      messageRecord.translationState
    );
    byId.set(messageRecord.messageId, {
      messageId: messageRecord.messageId,
      role: messageRecord.role,
      content: messageRecord.content,
      timestamp: messageRecord.timestamp,
      ...(localizedContent ? { localizedContent } : {}),
      ...(messageRecord.tag ? { tag: messageRecord.tag } : {}),
      ...(translationState ? { translationState } : {}),
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
    translations: ReadonlyMap<string, SessionMessageTranslationRecord>,
    cursor?: number | null
  ): DialogHistoryResult {
    const lastCursor = records.length;
    const requestedCursor = this.normalizeCursor({ cursor, lastCursor });
    const slice =
      requestedCursor > 0 ? records.slice(requestedCursor) : records;

    const byId = new Map<string, DialogHistoryMessage>();
    for (const record of slice) {
      this.appendMessageRecord(byId, record, translations);
    }

    const messages = Array.from(byId.values());
    messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return { messages, lastCursor };
  }

  private async readHistoryFromFile(options: {
    readonly filePath: string;
    readonly translationFilePath: string;
    readonly cursor?: number | null;
  }): Promise<DialogHistoryResult> {
    const [records, translations] = await Promise.all([
      readSessionEvents(options.filePath),
      readSessionTranslationOverlayMap(options.translationFilePath),
    ]);
    return this.buildMessagesFromRecords(records, translations, options.cursor);
  }

  private async resolveProviderIds(options: {
    readonly rootDirectory: string;
    readonly workspaceSlug: string;
    readonly preferredProviderId: string | null;
  }): Promise<readonly string[]> {
    const providerIds: string[] = [];
    if (options.preferredProviderId) {
      providerIds.push(options.preferredProviderId);
    }

    try {
      const workspaceDir = path.join(
        options.rootDirectory,
        options.workspaceSlug
      );
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
    const sessionId = sanitizeWorkspaceSlug(options.dialogId);
    const locations = resolveDialogHistoryLocations({
      ...options,
      worktreePath: readDialogWorktreePath(dialog),
    });

    let lastError: unknown = null;
    for (const location of locations) {
      const providerIds = await this.resolveProviderIds({
        rootDirectory: location.rootDirectory,
        workspaceSlug: location.workspaceSlug,
        preferredProviderId: dialog?.providerId ?? null,
      });
      for (const providerId of providerIds) {
        const filePath = buildSessionFilePath({
          rootDirectory: location.rootDirectory,
          workspaceSlug: location.workspaceSlug,
          provider: providerId,
          sessionId,
        });
        const translationFilePath = buildSessionTranslationFilePath({
          rootDirectory: location.rootDirectory,
          workspaceSlug: location.workspaceSlug,
          provider: providerId,
          sessionId,
        });

        try {
          return await this.readHistoryFromFile({
            filePath,
            translationFilePath,
            cursor: options.cursor,
          });
        } catch (error: unknown) {
          lastError = error;
        }
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
