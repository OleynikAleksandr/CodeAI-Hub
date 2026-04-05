import type { ThreadEvent } from "@openai/codex-sdk";
import type { ActiveSession } from "../session/types";
import {
  raceWithTimeout,
  waitForNextResultWithIdlePulses,
} from "./codex-async-helpers";
import {
  EVENTS_RETURN_TIMEOUT_MS,
  STARTUP_LOCK_ACQUIRE_TIMEOUT_MS,
  STARTUP_LOCK_THREAD_STARTED_TIMEOUT_MS,
  type StartupLockContext,
  TURN_IDLE_TIMEOUT_MS,
} from "./codex-message-processor-shared";
import { codexStartupLock } from "./codex-startup-lock";

export class CodexEventStreamConsumer {
  private readonly dispatchEvent: (
    session: ActiveSession,
    event: ThreadEvent
  ) => Promise<void>;
  private readonly onConsumeError: (
    session: ActiveSession,
    error: unknown
  ) => void;
  private readonly syncRollout: (
    session: ActiveSession,
    mode: "event" | "terminal"
  ) => Promise<void>;

  constructor(
    dispatchEvent: (
      session: ActiveSession,
      event: ThreadEvent
    ) => Promise<void>,
    onConsumeError: (session: ActiveSession, error: unknown) => void,
    syncRollout?: (
      session: ActiveSession,
      mode: "event" | "terminal"
    ) => Promise<void>
  ) {
    this.dispatchEvent = dispatchEvent;
    this.onConsumeError = onConsumeError;
    this.syncRollout = syncRollout ?? (async () => undefined);
  }

  async acquireStartupLockIfNeeded(
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
      ownerSessionId,
      release,
      threadStartedTimeoutMs: STARTUP_LOCK_THREAD_STARTED_TIMEOUT_MS,
    };
  }

  async consumeEvents(
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
      this.onConsumeError(session, error);
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
      const { timedOut } = await raceWithTimeout({
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

  private returnEventsInBackground(payload: {
    readonly session: ActiveSession;
    readonly events: AsyncGenerator<ThreadEvent>;
    readonly reason: string;
  }): void {
    this.safeReturnEvents(payload).catch(() => undefined);
  }

  private shouldStopConsumingAfterEvent(eventType: string): boolean {
    return eventType === "turn.completed" || eventType === "turn.failed";
  }

  private waitForNextEventOrTimeout(payload: {
    readonly session: ActiveSession;
    readonly events: AsyncGenerator<ThreadEvent>;
  }): Promise<IteratorResult<ThreadEvent>> {
    const { session, events } = payload;
    return waitForNextResultWithIdlePulses({
      nextPromise: events.next(),
      idleTimeoutMs: TURN_IDLE_TIMEOUT_MS,
      onIdle: ({ elapsedMs, idleCount }) => {
        session.logger?.logSDKEvent("processor.events.idle", {
          sessionId: session.sessionId,
          threadId: session.codexThreadId,
          internal: session.internalTurn ?? false,
          idleCount,
          idleMs: elapsedMs,
          idleTimeoutMs: TURN_IDLE_TIMEOUT_MS,
          timestampIso: new Date().toISOString(),
        });
      },
    });
  }

  private async consumeEventsWithStartupLock(
    session: ActiveSession,
    events: AsyncGenerator<ThreadEvent>,
    startupLock: StartupLockContext
  ): Promise<void> {
    const firstEvent = { logged: false };
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

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `Codex startup lock timeout: thread.started not received within ${startupLock.threadStartedTimeoutMs}ms (sessionId=${startupLock.ownerSessionId})`
          )
        );
      }, startupLock.threadStartedTimeoutMs);
    });

    try {
      while (true) {
        const nextPromise = events.next();
        const result = await Promise.race([nextPromise, timeoutPromise]).catch(
          async (error) => {
            nextPromise.catch(() => undefined);
            safeRelease();
            if (timer) {
              clearTimeout(timer);
            }
            await this.safeReturnEvents({
              session,
              events,
              reason: "startup_lock_timeout",
            }).catch(() => undefined);
            throw error;
          }
        );

        if (result.done) {
          break;
        }

        this.maybeLogFirstEvent(session, firstEvent, result.value.type);
        if (this.shouldStopConsumingAfterEvent(result.value.type)) {
          await this.syncRollout(session, "terminal");
        }
        await this.dispatchEvent(session, result.value);
        if (!this.shouldStopConsumingAfterEvent(result.value.type)) {
          await this.syncRollout(session, "event");
        }

        if (result.value.type === "thread.started") {
          safeRelease();
          if (timer) {
            clearTimeout(timer);
          }
          break;
        }

        if (this.shouldStopConsumingAfterEvent(result.value.type)) {
          this.returnEventsInBackground({
            session,
            events,
            reason: `terminal_event:${result.value.type}`,
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
    const firstEvent = { logged: false };
    while (true) {
      const result = await this.waitForNextEventOrTimeout({ session, events });
      if (result.done) {
        break;
      }

      this.maybeLogFirstEvent(session, firstEvent, result.value.type);
      if (this.shouldStopConsumingAfterEvent(result.value.type)) {
        await this.syncRollout(session, "terminal");
      }
      await this.dispatchEvent(session, result.value);
      if (!this.shouldStopConsumingAfterEvent(result.value.type)) {
        await this.syncRollout(session, "event");
      }
      if (this.shouldStopConsumingAfterEvent(result.value.type)) {
        this.returnEventsInBackground({
          session,
          events,
          reason: `terminal_event:${result.value.type}`,
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
}
