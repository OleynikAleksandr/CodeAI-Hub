import type { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";

const MAX_TRANSIENT_RETRIES = 1;
const MAX_AUTO_RESUME_ATTEMPTS = 1;
const PENDING_INTENT_TTL_MS = 60_000;

interface RetryBudget {
  autoResumeAttempts: number;
  transientRetries: number;
}

interface PendingUserIntent {
  readonly content: string;
  readonly timerId: ReturnType<typeof setTimeout>;
  readonly timestamp: number;
}

interface SessionRequestHandlerRetryStateDependencies {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly logger: Logger;
}

export class SessionRequestHandlerRetryState {
  private readonly deps: SessionRequestHandlerRetryStateDependencies;
  private readonly retryBudgetBySessionId = new Map<string, RetryBudget>();
  private readonly pendingUserIntentBySessionId = new Map<
    string,
    PendingUserIntent
  >();

  constructor(deps: SessionRequestHandlerRetryStateDependencies) {
    this.deps = deps;
  }

  consumeRetryBudget(sessionId: string, failureClass: string): void {
    const budget = this.getRetryBudget(sessionId);
    if (failureClass === "transient_turn_failure") {
      budget.transientRetries += 1;
      if (budget.transientRetries > MAX_TRANSIENT_RETRIES) {
        this.deps.logger.warn("Transient retry budget exhausted", {
          sessionId,
          retries: budget.transientRetries,
        });
      }
    } else if (failureClass === "session_binding_recoverable") {
      budget.autoResumeAttempts += 1;
      if (budget.autoResumeAttempts > MAX_AUTO_RESUME_ATTEMPTS) {
        this.deps.logger.warn("Auto-resume budget exhausted", {
          sessionId,
          attempts: budget.autoResumeAttempts,
        });
      }
    }
  }

  hasRetryBudget(sessionId: string): boolean {
    const budget = this.getRetryBudget(sessionId);
    return (
      budget.transientRetries <= MAX_TRANSIENT_RETRIES &&
      budget.autoResumeAttempts <= MAX_AUTO_RESUME_ATTEMPTS
    );
  }

  resetRetryBudget(sessionId: string): void {
    this.retryBudgetBySessionId.delete(sessionId);
  }

  trackPendingUserIntent(sessionId: string, content: string): void {
    this.clearPendingUserIntent(sessionId);
    const timerId = setTimeout(() => {
      this.expirePendingUserIntent(sessionId);
    }, PENDING_INTENT_TTL_MS);
    this.pendingUserIntentBySessionId.set(sessionId, {
      content,
      timestamp: Date.now(),
      timerId,
    });
  }

  getPendingUserIntent(sessionId: string): string | null {
    const intent = this.pendingUserIntentBySessionId.get(sessionId);
    if (!intent) {
      return null;
    }
    const elapsed = Date.now() - intent.timestamp;
    if (elapsed > PENDING_INTENT_TTL_MS) {
      this.expirePendingUserIntent(sessionId);
      return null;
    }
    return intent.content;
  }

  expirePendingUserIntent(sessionId: string): void {
    const existing = this.pendingUserIntentBySessionId.get(sessionId);
    if (!existing) {
      return;
    }

    clearTimeout(existing.timerId);
    this.pendingUserIntentBySessionId.delete(sessionId);
    this.deps.logger.warn("Pending user intent TTL expired", {
      sessionId,
      contentLength: existing.content.length,
      elapsedMs: Date.now() - existing.timestamp,
    });
    this.deps.broadcaster({
      type: "session:error",
      payload: {
        sessionId,
        message:
          "Your previous message was not delivered. Please send it again.",
        code: "pending_intent_expired",
        pendingIntentExpired: true,
      },
    });
  }

  private getRetryBudget(sessionId: string): RetryBudget {
    const existing = this.retryBudgetBySessionId.get(sessionId);
    if (existing) {
      return existing;
    }
    const budget = { transientRetries: 0, autoResumeAttempts: 0 };
    this.retryBudgetBySessionId.set(sessionId, budget);
    return budget;
  }

  private clearPendingUserIntent(sessionId: string): void {
    const existing = this.pendingUserIntentBySessionId.get(sessionId);
    if (existing) {
      clearTimeout(existing.timerId);
      this.pendingUserIntentBySessionId.delete(sessionId);
    }
  }
}
