import crypto from "node:crypto";
import type { Thread } from "@openai/codex-sdk";
import { DEFAULT_CODEX_RESPONSE_POLICY } from "../response-policy/response-policy-defaults";
import { CodexRolloutLiveSync } from "../rollout/codex-rollout-live-sync";
import type { CodexSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type { CodexTurnOptions } from "../types";
import { applyCodexTurnRuntimeConfig } from "./codex-applied-turn-config";
import { CodexEventStreamConsumer } from "./codex-event-stream-consumer";
import { CodexMessageFinishHandler } from "./codex-message-finish-handler";
import {
  type EnqueuedMessage,
  type MessageProcessorOptions,
  PROVIDER,
  type StartupLockContext,
} from "./codex-message-processor-shared";
import { CodexReasoningStreams } from "./codex-reasoning-streams";
import { CodexSessionEventEmitter } from "./codex-session-event-emitter";
import { CodexStreamEventRouter } from "./codex-stream-event-router";
import { CodexTokenUsageSync } from "./codex-token-usage-sync";
import { CodexUsageSync } from "./codex-usage-sync";
import { StructuredOutputStreamController } from "./structured-output-stream-controller";

export class CodexMessageProcessor {
  private readonly consumer: CodexEventStreamConsumer;
  private readonly emitter: CodexSessionEventEmitter;
  private readonly finishHandler: CodexMessageFinishHandler;
  private readonly options?: MessageProcessorOptions;
  readonly rolloutLiveSync: CodexRolloutLiveSync;
  private readonly router: CodexStreamEventRouter;
  private readonly sessionManager: CodexSessionManager;

  constructor(
    sessionManager: CodexSessionManager,
    options?: MessageProcessorOptions
  ) {
    this.sessionManager = sessionManager;
    this.options = options;
    this.emitter = new CodexSessionEventEmitter();
    const structuredOutput = new StructuredOutputStreamController();
    const reasoningStreams = new CodexReasoningStreams();
    const tokenUsageSync = new CodexTokenUsageSync(options?.reporter);
    const usageSync = new CodexUsageSync(
      options?.reporter,
      options?.usageLimitsFacade
    );
    this.finishHandler = new CodexMessageFinishHandler(
      structuredOutput,
      reasoningStreams,
      this.emitter,
      tokenUsageSync,
      usageSync
    );
    this.rolloutLiveSync = new CodexRolloutLiveSync(
      structuredOutput,
      this.emitter,
      options?.reporter
    );
    this.router = new CodexStreamEventRouter(
      sessionManager,
      structuredOutput,
      reasoningStreams,
      this.emitter,
      this.finishHandler,
      options?.reporter
    );
    this.consumer = new CodexEventStreamConsumer(
      (session, event) => this.router.dispatchEvent(session, event),
      (session, error) => {
        this.finishHandler.handleExecutionError(session, error);
        this.options?.reporter?.error?.("Codex event stream failed", error);
        session.eventEmitter.emit("error", { type: "event_stream", error });
      }
    );
  }

  initializeSession(session: ActiveSession, thread: Thread): void {
    session.thread = thread;
    if (!session.messageGenerator) {
      throw new Error("Session message generator not initialized");
    }
    const loop = this.consumeQueue(session, thread, session.messageGenerator);
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
    session.logger?.logSDKEvent("processor.enqueue", {
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      internal,
      contentLength: content.length,
      pendingCount: session.messageController.pendingMessages.length,
      hasResolveNext: Boolean(session.messageController.resolveNext),
      hasProcessingLoop: Boolean(session.processingLoop),
      timestampIso: new Date().toISOString(),
    });

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
      this.emitter.emitMessage(session, {
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

      session.logger?.logSDKEvent("processor.dequeue", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: raw.internal ?? false,
        contentLength: raw.content.length,
        remainingPendingCount: session.messageController.pendingMessages.length,
        timestampIso: new Date().toISOString(),
      });
      await this.processTurn(session, thread, raw);
    }
  }

  private async processTurn(
    session: ActiveSession,
    thread: Thread,
    message: EnqueuedMessage
  ): Promise<void> {
    session.internalTurn = message.internal ?? false;
    if (!session.internalTurn) {
      this.finishHandler.beginUserTurn(session);
    }

    const turnStartedAt = Date.now();
    session.logger?.logSDKEvent("processor.turn.begin", {
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      internal: session.internalTurn,
      pendingCountAtBegin: session.messageController.pendingMessages.length,
      timestampIso: new Date().toISOString(),
    });

    let startupLock: StartupLockContext | null = null;
    try {
      const turnOptions =
        applyCodexTurnRuntimeConfig(session, message.turnOptions) ?? {};
      const promptState = this.prepareTurnPrompt(
        session,
        message.content,
        turnOptions
      );
      session.logger?.logSDKEvent("processor.turn.prompt_ready", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: session.internalTurn,
        promptLength: promptState.prompt.length,
        runOptionsKeys: Object.keys(promptState.runOptions ?? {}),
        elapsedMs: Date.now() - turnStartedAt,
        timestampIso: new Date().toISOString(),
      });

      startupLock = await this.consumer.acquireStartupLockIfNeeded(session);
      session.logger?.logSDKEvent("processor.turn.startup_lock", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: session.internalTurn,
        acquired: Boolean(startupLock),
        elapsedMs: Date.now() - turnStartedAt,
        timestampIso: new Date().toISOString(),
      });

      const runStreamedStartedAt = Date.now();
      session.logger?.logSDKEvent("processor.run_streamed.begin", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: session.internalTurn,
        elapsedMs: runStreamedStartedAt - turnStartedAt,
        timestampIso: new Date().toISOString(),
      });
      const { events } = await thread.runStreamed(
        promptState.prompt,
        promptState.runOptions
      );
      session.logger?.logSDKEvent("processor.run_streamed.ready", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: session.internalTurn,
        elapsedMs: Date.now() - runStreamedStartedAt,
        timestampIso: new Date().toISOString(),
      });
      await this.consumer.consumeEvents(session, events, startupLock);
    } catch (error) {
      session.logger?.logSDKEvent("processor.turn.error", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: session.internalTurn,
        elapsedMs: Date.now() - turnStartedAt,
        message:
          error instanceof Error ? error.message : "Unknown processor error",
        timestampIso: new Date().toISOString(),
      });
      this.finishHandler.handleExecutionError(session, error);
      this.options?.reporter?.error?.("Codex turn execution failed", error);
      session.eventEmitter.emit("error", { type: "turn_execution", error });
    } finally {
      session.logger?.logSDKEvent("processor.turn.finally", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: session.internalTurn,
        elapsedMs: Date.now() - turnStartedAt,
        timestampIso: new Date().toISOString(),
      });
      startupLock?.release();
      session.internalTurn = false;
    }
  }

  private prepareTurnPrompt(
    session: ActiveSession,
    content: string,
    turnOptions: CodexTurnOptions
  ): { readonly prompt: string; readonly runOptions: CodexTurnOptions } {
    if (session.internalTurn) {
      return { prompt: content, runOptions: turnOptions };
    }

    const config = this.router.structuredOutput.prepareTurn(
      session.sessionId,
      turnOptions,
      session.responsePolicy ?? DEFAULT_CODEX_RESPONSE_POLICY
    );
    const runOptions = this.router.structuredOutput.applyOutputSchema(
      turnOptions,
      config
    );
    return {
      prompt: this.router.structuredOutput.applyPrompt(content, config),
      runOptions,
    };
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
}
