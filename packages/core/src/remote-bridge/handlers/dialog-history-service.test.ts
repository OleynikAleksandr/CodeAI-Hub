import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildSessionFilePath,
  UnifiedSessionWriter,
} from "@codeai-hub/unified-session";
import { Logger } from "../../telemetry/logger";
import { DialogHistoryService } from "./dialog-history-service";

test("DialogHistoryService preserves assistant and thinking messages from JSONL", async () => {
  const rootDirectory = await mkdtemp(
    path.join(tmpdir(), "dialog-history-service-")
  );
  const workspaceSlug = "workspace";
  const provider = "codexCli";
  const sessionId = "dialog-session";
  const writer = new UnifiedSessionWriter({
    rootDirectory,
    workspaceSlug,
    provider,
    sessionId,
  });

  try {
    await writer.appendMessage({
      messageId: "assistant-1",
      role: "assistant",
      content: "progress update",
      timestamp: "2026-03-06T09:00:00.000Z",
    });
    await writer.appendMessage({
      messageId: "thinking-1",
      role: "thinking",
      content: "reasoning summary",
      timestamp: "2026-03-06T09:00:00.000Z",
    });

    const service = new DialogHistoryService({
      logger: new Logger("error"),
    });
    const filePath = buildSessionFilePath({
      rootDirectory,
      workspaceSlug,
      provider,
      sessionId,
    });
    const result = await (
      service as unknown as {
        readHistoryFromFile(options: {
          readonly filePath: string;
          readonly cursor?: number | null;
        }): Promise<{
          readonly messages: readonly {
            readonly role: string;
            readonly content: string;
          }[];
          readonly lastCursor: number;
        }>;
      }
    ).readHistoryFromFile({
      filePath,
    });

    assert.deepEqual(
      result.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      [
        { role: "assistant", content: "progress update" },
        { role: "thinking", content: "reasoning summary" },
      ]
    );
    assert.equal(result.lastCursor >= 3, true);
  } finally {
    await writer.close({ reason: "test-complete" });
    await rm(rootDirectory, { recursive: true, force: true });
  }
});

test("DialogHistoryService tail cursor keeps later commentary ordering stable", async () => {
  const rootDirectory = await mkdtemp(
    path.join(tmpdir(), "dialog-history-service-")
  );
  const workspaceSlug = "workspace";
  const provider = "codexCli";
  const sessionId = "dialog-session";
  const writer = new UnifiedSessionWriter({
    rootDirectory,
    workspaceSlug,
    provider,
    sessionId,
  });

  try {
    await writer.appendMessage({
      messageId: "assistant-1",
      role: "assistant",
      content: "first progress update",
      timestamp: "2026-03-06T09:00:00.000Z",
    });
    await writer.appendMessage({
      messageId: "assistant-2",
      role: "assistant",
      content: "second progress update",
      timestamp: "2026-03-06T09:00:01.000Z",
    });
    await writer.appendMessage({
      messageId: "thinking-2",
      role: "thinking",
      content: "second reasoning summary",
      timestamp: "2026-03-06T09:00:01.000Z",
    });

    const service = new DialogHistoryService({
      logger: new Logger("error"),
    });
    const filePath = buildSessionFilePath({
      rootDirectory,
      workspaceSlug,
      provider,
      sessionId,
    });
    const result = await (
      service as unknown as {
        readHistoryFromFile(options: {
          readonly filePath: string;
          readonly cursor?: number | null;
        }): Promise<{
          readonly messages: readonly {
            readonly role: string;
            readonly content: string;
          }[];
        }>;
      }
    ).readHistoryFromFile({
      filePath,
      cursor: 2,
    });

    assert.deepEqual(
      result.messages.map((message) => message.content),
      ["second progress update", "second reasoning summary"]
    );
  } finally {
    await writer.close({ reason: "test-complete" });
    await rm(rootDirectory, { recursive: true, force: true });
  }
});
