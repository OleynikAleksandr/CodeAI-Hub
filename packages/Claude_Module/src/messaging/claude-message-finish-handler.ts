import crypto from "node:crypto";
import type { ActiveSession } from "../session/types";
import type {
  ClaudeStreamMessage,
  ClaudeUsageLimitsFacadeBridge,
  ModuleReporter,
} from "../types";
import {
  ClaudeUsageSync,
  type ContextUsageReaderConfig,
} from "./claude-usage-sync";

export type { ContextUsageReaderConfig } from "./claude-usage-sync";

interface ClaudeMessageFinishHandlerOptions {
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: ClaudeUsageLimitsFacadeBridge;
}

export class ClaudeMessageFinishHandler {
  private readonly usageSync: ClaudeUsageSync;

  constructor(options: ClaudeMessageFinishHandlerOptions) {
    this.usageSync = new ClaudeUsageSync(options);
  }

  configureContextUsageReader(config: ContextUsageReaderConfig): void {
    this.usageSync.configureContextUsageReader(config);
  }

  emitTurnStarted(session: ActiveSession, claudeSessionId: string): void {
    const queueState = session.turnQueue;
    if (
      !queueState ||
      queueState.internalTurn ||
      queueState.lifecycle.started ||
      queueState.lifecycle.ended
    ) {
      return;
    }

    queueState.lifecycle.started = true;
    session.eventEmitter.emit("message", {
      type: "turn_started",
      provider: "claude",
      sessionId: session.sessionId,
      claudeSessionId,
      uuid: `${crypto.randomUUID()}::turn_started`,
      timestamp: new Date().toISOString(),
    });
  }

  emitTurnFailed(
    session: ActiveSession,
    error: unknown,
    claudeSessionId: string | null | undefined
  ): void {
    const queueState = session.turnQueue;
    if (!queueState || queueState.internalTurn || queueState.lifecycle.ended) {
      return;
    }

    const resolvedSessionId = claudeSessionId ?? session.sessionId;
    if (!queueState.lifecycle.started) {
      this.emitTurnStarted(session, resolvedSessionId);
    }

    queueState.lifecycle.ended = true;
    session.eventEmitter.emit("message", {
      type: "turn_failed",
      provider: "claude",
      sessionId: session.sessionId,
      claudeSessionId: resolvedSessionId,
      message: error instanceof Error ? error.message : String(error),
      error,
      uuid: `${crypto.randomUUID()}::turn_failed`,
      timestamp: new Date().toISOString(),
    });
  }

  async completeTurn(
    session: ActiveSession,
    claudeSessionId: string | null | undefined
  ): Promise<void> {
    const { tokenUsage, usageLimits } =
      await this.usageSync.readCompletionPayload(session, claudeSessionId);
    const queueState = session.turnQueue;
    if (!queueState || queueState.internalTurn || queueState.lifecycle.ended) {
      return;
    }

    const resolvedSessionId = claudeSessionId ?? session.sessionId;
    if (!queueState.lifecycle.started) {
      this.emitTurnStarted(session, resolvedSessionId);
    }

    queueState.lifecycle.ended = true;
    session.eventEmitter.emit("message", {
      type: "turn_completed",
      provider: "claude",
      sessionId: session.sessionId,
      claudeSessionId: resolvedSessionId,
      ...(tokenUsage ? { tokenUsage, usage: tokenUsage } : {}),
      ...(usageLimits ? { usageLimits } : {}),
      uuid: `${crypto.randomUUID()}::turn_completed`,
      timestamp: new Date().toISOString(),
    });
  }

  async handleRateLimitEvent(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): Promise<void> {
    await this.usageSync.handleRateLimitEvent(session, message);
  }
}
