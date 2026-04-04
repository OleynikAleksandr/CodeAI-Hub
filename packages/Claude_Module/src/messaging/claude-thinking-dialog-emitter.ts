import crypto from "node:crypto";
import type { ActiveSession } from "../session/types";
import type { ClaudeStreamMessage } from "../types";
import { splitClaudeDialogChunks } from "./claude-readable-text-chunker";

const THINKING_DIALOG_MAX_CHARS = 900;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const emitClaudeThinkingDialog = (
  session: ActiveSession,
  message: ClaudeStreamMessage,
  content: string,
  suffix: string
): void => {
  const displayChunks = splitClaudeDialogChunks(
    content,
    THINKING_DIALOG_MAX_CHARS
  );
  for (const [index, chunk] of displayChunks.entries()) {
    session.eventEmitter.emit("message", {
      type: "dialog_message",
      role: "assistant",
      tag: "thinking",
      content: chunk,
      uuid: `${message.uuid ?? crypto.randomUUID()}::${suffix}::${index}`,
      timestamp: new Date().toISOString(),
    });
  }
};

export const readClaudeMessageId = (
  message: ClaudeStreamMessage
): string | null =>
  typeof message.message?.id === "string" &&
  message.message.id.trim().length > 0
    ? message.message.id
    : null;

export const readClaudeMessageDeltaStopReason = (
  message: ClaudeStreamMessage
): string | null => {
  if (message.type !== "stream_event" || !isRecord(message.event)) {
    return null;
  }
  if (message.event.type !== "message_delta") {
    return null;
  }
  const delta = isRecord(message.event.delta) ? message.event.delta : null;
  return typeof delta?.stop_reason === "string" ? delta.stop_reason : null;
};

export const isClaudeMessageStopEvent = (
  message: ClaudeStreamMessage
): boolean =>
  message.type === "stream_event" &&
  isRecord(message.event) &&
  message.event.type === "message_stop";
