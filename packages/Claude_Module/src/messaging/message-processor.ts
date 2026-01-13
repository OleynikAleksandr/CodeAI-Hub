import crypto from "node:crypto";
import type { SDKSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type { ClaudeStreamMessage, ModuleReporter } from "../types";
import type { IdeaCollectorStructuredOutput } from "./idea-collector-structured-output";
import {
  parseIdeaCollectorOutputFromResultMessage,
  parseIdeaCollectorOutputFromText,
} from "./idea-collector-structured-output";
import {
  getSDKFilesBefore,
  getSessionIdFromSDKFiles,
} from "./session-file-discovery";

type ProcessResponseOptions = {
  readonly sessionId: string;
  readonly iterator: AsyncIterable<ClaudeStreamMessage>;
  readonly onRealSessionId: (sessionId: string) => void;
};

type MessageProcessorOptions = {
  readonly projectPath: string;
  readonly reporter?: ModuleReporter;
};

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
      case "assistant": {
        this.emitThinkingChunks(session, message);
        const assistantText = this.extractAssistantText(message);
        if (!assistantText) {
          return;
        }
        const structured = parseIdeaCollectorOutputFromText(assistantText);
        if (structured) {
          this.emitStructuredOutput(session, message, structured);
          if (structured.suggestedResponse) {
            emitter.emit("message", {
              type: "assistant",
              content: structured.suggestedResponse,
              uuid: message.uuid,
              claudeSessionId: message.session_id,
              data: message,
              metadata: {
                uuid: message.uuid,
                session_id: message.session_id,
                model: message.message?.model,
              },
            });
          }
          return;
        }
        emitter.emit("message", {
          type: "assistant",
          content: assistantText,
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
      case "result": {
        const structured = parseIdeaCollectorOutputFromResultMessage(message);
        if (structured) {
          this.emitStructuredOutput(session, message, structured);
        }
        break;
      }
      default:
        break;
    }
  }

  private emitStructuredOutput(
    session: ActiveSession,
    message: ClaudeStreamMessage,
    output: IdeaCollectorStructuredOutput
  ): void {
    if (!(output.nextAction && output.artifact)) {
      return;
    }
    const dedupeId = message.uuid;
    if (dedupeId) {
      if (!session.structuredOutputUuids) {
        session.structuredOutputUuids = new Set();
      }
      if (session.structuredOutputUuids.has(dedupeId)) {
        return;
      }
      session.structuredOutputUuids.add(dedupeId);
    }
    session.eventEmitter.emit("message", {
      type: "stream_event",
      provider: "claude",
      sessionId: session.sessionId,
      claudeSessionId: message.session_id,
      data: {
        kind: "structured_output",
        artifact: output.artifact,
        nextAction: output.nextAction,
      },
      uuid: `${dedupeId ?? crypto.randomUUID()}::structured_output`,
      timestamp: new Date().toISOString(),
    });
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
    return getSDKFilesBefore(this.options.projectPath, this.options.reporter);
  }

  getSessionIdFromSDKFiles(previousFiles: string[]): Promise<string | null> {
    return getSessionIdFromSDKFiles(
      this.options.projectPath,
      previousFiles,
      this.options.reporter
    );
  }
}
