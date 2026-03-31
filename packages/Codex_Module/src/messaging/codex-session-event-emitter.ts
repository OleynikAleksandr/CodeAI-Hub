import crypto from "node:crypto";
import type { ActiveSession } from "../session/types";

const INTERNAL_SUPPRESSED_EVENTS = new Set<string>([
  "user_input",
  "turn_started",
  "turn_completed",
  "turn_failed",
  "stream_error",
  "assistant",
  "stream_event",
]);

export class CodexSessionEventEmitter {
  emitMessage(session: ActiveSession, payload: Record<string, unknown>): void {
    const type = typeof payload.type === "string" ? payload.type : undefined;
    if (session.internalTurn && type && INTERNAL_SUPPRESSED_EVENTS.has(type)) {
      return;
    }
    session.eventEmitter.emit("message", payload);
  }

  emitDialogMessage(
    session: ActiveSession,
    role: "assistant" | "thinking" | "user",
    content: string,
    id?: string
  ): void {
    if (!content || content.trim().length === 0) {
      return;
    }
    const isThinking = role === "thinking";
    session.eventEmitter.emit("message", {
      type: "dialog_message",
      role: isThinking ? "assistant" : role,
      content,
      uuid: id ?? crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...(isThinking ? { tag: "thinking" } : {}),
    });
  }
}
