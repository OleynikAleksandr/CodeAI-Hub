import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { SDKSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type { ClaudeStreamMessage, ModuleReporter } from "../types";

type ProcessResponseOptions = {
  readonly sessionId: string;
  readonly iterator: AsyncIterable<ClaudeStreamMessage>;
  readonly onRealSessionId: (sessionId: string) => void;
};

type MessageProcessorOptions = {
  readonly projectPath: string;
  readonly reporter?: ModuleReporter;
};

const SESSION_DISCOVERY_DELAY_MS = 1000;
const SESSION_FILE_EXTENSION = ".jsonl";

export class SDKMessageProcessor {
  private readonly sessionManager: SDKSessionManager;
  private readonly options: MessageProcessorOptions;

  constructor(
    sessionManager: SDKSessionManager,
    options: MessageProcessorOptions
  ) {
    this.sessionManager = sessionManager;
    this.options = options;
  }

  send(sessionId: string, content: string): void {
    const targetSession = this.sessionManager.getSession(sessionId);
    if (!targetSession) {
      throw new Error(`Session ${sessionId} not found`);
    }

    targetSession.logger?.logUserInput(content);

    targetSession.messageController.pendingMessages.push({
      type: "user",
      message: {
        role: "user",
        content,
      },
    });

    if (targetSession.messageController.resolveNext) {
      const resolver = targetSession.messageController.resolveNext;
      targetSession.messageController.resolveNext = null;
      resolver(targetSession.messageController.pendingMessages.shift() ?? null);
    }

    targetSession.eventEmitter.emit("message", {
      type: "user_input",
      content,
      uuid: crypto.randomUUID(),
      claudeSessionId: sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  async processResponses(options: ProcessResponseOptions): Promise<void> {
    let promotedSessionId: string | null = null;
    try {
      for await (const message of options.iterator) {
        const activeSession = this.resolveSession(
          options.sessionId,
          promotedSessionId
        );
        if (!promotedSessionId && message.session_id) {
          promotedSessionId = message.session_id;
          activeSession?.eventEmitter.emit("realSessionId", promotedSessionId);
          options.onRealSessionId(promotedSessionId);
        }
        this.dispatchMessage(activeSession, message);
      }
    } catch (error) {
      const session = this.resolveSession(options.sessionId, promotedSessionId);
      session?.eventEmitter.emit("error", { type: "processing", error });
      this.options.reporter?.error?.("Claude stream processing failed", error);
    }
  }

  private resolveSession(
    tempId: string,
    promotedId: string | null
  ): ActiveSession | undefined {
    return (
      this.sessionManager.getSession(tempId) ??
      (promotedId ? this.sessionManager.getSession(promotedId) : undefined)
    );
  }

  private dispatchMessage(
    session: ActiveSession | undefined,
    message: ClaudeStreamMessage
  ): void {
    const emitter = session?.eventEmitter;
    if (!emitter) {
      return;
    }

    session?.logger?.logSDKMessage(message.type, message);

    switch (message.type) {
      case "stream_event":
        emitter.emit("message", {
          type: "stream_event",
          uuid: message.uuid,
          claudeSessionId: message.session_id,
          event: message.event,
          timestamp: new Date().toISOString(),
        });
        break;
      case "assistant": {
        this.emitThinkingChunks(session, message);
        const assistantText = this.extractAssistantText(message);
        emitter.emit("message", {
          type: "assistant",
          content: assistantText ?? message.message?.content ?? message,
          uuid: message.uuid,
          claudeSessionId: message.session_id,
          data: message,
          metadata: {
            uuid: message.uuid,
            session_id: message.session_id,
            model: message.message?.model,
          },
        });
        break;
      }
      case "system":
        emitter.emit("message", {
          type: "system",
          content: message.content ?? message,
          metadata: message,
        });
        break;
      case "result": {
        const uuid = crypto.randomUUID();
        emitter.emit("message", {
          type: "result",
          content: message.result ?? message.content ?? message,
          uuid,
          data: {
            total_cost_usd: message.total_cost_usd,
            usage: message.usage,
            duration_ms: message.duration_ms,
            duration_api_ms: message.duration_api_ms,
            num_turns: message.num_turns,
            session_id: message.session_id,
          },
          claudeSessionId: message.session_id,
          timestamp: message.timestamp,
        });
        break;
      }
      default:
        emitter.emit("message", {
          type: message.type,
          content: message,
        });
        break;
    }
  }

  private emitThinkingChunks(
    session: ActiveSession | undefined,
    message: ClaudeStreamMessage
  ): void {
    if (!session) {
      return;
    }
    const content = message.message?.content;
    if (!Array.isArray(content)) {
      return;
    }
    for (const block of content) {
      if (
        block &&
        typeof block === "object" &&
        (block as { readonly type?: string }).type === "thinking" &&
        typeof (block as { readonly thinking?: unknown }).thinking === "string"
      ) {
        session.eventEmitter.emit("message", {
          type: "dialog_message",
          role: "thinking",
          content: (block as { readonly thinking: string }).thinking,
          uuid: `${message.uuid ?? crypto.randomUUID()}::thinking`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private extractAssistantText(message: ClaudeStreamMessage): string | null {
    const blocks = message.message?.content;
    if (!Array.isArray(blocks)) {
      return null;
    }
    const parts: string[] = [];
    for (const block of blocks) {
      if (!block || typeof block !== "object") {
        continue;
      }
      const kind = (block as { readonly type?: string }).type;
      if (
        kind === "text" &&
        typeof (block as { readonly text?: unknown }).text === "string"
      ) {
        parts.push((block as { readonly text: string }).text);
      } else if (
        kind === "output_text" &&
        typeof (block as { readonly output_text?: unknown }).output_text ===
          "string"
      ) {
        parts.push((block as { readonly output_text: string }).output_text);
      }
    }
    if (parts.length === 0) {
      return null;
    }
    return parts.join("\n\n");
  }

  getSDKFilesBefore(): string[] {
    if (!fs.existsSync(this.options.projectPath)) {
      this.options.reporter?.warn?.(
        `Claude project path missing: ${this.options.projectPath}`
      );
      return [];
    }
    return fs
      .readdirSync(this.options.projectPath)
      .filter((fileName) => fileName.endsWith(SESSION_FILE_EXTENSION))
      .map((fileName) => path.join(this.options.projectPath, fileName));
  }

  async getSessionIdFromSDKFiles(
    previousFiles: string[]
  ): Promise<string | null> {
    if (!fs.existsSync(this.options.projectPath)) {
      return null;
    }
    await delay(SESSION_DISCOVERY_DELAY_MS);
    const filesAfter = fs
      .readdirSync(this.options.projectPath)
      .filter((fileName) => fileName.endsWith(SESSION_FILE_EXTENSION))
      .map((fileName) => path.join(this.options.projectPath, fileName));
    const newFile = filesAfter.find(
      (filePath) => !previousFiles.includes(filePath)
    );
    if (!newFile) {
      return null;
    }
    const sessionId = path.basename(newFile, ".jsonl");
    try {
      const content = fs.readFileSync(newFile, "utf8");
      const firstLine = content
        .split("\n")
        .find((line) => line.trim().length > 0);
      if (!firstLine) {
        return sessionId;
      }
      const parsed = JSON.parse(firstLine) as { readonly sessionId?: string };
      return parsed.sessionId ?? sessionId;
    } catch (error) {
      this.options.reporter?.error?.(
        "Failed to inspect SDK session file",
        error
      );
      return sessionId;
    }
  }
}
