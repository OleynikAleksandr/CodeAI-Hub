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

export class SDKMessageProcessor {
  constructor(
    private readonly sessionManager: SDKSessionManager,
    private readonly options: {
      readonly projectPath: string;
      readonly reporter?: ModuleReporter;
    }
  ) {}

  public async send(sessionId: string, content: string): Promise<void> {
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

  public async processResponses(
    options: ProcessResponseOptions
  ): Promise<void> {
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
      case "assistant":
        session?.logger?.logAssistantResponse?.(message);
        emitter.emit("message", {
          type: "assistant",
          content: message.message?.content ?? message,
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
      case "system":
        session?.logger?.logSystemMessage?.(message);
        emitter.emit("message", {
          type: "system",
          content: message.content ?? message,
          metadata: message,
        });
        break;
      case "result": {
        session?.logger?.logResultMessage?.(message);
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

  public getSDKFilesBefore(): string[] {
    if (!fs.existsSync(this.options.projectPath)) {
      this.options.reporter?.warn?.(
        `Claude project path missing: ${this.options.projectPath}`
      );
      return [];
    }
    return fs
      .readdirSync(this.options.projectPath)
      .filter((fileName) => fileName.endsWith(".jsonl"))
      .map((fileName) => path.join(this.options.projectPath, fileName));
  }

  public async getSessionIdFromSDKFiles(
    previousFiles: string[]
  ): Promise<string | null> {
    if (!fs.existsSync(this.options.projectPath)) {
      return null;
    }
    await delay(1000);
    const filesAfter = fs
      .readdirSync(this.options.projectPath)
      .filter((fileName) => fileName.endsWith(".jsonl"))
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
