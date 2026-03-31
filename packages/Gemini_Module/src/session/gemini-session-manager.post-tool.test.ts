import assert from "node:assert/strict";
import test from "node:test";
import { GeminiSessionManager } from "./gemini-session-manager";
import {
  createModules,
  createStalledTurnTimeoutRe,
  createToolRequest,
  RECOVERABLE_TURN_FAILURE_CODE,
} from "./gemini-session-manager.test-helpers";

test("GeminiSessionManager keeps tool-leg progress non-terminal when nested post-tool stream stalls", async () => {
  const progressMessage =
    "Сейчас я сформирую первый черновик Final_Description.md.";
  const manager = new GeminiSessionManager(
    createModules(
      ["provider-session-post-tool-stall"],
      [
        [
          { type: "content", value: progressMessage },
          {
            type: "tool_call_request",
            value: createToolRequest("write-final-description"),
          },
          {
            type: "finished",
            value: { usageMetadata: { totalTokenCount: 9 } },
          },
        ],
        "stall_after_model_info",
      ]
    )
  );

  const result = await manager.createSession({
    workspacePath: "/tmp/workspace-post-tool-stall",
  });
  (result.session as unknown as Record<string, unknown>).stalledTurnWatchdogMs =
    10;
  (
    result.session as unknown as Record<string, unknown>
  ).postToolStalledTurnWatchdogMs = 40;
  const events: unknown[] = [];
  result.session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  await assert.rejects(
    async () => {
      await manager.sendMessage(
        result.sessionId,
        "Подготовь финальное описание и задай вопросы"
      );
    },
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal(
        (error as Error & { code?: string }).code,
        RECOVERABLE_TURN_FAILURE_CODE
      );
      assert.match((error as Error).message, createStalledTurnTimeoutRe(40));
      return true;
    }
  );

  assert.equal(
    events.some(
      (payload) =>
        (payload as { type?: string }).type === "dialog_message" &&
        (payload as { role?: string }).role === "assistant" &&
        (payload as { content?: string }).content === progressMessage
    ),
    true
  );
  assert.equal(
    events.some(
      (payload) => (payload as { type?: string }).type === "turn_failed"
    ),
    true
  );
  assert.equal(
    events.some(
      (payload) => (payload as { type?: string }).type === "turn_completed"
    ),
    false
  );
});

test("GeminiSessionManager completes delayed post-tool final answer with longer nested watchdog", async () => {
  const progressMessage = "Сначала сохраню черновик файла.";
  const manager = new GeminiSessionManager(
    createModules(
      ["provider-session-post-tool-delayed-answer"],
      [
        [
          { type: "content", value: progressMessage },
          {
            type: "tool_call_request",
            value: createToolRequest("write-draft-description"),
          },
          {
            type: "finished",
            value: { usageMetadata: { totalTokenCount: 10 } },
          },
        ],
        "delayed_terminal_answer",
      ]
    )
  );

  const result = await manager.createSession({
    workspacePath: "/tmp/workspace-post-tool-delayed-answer",
  });
  (result.session as unknown as Record<string, unknown>).stalledTurnWatchdogMs =
    10;
  (
    result.session as unknown as Record<string, unknown>
  ).postToolStalledTurnWatchdogMs = 50;
  const events: unknown[] = [];
  result.session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  await manager.sendMessage(
    result.sessionId,
    "Собери описание, затем вернись с итогом"
  );

  assert.equal(
    events.some(
      (payload) =>
        (payload as { type?: string }).type === "dialog_message" &&
        (payload as { role?: string }).role === "assistant" &&
        (payload as { content?: string }).content === progressMessage
    ),
    true
  );
  assert.equal(
    events.some(
      (payload) =>
        (payload as { type?: string }).type === "dialog_message" &&
        (payload as { role?: string }).role === "assistant" &&
        (payload as { content?: string }).content === "Delayed final answer"
    ),
    true
  );
  assert.equal(
    events.some(
      (payload) => (payload as { type?: string }).type === "turn_failed"
    ),
    false
  );
  assert.equal(
    events.filter(
      (payload) => (payload as { type?: string }).type === "turn_completed"
    ).length,
    1
  );
});

test("GeminiSessionManager treats late post-tool stall after terminal nested answer as completed turn", async () => {
  const manager = new GeminiSessionManager(
    createModules(
      ["provider-session-post-tool-terminal-answer"],
      [
        [
          { type: "content", value: "Сначала сохраню результат." },
          {
            type: "tool_call_request",
            value: createToolRequest("write-final-answer"),
          },
          {
            type: "finished",
            value: { usageMetadata: { totalTokenCount: 8 } },
          },
        ],
        "stall_after_terminal_answer",
      ]
    )
  );

  const result = await manager.createSession({
    workspacePath: "/tmp/workspace-post-tool-terminal-answer",
  });
  (result.session as unknown as Record<string, unknown>).stalledTurnWatchdogMs =
    10;
  (
    result.session as unknown as Record<string, unknown>
  ).postToolStalledTurnWatchdogMs = 40;
  const events: unknown[] = [];
  result.session.eventEmitter.on("message", (payload) => {
    events.push(payload);
  });

  await manager.sendMessage(
    result.sessionId,
    "Сохрани файл и после этого закончи ответ"
  );

  assert.equal(
    events.some(
      (payload) =>
        (payload as { type?: string }).type === "dialog_message" &&
        (payload as { role?: string }).role === "assistant" &&
        (payload as { content?: string }).content === "Terminal answer"
    ),
    true
  );
  assert.equal(
    events.some(
      (payload) => (payload as { type?: string }).type === "turn_failed"
    ),
    false
  );
  assert.equal(
    events.filter(
      (payload) => (payload as { type?: string }).type === "turn_completed"
    ).length,
    1
  );
});
