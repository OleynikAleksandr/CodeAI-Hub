import { existsSync, renameSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildSessionFilePath,
  readSessionEvents,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import type { Logger } from "../telemetry/logger";

const sanitizeSessionId = (value: string): string =>
  sanitizeWorkspaceSlug(value);

export interface BackfillHistoryOptions {
  readonly historySessionId: string;
  readonly logger: Logger;
  readonly providerId: string;
  readonly rootDirectory: string;
  readonly sourceSessionIds: readonly string[];
  readonly workspaceSlug: string;
}

export type IsWriterInUseCheck = (
  workspaceSlug: string,
  providerId: string,
  sanitizedWriterId: string
) => boolean;

export async function backfillUnifiedSessionHistory(
  options: BackfillHistoryOptions,
  isWriterInUse: IsWriterInUseCheck
): Promise<void> {
  const workspaceSlug = sanitizeWorkspaceSlug(options.workspaceSlug);
  const { providerId, logger, rootDirectory } = options;
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

  const sanitizedWriterId = sanitizeSessionId(historySessionId);
  if (isWriterInUse(workspaceSlug, providerId, sanitizedWriterId)) {
    logger.warn("Skipping unified-session backfill (writer in use)", {
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
      readonly role: string;
      readonly content: string;
      readonly timestamp: string;
    }
  >();

  for (const sessionId of sourceSessionIds) {
    const filePath = buildSessionFilePath({
      rootDirectory,
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
    rootDirectory,
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

export function tryPromoteSessionFile(options: {
  readonly fromSessionId: string;
  readonly logger: Logger;
  readonly providerId: string;
  readonly rootDirectory: string;
  readonly toSessionId: string;
  readonly workspaceSlug: string;
}): void {
  const fromPath = buildSessionFilePath({
    rootDirectory: options.rootDirectory,
    workspaceSlug: options.workspaceSlug,
    provider: options.providerId,
    sessionId: options.fromSessionId,
  });
  const toPath = buildSessionFilePath({
    rootDirectory: options.rootDirectory,
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
    options.logger.warn("Failed to promote unified session log file", {
      providerId: options.providerId,
      workspaceSlug: options.workspaceSlug,
      fromPath,
      toPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
