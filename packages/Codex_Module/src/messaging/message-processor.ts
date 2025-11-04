import crypto from "node:crypto";
import type {
  ItemCompletedEvent,
  ItemStartedEvent,
  ItemUpdatedEvent,
  Thread,
  ThreadErrorEvent,
  ThreadEvent,
  ThreadItem,
  TurnCompletedEvent,
  TurnFailedEvent,
} from "@openai/codex-sdk";
import type { CodexSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type { CodexTurnOptions, ModuleReporter } from "../types";

const PROVIDER = "codex";
const THREAD_ID_SHORT_LENGTH = 8;

type EnqueuedMessage = {
  readonly type: "user_input";
  readonly content: string;
  readonly turnOptions?: CodexTurnOptions;
  readonly internal?: boolean;
};

type ProcessTurnContext = {
  readonly session: ActiveSession;
  readonly thread: Thread;
  readonly message: EnqueuedMessage;
};

type MessageProcessorOptions = {
  readonly reporter?: ModuleReporter;
};

export class CodexMessageProcessor {
  private readonly sessionManager: CodexSessionManager;
  private readonly options?: MessageProcessorOptions;

  constructor(
    sessionManager: CodexSessionManager,
    options?: MessageProcessorOptions
  ) {
    this.sessionManager = sessionManager;
    this.options = options;
  }

  initializeSession(session: ActiveSession, thread: Thread): void {
    session.thread = thread;
    const generator = session.messageGenerator;
    if (!generator) {
      throw new Error("Session message generator not initialized");
    }
    const loop = this.consumeQueue(session, thread, generator);
    session.processingLoop = loop.catch((error) => {
      this.options?.reporter?.error?.("Codex queue processing failed", error);
      session.eventEmitter.emit("error", { type: "processor", error });
    });
  }

  enqueueMessage(
    sessionId: string,
    content: string,
    turnOptions?: CodexTurnOptions,
    options?: { readonly internal?: boolean }
  ): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const internal = options?.internal ?? false;
    if (!internal) {
      session.logger?.logUserInput(content);
    }
    const controller = session.messageController;
    controller.pendingMessages.push({
      type: "user_input",
      content,
      turnOptions,
      internal,
    });
    if (controller.resolveNext) {
      const resolver = controller.resolveNext;
      controller.resolveNext = null;
      resolver(controller.pendingMessages.shift() ?? null);
    }
    if (!internal) {
      session.eventEmitter.emit("message", {
        type: "user_input",
        provider: PROVIDER,
        sessionId,
        threadId: session.codexThreadId,
        content,
        uuid: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async consumeQueue(
    session: ActiveSession,
    thread: Thread,
    generator: AsyncGenerator<unknown>
  ): Promise<void> {
    for await (const raw of generator) {
      if (!this.isEnqueuedMessage(raw)) {
        continue;
      }
      await this.processTurn({ session, thread, message: raw });
    }
  }

  private async processTurn(context: ProcessTurnContext): Promise<void> {
    const { session, thread, message } = context;
    session.internalTurn = message.internal ?? false;
    try {
      const { events } = await thread.runStreamed(
        message.content,
        message.turnOptions ?? {}
      );
      await this.consumeEvents(session, events);
    } catch (error) {
      this.options?.reporter?.error?.("Codex turn execution failed", error);
      session.eventEmitter.emit("error", {
        type: "turn_execution",
        error,
      });
    } finally {
      session.internalTurn = false;
    }
  }

  private async consumeEvents(
    session: ActiveSession,
    events: AsyncGenerator<ThreadEvent>
  ): Promise<void> {
    try {
      for await (const event of events) {
        this.dispatchEvent(session, event);
      }
    } catch (error) {
      this.options?.reporter?.error?.("Codex event stream failed", error);
      session.eventEmitter.emit("error", { type: "event_stream", error });
    }
  }

  private dispatchEvent(session: ActiveSession, event: ThreadEvent): void {
    session.logger?.logSDKEvent(event.type, event);
    switch (event.type) {
      case "thread.started":
        this.handleThreadStarted(session, event.thread_id);
        break;
      case "turn.started":
        this.emitMessage(session, {
          type: "turn_started",
          provider: PROVIDER,
          sessionId: session.sessionId,
          threadId: session.codexThreadId,
          timestamp: new Date().toISOString(),
        });
        break;
      case "turn.completed":
        this.handleTurnCompleted(session, event);
        break;
      case "turn.failed":
        this.handleTurnFailed(session, event);
        break;
      case "item.started":
      case "item.updated":
      case "item.completed":
        this.handleThreadItem(session, event);
        break;
      case "error":
        this.handleStreamError(session, event);
        break;
      default:
        this.options?.reporter?.warn?.(
          `Unhandled Codex event ${(event as { type: string }).type}`
        );
    }
  }

  private handleThreadStarted(session: ActiveSession, threadId: string): void {
    const previousId = session.sessionId;
    session.codexThreadId = threadId;
    session.logger?.logSDKEvent("thread_id", threadId);
    if (previousId !== threadId) {
      this.sessionManager.updateSessionId(previousId, threadId);
      session.logger?.renameSession?.(previousId, threadId);
      session.eventEmitter.emit("sessionIdChanged", {
        oldId: previousId,
        newId: threadId,
        provider: PROVIDER,
        shortId: threadId.slice(0, THREAD_ID_SHORT_LENGTH),
      });
    }
    this.emitMessage(session, {
      type: "thread_started",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId,
      timestamp: new Date().toISOString(),
    });
  }

  private handleTurnCompleted(
    session: ActiveSession,
    event: TurnCompletedEvent
  ): void {
    this.emitMessage(session, {
      type: "turn_completed",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      usage: event.usage,
      timestamp: new Date().toISOString(),
    });
  }

  private handleTurnFailed(
    session: ActiveSession,
    event: TurnFailedEvent
  ): void {
    this.emitMessage(session, {
      type: "turn_failed",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      error: event.error,
      timestamp: new Date().toISOString(),
    });
  }

  private handleStreamError(
    session: ActiveSession,
    event: ThreadErrorEvent
  ): void {
    this.emitMessage(session, {
      type: "stream_error",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      message: event.message,
      timestamp: new Date().toISOString(),
    });
  }

  private handleThreadItem(
    session: ActiveSession,
    event: ItemStartedEvent | ItemUpdatedEvent | ItemCompletedEvent
  ): void {
    const item = event.item as ThreadItem;
    if (item.type !== "agent_message") {
      return;
    }
    if (event.type === "item.updated") {
      if (session.internalTurn) {
        return;
      }
      this.emitMessage(session, {
        type: "stream_event",
        provider: PROVIDER,
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        data: {
          kind: "assistant_chunk",
          itemId: item.id,
          text: item.text,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (event.type !== "item.completed") {
      return;
    }
    if (session.internalTurn) {
      return;
    }
    this.emitMessage(session, {
      type: "assistant",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      content: item.text,
      uuid: item.id,
      timestamp: new Date().toISOString(),
    });
  }

  private emitMessage(
    session: ActiveSession,
    payload: Record<string, unknown>
  ): void {
    const type = typeof payload.type === "string" ? payload.type : undefined;
    if (
      session.internalTurn &&
      type &&
      CodexMessageProcessor.INTERNAL_SUPPRESSED_EVENTS.has(type)
    ) {
      return;
    }
    session.eventEmitter.emit("message", payload);
  }

  private isEnqueuedMessage(value: unknown): value is EnqueuedMessage {
    if (!value || typeof value !== "object") {
      return false;
    }
    const candidate = value as Partial<EnqueuedMessage>;
    return (
      candidate.type === "user_input" &&
      typeof candidate.content === "string" &&
      candidate.content.length > 0
    );
  }

  private static readonly INTERNAL_SUPPRESSED_EVENTS = new Set<string>([
    "user_input",
    "turn_started",
    "turn_completed",
    "turn_failed",
    "stream_error",
    "assistant",
    "stream_event",
  ]);
}
