import crypto from "node:crypto";
import type { SDKSessionManager } from "../session/session-manager";
import type {
  ActiveSession,
  ClaudeQueuedTurn,
  ClaudeTurnProcessorHooks,
} from "../session/types";
import type {
  ClaudeStreamMessage,
  ClaudeUsageLimitsFacadeBridge,
  ModuleReporter,
} from "../types";
import {
  ClaudeMessageFinishHandler,
  type ContextUsageReaderConfig,
} from "./claude-message-finish-handler";
import {
  ClaudeStreamEventRouter,
  shouldSkipClaudeSDKMessageLog,
} from "./claude-stream-event-router";
import { logObservedProviderFeedback } from "./provider-feedback";

interface ProcessResponseOptions {
  readonly iterator: AsyncIterable<ClaudeStreamMessage>;
  readonly onRealSessionId: (sessionId: string) => void;
  readonly sessionId: string;
}

interface MessageProcessorOptions {
  readonly projectPath: string;
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: ClaudeUsageLimitsFacadeBridge;
}

export class SDKMessageProcessor {
  private readonly finishHandler: ClaudeMessageFinishHandler;
  private readonly reporter?: ModuleReporter;
  private readonly sessionManager: SDKSessionManager;
  private readonly streamEventRouter = new ClaudeStreamEventRouter();

  constructor(
    sessionManager: SDKSessionManager,
    options: MessageProcessorOptions
  ) {
    this.sessionManager = sessionManager;
    this.reporter = options.reporter;
    this.finishHandler = new ClaudeMessageFinishHandler({
      reporter: options.reporter,
      usageLimitsFacade: options.usageLimitsFacade,
    });
  }

  configureContextUsageReader(config: ContextUsageReaderConfig): void {
    this.finishHandler.configureContextUsageReader(config);
  }

  enqueueTurn(
    sessionId: string,
    turn: ClaudeQueuedTurn,
    hooks: ClaudeTurnProcessorHooks
  ): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    this.sessionManager.enqueueTurn(session.sessionId, turn);
    this.startQueueLoop(session, hooks);
  }

  private startQueueLoop(
    session: ActiveSession,
    hooks: ClaudeTurnProcessorHooks
  ): void {
    if (session.processingLoop) {
      return;
    }
    const loop = this.consumeTurnQueue(session, hooks)
      .catch((error) => {
        this.reporter?.error?.("Claude queue processing failed", error);
        session.eventEmitter.emit("error", { type: "processor", error });
      })
      .finally(() => {
        session.processingLoop = undefined;
        if (
          session.turnQueue &&
          session.turnQueue.pending.length > 0 &&
          !session.turnQueue.shutdownRequested
        ) {
          this.startQueueLoop(session, hooks);
        }
      });
    session.processingLoop = loop;
  }

  private async consumeTurnQueue(
    session: ActiveSession,
    hooks: ClaudeTurnProcessorHooks
  ): Promise<void> {
    const queueState = session.turnQueue;
    if (
      !(queueState && !queueState.processing && !queueState.shutdownRequested)
    ) {
      return;
    }
    queueState.processing = true;
    try {
      for (;;) {
        if (queueState.shutdownRequested) {
          return;
        }
        const turn = this.sessionManager.takeNextTurn(session.sessionId);
        if (!turn) {
          return;
        }
        this.sessionManager.beginTurn(session.sessionId, {
          internal: turn.internal,
        });
        session.structuredOutputUuids?.clear();
        try {
          this.send(session.sessionId, turn.content, {
            internal: turn.internal,
          });
          session.messageController.pendingMessages.length = 0;
          const iterator = hooks.createIterator({ session, turn });
          session.queryInstance = iterator;
          const processingSessionId = session.sessionId;
          await this.processResponses({
            sessionId: processingSessionId,
            iterator,
            onRealSessionId: (realSessionId) => {
              const previousSessionId = session.sessionId;
              if (!realSessionId || realSessionId === previousSessionId) {
                return;
              }
              hooks.onRealSessionId({
                session,
                previousSessionId,
                realSessionId,
              });
            },
          });
        } catch (error) {
          this.finishHandler.emitTurnFailed(session, error, session.sessionId);
          this.reporter?.error?.("Claude turn processing failed", error);
          session.eventEmitter.emit("error", { type: "dispatch", error });
        } finally {
          this.sessionManager.clearInFlightTurn(session.sessionId);
          session.queryInstance = undefined;
        }
      }
    } finally {
      queueState.processing = false;
    }
  }

  send(
    sessionId: string,
    content: string,
    options?: { readonly internal?: boolean }
  ): void {
    const targetSession = this.sessionManager.getSession(sessionId);
    if (!targetSession) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const internal = options?.internal ?? false;
    if (!internal) {
      targetSession.logger?.logUserInput(content);
    }

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
    if (!internal) {
      this.finishHandler.emitTurnStarted(targetSession, sessionId);
      targetSession.eventEmitter.emit("message", {
        type: "user_input",
        content,
        uuid: crypto.randomUUID(),
        claudeSessionId: sessionId,
        timestamp: new Date().toISOString(),
      });
    }
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
        await this.dispatchMessage(activeSession, message);
      }
      const session = this.resolveSession(options.sessionId, promotedSessionId);
      if (session) {
        this.finishHandler.emitTurnFailed(
          session,
          new Error("Claude stream ended without result"),
          promotedSessionId ?? options.sessionId
        );
      }
    } catch (error) {
      const session = this.resolveSession(options.sessionId, promotedSessionId);
      if (session) {
        this.finishHandler.emitTurnFailed(
          session,
          error,
          promotedSessionId ?? options.sessionId
        );
      }
      session?.eventEmitter.emit("error", { type: "processing", error });
      this.reporter?.error?.("Claude stream processing failed", error);
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

  private async dispatchMessage(
    session: ActiveSession | undefined,
    message: ClaudeStreamMessage
  ): Promise<void> {
    const emitter = session?.eventEmitter;
    if (!emitter) {
      return;
    }

    logObservedProviderFeedback(session, message);
    if (!shouldSkipClaudeSDKMessageLog(message)) {
      session?.logger?.logSDKMessage(message.type, message);
    }

    switch (message.type) {
      case "assistant": {
        this.streamEventRouter.handleAssistantMessage(session, message);
        break;
      }
      case "rate_limit_event": {
        await this.finishHandler.handleRateLimitEvent(session, message);
        break;
      }
      case "result": {
        this.streamEventRouter.handleResultMessage(session, message);
        await this.finishHandler.completeTurn(session, message.session_id);
        break;
      }
      default:
        break;
    }
  }
}
