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
import { CodexUsageLimitsReader } from "../sdk/codex-usage-limits-reader";
import type {
  CodexUsageLimitBucket,
  CodexUsageLimitsSnapshot,
} from "../sdk/codex-usage-limits-snapshot";
import type { CodexSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import { CodexTokenUsageReader, type TokenUsageSnapshot } from "../token-usage";
import type { CodexTurnOptions, ModuleReporter } from "../types";
import type { CodexStartupLockRelease } from "./codex-startup-lock";
import { codexStartupLock } from "./codex-startup-lock";
import {
  type StructuredOutputResult,
  StructuredOutputStreamController,
} from "./structured-output-stream-controller";

const PROVIDER = "codex";
const THREAD_ID_SHORT_LENGTH = 8;
const THINKING_PLACEHOLDER = "<!-- -->";
const STARTUP_LOCK_ACQUIRE_TIMEOUT_MS = 30_000;
const STARTUP_LOCK_THREAD_STARTED_TIMEOUT_MS = 30_000;
const TURN_IDLE_TIMEOUT_MS = 180_000;
const USAGE_LIMITS_READ_TIMEOUT_MS = 5000;
const EVENTS_RETURN_TIMEOUT_MS = 1500;

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

type ReasoningDelta = {
  readonly delta: string;
  readonly merged: string;
};

type StartupLockContext = {
  readonly release: CodexStartupLockRelease;
  readonly threadStartedTimeoutMs: number;
  readonly ownerSessionId: string;
};

type TurnLifecycleState = {
  started: boolean;
  ended: boolean;
};
type AgentMessageItem = ThreadItem & { readonly type: "agent_message" };

const isAgentMessageItem = (item: ThreadItem): item is AgentMessageItem =>
  item.type === "agent_message";

const resolveThreadItemPhase = (item: ThreadItem): string | null => {
  const candidate = item as unknown as { readonly phase?: unknown };
  return typeof candidate.phase === "string" ? candidate.phase : null;
};

const shouldSuppressAgentMessageItem = (item: ThreadItem): boolean =>
  resolveThreadItemPhase(item) === "commentary";

const areUsageLimitBucketsEqual = (
  left: CodexUsageLimitBucket | null,
  right: CodexUsageLimitBucket | null
): boolean =>
  left?.percentUsed === right?.percentUsed &&
  left?.resetsAt === right?.resetsAt;

const areUsageLimitsSnapshotsEqual = (
  left: CodexUsageLimitsSnapshot,
  right: CodexUsageLimitsSnapshot
): boolean =>
  areUsageLimitBucketsEqual(left.currentSession, right.currentSession) &&
  areUsageLimitBucketsEqual(
    left.currentWeekAllModels,
    right.currentWeekAllModels
  ) &&
  areUsageLimitBucketsEqual(
    left.currentWeekSonnetOnly,
    right.currentWeekSonnetOnly
  );

export class CodexMessageProcessor {
  private readonly sessionManager: CodexSessionManager;
  private readonly options?: MessageProcessorOptions;
  private readonly structuredOutput = new StructuredOutputStreamController();
  private readonly reasoningStreams = new Map<string, Map<string, string>>();
  private readonly tokenUsageReader: CodexTokenUsageReader;
  private readonly usageLimitsReader: CodexUsageLimitsReader;
  private readonly tokenUsageCache = new Map<
    string,
    { used: number; limit: number }
  >();
  private readonly usageLimitsCache = new Map<
    string,
    CodexUsageLimitsSnapshot
  >();
  private readonly userTurnLifecycle = new WeakMap<
    ActiveSession,
    TurnLifecycleState
  >();

  private async raceWithTimeout<T>(payload: {
    readonly promise: Promise<T>;
    readonly timeoutMs: number;
  }): Promise<{ readonly timedOut: boolean; readonly result?: T }> {
    const { promise, timeoutMs } = payload;
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
      timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    });
    try {
      const winner = (await Promise.race([
        promise.then((result) => ({ timedOut: false as const, result })),
        timeoutPromise,
      ])) as { timedOut: boolean; result?: T };
      return winner;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private async safeReturnEvents(payload: {
    readonly session: ActiveSession;
    readonly events: AsyncGenerator<ThreadEvent>;
    readonly reason: string;
  }): Promise<void> {
    const { session, events, reason } = payload;
    session.logger?.logSDKEvent("processor.events.return.begin", {
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      internal: session.internalTurn ?? false,
      reason,
      timeoutMs: EVENTS_RETURN_TIMEOUT_MS,
      timestampIso: new Date().toISOString(),
    });

    try {
      const { timedOut } = await this.raceWithTimeout({
        promise: Promise.resolve(events.return(undefined)).then(() => ({})),
        timeoutMs: EVENTS_RETURN_TIMEOUT_MS,
      });
      if (timedOut) {
        session.logger?.logSDKEvent("processor.events.return.timeout", {
          sessionId: session.sessionId,
          threadId: session.codexThreadId,
          internal: session.internalTurn ?? false,
          reason,
          timestampIso: new Date().toISOString(),
        });
        return;
      }

      session.logger?.logSDKEvent("processor.events.return.done", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: session.internalTurn ?? false,
        reason,
        timestampIso: new Date().toISOString(),
      });
    } catch (error) {
      session.logger?.logSDKEvent("processor.events.return.error", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: session.internalTurn ?? false,
        reason,
        message: error instanceof Error ? error.message : String(error),
        timestampIso: new Date().toISOString(),
      });
    }
  }

  private shouldStopConsumingAfterEvent(eventType: string): boolean {
    return eventType === "turn.completed" || eventType === "turn.failed";
  }

  private async waitForNextEventOrTimeout(payload: {
    readonly session: ActiveSession;
    readonly events: AsyncGenerator<ThreadEvent>;
  }): Promise<IteratorResult<ThreadEvent>> {
    const { session, events } = payload;
    const nextPromise = events.next();
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `Codex turn timeout: no events received within ${TURN_IDLE_TIMEOUT_MS}ms (sessionId=${session.sessionId})`
          )
        );
      }, TURN_IDLE_TIMEOUT_MS);
    });

    try {
      return (await Promise.race([
        nextPromise,
        timeoutPromise,
      ])) as IteratorResult<ThreadEvent>;
    } catch (error) {
      nextPromise.catch(() => {
        // Ignore late generator failures after timeout.
      });
      await this.safeReturnEvents({
        session,
        events,
        reason: "idle_timeout",
      });
      throw error;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  constructor(
    sessionManager: CodexSessionManager,
    options?: MessageProcessorOptions
  ) {
    this.sessionManager = sessionManager;
    this.options = options;
    this.tokenUsageReader = new CodexTokenUsageReader();
    this.usageLimitsReader = new CodexUsageLimitsReader();
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
    // Trace breadcrumbs for diagnosing stalled turns (e.g. user_input logged but no sdk:turn.started).
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
      session.logger?.logSDKEvent("processor.dequeue", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: raw.internal ?? false,
        contentLength: raw.content.length,
        remainingPendingCount: session.messageController.pendingMessages.length,
        timestampIso: new Date().toISOString(),
      });
      await this.processTurn({ session, thread, message: raw });
    }
  }

  private async processTurn(context: ProcessTurnContext): Promise<void> {
    const { session, thread, message } = context;
    session.internalTurn = message.internal ?? false;
    if (!session.internalTurn) {
      this.userTurnLifecycle.set(session, { started: false, ended: false });
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
      const turnOptions = message.turnOptions ?? {};
      const runOptions = session.internalTurn
        ? turnOptions
        : this.structuredOutput.applyOutputSchema(turnOptions);
      let prompt = message.content;
      if (!session.internalTurn) {
        const config = this.structuredOutput.prepareTurn(
          session.sessionId,
          runOptions
        );
        prompt = this.structuredOutput.applyPrompt(message.content, config);
      }
      session.logger?.logSDKEvent("processor.turn.prompt_ready", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: session.internalTurn,
        promptLength: prompt.length,
        runOptionsKeys: Object.keys(runOptions ?? {}),
        elapsedMs: Date.now() - turnStartedAt,
        timestampIso: new Date().toISOString(),
      });
      startupLock = await this.acquireStartupLockIfNeeded(session);
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
      const { events } = await thread.runStreamed(prompt, runOptions);
      session.logger?.logSDKEvent("processor.run_streamed.ready", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: session.internalTurn,
        elapsedMs: Date.now() - runStreamedStartedAt,
        timestampIso: new Date().toISOString(),
      });
      await this.consumeEvents(session, events, startupLock);
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
      this.maybeEmitTurnFailed(session, error);
      this.options?.reporter?.error?.("Codex turn execution failed", error);
      session.eventEmitter.emit("error", {
        type: "turn_execution",
        error,
      });
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

  private async consumeEvents(
    session: ActiveSession,
    events: AsyncGenerator<ThreadEvent>,
    startupLock?: StartupLockContext | null
  ): Promise<void> {
    try {
      if (startupLock) {
        await this.consumeEventsWithStartupLock(session, events, startupLock);
        return;
      }
      await this.consumeEventsWithIdleTimeout(session, events);
    } catch (error) {
      session.logger?.logSDKEvent("processor.events.error", {
        sessionId: session.sessionId,
        threadId: session.codexThreadId,
        internal: session.internalTurn ?? false,
        message: error instanceof Error ? error.message : String(error),
        timestampIso: new Date().toISOString(),
      });
      this.maybeEmitTurnFailed(session, error);
      this.options?.reporter?.error?.("Codex event stream failed", error);
      session.eventEmitter.emit("error", { type: "event_stream", error });
    }
  }

  private async acquireStartupLockIfNeeded(
    session: ActiveSession
  ): Promise<StartupLockContext | null> {
    if (session.codexThreadId) {
      return null;
    }

    const ownerSessionId = session.sessionId;
    const release = await codexStartupLock.acquire(
      { sessionId: ownerSessionId },
      { timeoutMs: STARTUP_LOCK_ACQUIRE_TIMEOUT_MS }
    );
    session.logger?.logSDKEvent("startup_lock_acquired", {
      sessionId: ownerSessionId,
      timeoutMs: STARTUP_LOCK_THREAD_STARTED_TIMEOUT_MS,
    });

    return {
      release,
      threadStartedTimeoutMs: STARTUP_LOCK_THREAD_STARTED_TIMEOUT_MS,
      ownerSessionId,
    };
  }

  private async consumeEventsWithStartupLock(
    session: ActiveSession,
    events: AsyncGenerator<ThreadEvent>,
    startupLock: StartupLockContext
  ): Promise<void> {
    const firstEvent = { logged: false as boolean };
    let released = false;
    const safeRelease = (): void => {
      if (released) {
        return;
      }
      released = true;
      startupLock.release();
      session.logger?.logSDKEvent("startup_lock_released", {
        sessionId: startupLock.ownerSessionId,
      });
    };

    const timeoutMs = startupLock.threadStartedTimeoutMs;
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `Codex startup lock timeout: thread.started not received within ${timeoutMs}ms (sessionId=${startupLock.ownerSessionId})`
          )
        );
      }, timeoutMs);
    });

    try {
      while (true) {
        const nextPromise = events.next();
        const result = await Promise.race([nextPromise, timeoutPromise]).catch(
          async (error) => {
            nextPromise.catch(() => {
              // Ignore late generator failures after timeout.
            });
            safeRelease();
            if (timer) {
              clearTimeout(timer);
            }
            try {
              await this.safeReturnEvents({
                session,
                events,
                reason: "startup_lock_timeout",
              });
            } catch {
              // ignore cancellation errors
            }
            throw error;
          }
        );

        if (result.done) {
          break;
        }

        const event = result.value;
        this.maybeLogFirstEvent(session, firstEvent, event.type);
        await this.dispatchEvent(session, event);

        if (event.type === "thread.started") {
          safeRelease();
          if (timer) {
            clearTimeout(timer);
          }
          break;
        }

        if (this.shouldStopConsumingAfterEvent(event.type)) {
          this.safeReturnEvents({
            session,
            events,
            reason: `terminal_event:${event.type}`,
          });
          break;
        }
      }

      await this.consumeEventsWithIdleTimeout(session, events);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
      safeRelease();
    }
  }

  private async consumeEventsWithIdleTimeout(
    session: ActiveSession,
    events: AsyncGenerator<ThreadEvent>
  ): Promise<void> {
    const firstEvent = { logged: false as boolean };
    while (true) {
      const result = await this.waitForNextEventOrTimeout({ session, events });

      if (result.done) {
        break;
      }
      const eventType = result.value.type;
      this.maybeLogFirstEvent(session, firstEvent, eventType);
      await this.dispatchEvent(session, result.value);
      if (this.shouldStopConsumingAfterEvent(eventType)) {
        this.safeReturnEvents({
          session,
          events,
          reason: `terminal_event:${eventType}`,
        });
        break;
      }
    }
  }

  private maybeLogFirstEvent(
    session: ActiveSession,
    state: { logged: boolean },
    eventType: string
  ): void {
    if (state.logged) {
      return;
    }
    state.logged = true;
    session.logger?.logSDKEvent("processor.first_event", {
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      internal: session.internalTurn ?? false,
      eventType,
      timestampIso: new Date().toISOString(),
    });
  }

  private async dispatchEvent(
    session: ActiveSession,
    event: ThreadEvent
  ): Promise<void> {
    session.logger?.logSDKEvent(event.type, event);
    switch (event.type) {
      case "thread.started":
        this.handleThreadStarted(session, event.thread_id);
        break;
      case "turn.started":
        this.maybeEmitTurnStarted(session);
        if (!session.internalTurn) {
          session.structuredOutputUuids = new Set();
          this.emitDialogMessage(session, "thinking", THINKING_PLACEHOLDER);
          this.structuredOutput.startTurn(session.sessionId);
        }
        break;
      case "turn.completed":
        await this.handleTurnCompleted(session, event);
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
    const existingThreadId = session.codexThreadId;
    if (existingThreadId && existingThreadId !== threadId) {
      this.options?.reporter?.warn?.(
        `Ignoring unexpected Codex thread_id change (${existingThreadId} -> ${threadId})`
      );
      session.logger?.logSDKEvent("thread_id_ignored", {
        expected: existingThreadId,
        received: threadId,
      });
      return;
    }

    const previousId = session.sessionId;
    session.codexThreadId = threadId;
    session.logger?.logSDKEvent("thread_id", threadId);

    if (!existingThreadId && previousId !== threadId) {
      this.sessionManager.updateSessionId(previousId, threadId);
      session.logger?.renameSession?.(previousId, threadId);
      this.clearReasoningSession(previousId);
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

  private async handleTurnCompleted(
    session: ActiveSession,
    event: TurnCompletedEvent
  ): Promise<void> {
    const startedAt = Date.now();
    session.logger?.logSDKEvent("processor.turn.completed.begin", {
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      internal: session.internalTurn ?? false,
      timestampIso: new Date().toISOString(),
    });

    const usageLimits = await this.safeRefreshUsageLimits(session);
    this.maybeEmitTurnCompleted(session, event.usage, usageLimits);
    this.refreshTokenUsage(session);
    this.structuredOutput.clear(session.sessionId);
    this.clearReasoningSession(session.sessionId);

    session.logger?.logSDKEvent("processor.turn.completed.done", {
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      internal: session.internalTurn ?? false,
      elapsedMs: Date.now() - startedAt,
      hasUsageLimits: Boolean(usageLimits),
      timestampIso: new Date().toISOString(),
    });
  }

  private async safeRefreshUsageLimits(
    session: ActiveSession
  ): Promise<CodexUsageLimitsSnapshot | null> {
    const providerSessionId = session.codexThreadId;
    if (!providerSessionId) {
      return null;
    }

    const startedAt = Date.now();
    session.logger?.logSDKEvent("processor.usage_limits.read.begin", {
      sessionId: session.sessionId,
      threadId: providerSessionId,
      timeoutMs: USAGE_LIMITS_READ_TIMEOUT_MS,
      force: true,
      timestampIso: new Date().toISOString(),
    });

    const readPromise = this.refreshUsageLimits(session, { force: true });
    const { timedOut, result } = await this.raceWithTimeout({
      promise: readPromise,
      timeoutMs: USAGE_LIMITS_READ_TIMEOUT_MS,
    });

    if (timedOut) {
      session.logger?.logSDKEvent("processor.usage_limits.read.timeout", {
        sessionId: session.sessionId,
        threadId: providerSessionId,
        elapsedMs: Date.now() - startedAt,
        timestampIso: new Date().toISOString(),
      });
      return this.usageLimitsCache.get(providerSessionId) ?? null;
    }

    session.logger?.logSDKEvent("processor.usage_limits.read.done", {
      sessionId: session.sessionId,
      threadId: providerSessionId,
      elapsedMs: Date.now() - startedAt,
      hasSnapshot: Boolean(result),
      timestampIso: new Date().toISOString(),
    });
    return result ?? null;
  }

  private maybeEmitTurnStarted(session: ActiveSession): void {
    const state = this.userTurnLifecycle.get(session);
    if (!state || state.started || state.ended) {
      return;
    }
    state.started = true;

    this.emitMessage(session, {
      type: "turn_started",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId ?? undefined,
      uuid: `${crypto.randomUUID()}::turn_started`,
      timestamp: new Date().toISOString(),
    });
  }

  private maybeEmitTurnCompleted(
    session: ActiveSession,
    usage: unknown,
    usageLimits?: CodexUsageLimitsSnapshot | null
  ): void {
    const state = this.userTurnLifecycle.get(session);
    if (!state || state.ended) {
      return;
    }

    if (!state.started) {
      this.maybeEmitTurnStarted(session);
    }

    state.ended = true;

    this.emitMessage(session, {
      type: "turn_completed",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId ?? undefined,
      uuid: `${crypto.randomUUID()}::turn_completed`,
      timestamp: new Date().toISOString(),
      usage: usage ?? undefined,
      usageLimits: usageLimits ?? undefined,
    });
  }

  private maybeEmitTurnFailed(session: ActiveSession, error: unknown): void {
    const state = this.userTurnLifecycle.get(session);
    if (!state || state.ended) {
      return;
    }

    if (!state.started) {
      this.maybeEmitTurnStarted(session);
    }

    state.ended = true;

    const message = error instanceof Error ? error.message : String(error);
    this.emitMessage(session, {
      type: "turn_failed",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId ?? undefined,
      message,
      error,
      uuid: `${crypto.randomUUID()}::turn_failed`,
      timestamp: new Date().toISOString(),
    });
  }

  private refreshTokenUsage(session: ActiveSession): void {
    const providerSessionId = session.codexThreadId;
    if (!providerSessionId) {
      return;
    }

    this.tokenUsageReader
      .read({ providerSessionId })
      .then((snapshot: TokenUsageSnapshot | null) => {
        if (!snapshot) {
          return;
        }
        const { used, limit } = snapshot;
        const previous = this.tokenUsageCache.get(session.sessionId);
        if (previous && previous.used === used && previous.limit === limit) {
          return;
        }
        this.tokenUsageCache.set(session.sessionId, { used, limit });
        session.eventEmitter.emit("message", {
          type: "stream_event",
          provider: PROVIDER,
          sessionId: session.sessionId,
          threadId: session.codexThreadId,
          tokenUsage: { used, limit },
          data: { kind: "token_usage", used, limit },
          uuid: `${crypto.randomUUID()}::token_usage`,
          timestamp: new Date().toISOString(),
        });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.options?.reporter?.warn?.(
          `Codex token usage read failed (session ${providerSessionId}): ${message}`
        );
      });
  }

  private async refreshUsageLimits(
    session: ActiveSession,
    options: { readonly force?: boolean } = {}
  ): Promise<CodexUsageLimitsSnapshot | null> {
    const providerSessionId = session.codexThreadId;
    if (!providerSessionId) {
      return null;
    }

    const snapshot = await this.usageLimitsReader
      .read({
        providerSessionId,
        force: options.force,
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.options?.reporter?.warn?.(
          `Codex usage limits read failed (session ${providerSessionId}): ${message}`
        );
        return null;
      });

    if (!snapshot) {
      return this.usageLimitsCache.get(providerSessionId) ?? null;
    }

    const previousSnapshot = this.usageLimitsCache.get(providerSessionId);
    if (
      previousSnapshot &&
      areUsageLimitsSnapshotsEqual(previousSnapshot, snapshot)
    ) {
      return previousSnapshot;
    }

    this.usageLimitsCache.set(providerSessionId, snapshot);
    this.emitUsageLimitsStreamEvent(session, providerSessionId, snapshot);
    return snapshot;
  }

  private emitUsageLimitsStreamEvent(
    session: ActiveSession,
    providerSessionId: string,
    usageLimits: CodexUsageLimitsSnapshot
  ): void {
    session.eventEmitter.emit("message", {
      type: "stream_event",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: providerSessionId,
      usageLimits,
      data: { kind: "usage_limits", usageLimits },
      uuid: `${crypto.randomUUID()}::usage_limits`,
      timestamp: new Date().toISOString(),
    });
  }

  private handleTurnFailed(
    session: ActiveSession,
    event: TurnFailedEvent
  ): void {
    this.maybeEmitTurnFailed(session, event.error);
    this.structuredOutput.clear(session.sessionId);
    this.clearReasoningSession(session.sessionId);
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
    this.structuredOutput.clear(session.sessionId);
    this.clearReasoningSession(session.sessionId);
  }

  private handleThreadItem(
    session: ActiveSession,
    event: ItemStartedEvent | ItemUpdatedEvent | ItemCompletedEvent
  ): void {
    const item = event.item as ThreadItem;
    if (this.handleReasoningItem(session, event, item)) {
      return;
    }
    this.handleAgentMessageItem(session, event, item);
  }

  private handleReasoningItem(
    session: ActiveSession,
    event: ItemStartedEvent | ItemUpdatedEvent | ItemCompletedEvent,
    item: ThreadItem
  ): boolean {
    if (item.type !== "reasoning") {
      return false;
    }
    if (session.internalTurn || typeof item.text !== "string") {
      return true;
    }
    if (event.type === "item.updated") {
      const delta = this.appendReasoningDelta(
        session.sessionId,
        item.id,
        item.text
      );
      if (delta) {
        this.emitDialogMessage(session, "thinking", delta, item.id);
      }
      return true;
    }
    if (event.type === "item.completed") {
      const delta = this.completeReasoningDelta(
        session.sessionId,
        item.id,
        item.text
      );
      if (delta) {
        this.emitDialogMessage(session, "thinking", delta, item.id);
      }
    }
    return true;
  }

  private handleAgentMessageItem(
    session: ActiveSession,
    event: ItemStartedEvent | ItemUpdatedEvent | ItemCompletedEvent,
    item: ThreadItem
  ): void {
    if (!isAgentMessageItem(item)) {
      return;
    }
    // Codex emits an assistant message twice: once as a "commentary" phase and
    // again as "final_answer". Commentary is internal and should not appear in
    // the UI dialog history to avoid duplicates.
    if (shouldSuppressAgentMessageItem(item)) {
      return;
    }
    if (event.type === "item.updated") {
      this.handleAgentMessageUpdate(session, item);
      return;
    }
    if (event.type === "item.completed") {
      this.handleAgentMessageComplete(session, item);
    }
  }

  private handleAgentMessageUpdate(
    session: ActiveSession,
    item: AgentMessageItem
  ): void {
    if (session.internalTurn) {
      return;
    }
    if (typeof item.text !== "string") {
      return;
    }
    const delta = this.structuredOutput.appendChunk(
      session.sessionId,
      item.id,
      item.text
    );
    if (!delta) {
      return;
    }
    this.emitAssistantChunk(session, item.id, delta);
  }

  private handleAgentMessageComplete(
    session: ActiveSession,
    item: AgentMessageItem
  ): void {
    if (session.internalTurn) {
      return;
    }
    const itemText = typeof item.text === "string" ? item.text : "";
    const result = this.structuredOutput.complete(
      session.sessionId,
      item.id,
      itemText
    );
    if (result.streamDelta) {
      this.emitAssistantChunk(session, item.id, result.streamDelta);
    }
    this.emitStructuredOutput(session, item.id, result);
    if (!result.assistantText) {
      return;
    }
    this.emitMessage(session, {
      type: "assistant",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      content: result.assistantText,
      uuid: item.id,
      timestamp: new Date().toISOString(),
    });
  }

  private emitAssistantChunk(
    session: ActiveSession,
    itemId: string,
    text: string
  ): void {
    this.emitMessage(session, {
      type: "stream_event",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      data: {
        kind: "assistant_chunk",
        itemId,
        text,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private emitStructuredOutput(
    session: ActiveSession,
    itemId: string,
    result: StructuredOutputResult
  ): void {
    const shouldEmitArtifacts =
      Array.isArray(result.artifacts) && result.artifacts.length > 0;
    if (!(result.artifact || shouldEmitArtifacts)) {
      return;
    }
    const dedupeId = result.outputHash ?? itemId;
    let shouldEmit = true;
    if (dedupeId) {
      if (!session.structuredOutputUuids) {
        session.structuredOutputUuids = new Set();
      }
      if (session.structuredOutputUuids.has(dedupeId)) {
        shouldEmit = false;
      } else {
        session.structuredOutputUuids.add(dedupeId);
      }
    }
    if (!shouldEmit) {
      return;
    }
    this.emitMessage(session, {
      type: "stream_event",
      provider: PROVIDER,
      sessionId: session.sessionId,
      threadId: session.codexThreadId,
      data: {
        kind: "structured_output",
        artifact: result.artifact,
        artifacts: shouldEmitArtifacts ? result.artifacts : undefined,
        nextAction: result.nextAction,
        suggested_response: result.assistantText,
      },
      uuid: crypto.randomUUID(),
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

  private emitDialogMessage(
    session: ActiveSession,
    role: "assistant" | "thinking" | "user",
    content: string,
    id?: string
  ): void {
    if (!content || content.trim().length === 0) {
      return;
    }
    session.eventEmitter.emit("message", {
      type: "dialog_message",
      role,
      content,
      uuid: id ?? crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
  }

  private appendReasoningDelta(
    sessionId: string,
    itemId: string,
    nextText: string
  ): string | null {
    if (!nextText) {
      return null;
    }
    const sessionMap = this.getReasoningSession(sessionId);
    const previous = sessionMap.get(itemId) ?? "";
    const { delta, merged } = this.resolveReasoningDelta(previous, nextText);
    if (merged !== previous) {
      sessionMap.set(itemId, merged);
    }
    return delta.length > 0 ? delta : null;
  }

  private completeReasoningDelta(
    sessionId: string,
    itemId: string,
    nextText: string
  ): string | null {
    const delta = this.appendReasoningDelta(sessionId, itemId, nextText);
    const sessionMap = this.reasoningStreams.get(sessionId);
    if (sessionMap) {
      sessionMap.delete(itemId);
      if (sessionMap.size === 0) {
        this.reasoningStreams.delete(sessionId);
      }
    }
    return delta;
  }

  private getReasoningSession(sessionId: string): Map<string, string> {
    const existing = this.reasoningStreams.get(sessionId);
    if (existing) {
      return existing;
    }
    const fresh = new Map<string, string>();
    this.reasoningStreams.set(sessionId, fresh);
    return fresh;
  }

  private resolveReasoningDelta(
    previous: string,
    nextText: string
  ): ReasoningDelta {
    if (!previous) {
      return { delta: nextText, merged: nextText };
    }
    if (nextText.startsWith(previous)) {
      return {
        delta: nextText.slice(previous.length),
        merged: nextText,
      };
    }
    if (previous.startsWith(nextText)) {
      return { delta: "", merged: previous };
    }
    return { delta: nextText, merged: `${previous}${nextText}` };
  }

  private clearReasoningSession(sessionId: string): void {
    this.reasoningStreams.delete(sessionId);
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
